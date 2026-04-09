const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const vaultSharesJSON = require("../artifacts/smart-contracts/VaultShares.sol/VaultShares.json");
const fundVaultJSON = require("../artifacts/smart-contracts/FundVault.sol/FundVault.json");
const combinedABI = [
    ...vaultSharesJSON.abi,
    ...fundVaultJSON.abi
];
const vaultInterface = new ethers.Interface(combinedABI);

const db = require('./database');
const { startIndexer } = require('./indexer');

const app = express();
app.use(express.json());

// --- Setup Ethers ---
// ใช้ URL ของ Hardhat node (ปกติคือ http://127.0.0.1:8545)
// const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, undefined, {
    staticNetwork: true
});
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ใส่ Address ของ VaultShares ที่คุณได้จากการ Deploy
const vaultSharesAddress = process.env.VAULT_SHARES_ADDRESS;
const abi = [ 
    /* ก๊อปปี้ ABI จากไฟล์ artifacts/contracts/VaultShares.sol/VaultShares.json มาใส่ที่นี่ */ 
    "event RedemptionRequested(uint256 indexed requestId, address indexed wallet, uint256 shares, uint256 nav, uint256 amount)",
    "event RedemptionSettled(uint256 indexed requestId, address indexed wallet, uint256 amount)",
    "event NavUpdated(uint256 oldNav, uint256 newNav)",
    "function settleRedemption(uint256 _requestId) external",
    "function redemptions(uint256) view returns (uint256 id, address wallet, uint256 shares, uint256 nav, uint256 amount, uint256 unlockDate, uint8 status)",
    "function setNav(uint256 _newNav) external",
    "function fundVault() view returns (address)",
    "function stablecoin() view returns (address)"
];

const vaultSharesContract = new ethers.Contract(vaultSharesAddress, abi, wallet);

// รัน Indexer ทันทีที่ Start Server
startIndexer(vaultSharesContract);

// --- API Endpoints ---

// GET /api/redemptions
app.get('/api/redemptions',async (req, res) => {

    try {
        const latestBlock = await provider.getBlock('latest');
        const blockchainNow = latestBlock.timestamp; // เวลาจริงๆ บนโซ่

        const query = `SELECT * FROM redemptions`;
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const data = rows.map(row => {
                let status = row.status;
                // Logic เปลี่ยน status เป็น ready แบบ Dynamic
                if (status === 'pending' && blockchainNow >= row.unlockDate) {
                    status = 'ready';
                }
                return {
                    requestId: row.requestId,
                    wallet: row.wallet,
                    shares: ethers.formatUnits(row.shares, 18),
                    nav: ethers.formatUnits(row.nav, 18),
                    amount: ethers.formatUnits(row.amount, 18),
                    unlockDate: new Date(row.unlockDate * 1000).toISOString(),
                    status: status
                };
            });
            res.json({ data });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settle', async (req, res) => {
    const { requestId } = req.body;

    try {
        // 1. ตรวจสอบข้อมูลใน Contract (Optional: เพื่อความแม่นยำสูงสุด)
        // หรือจะตรวจสอบจาก DB ก่อนก็ได้ครับ
        
        // 2. สั่ง Settle ไปที่ Blockchain
        const tx = await vaultSharesContract.settleRedemption(requestId);
        console.log(`Sending tx: ${tx.hash}`);
        
        // 3. รอ Transaction ยืนยัน
        await tx.wait();
        res.json({ data: { txHash: tx.hash } });

    } catch (error) {
        console.log("--- Full Error Object ---");
        // 1. ดึง Error Data ออกมา (รองรับหลายจุดที่ Ethers v6 อาจจะเก็บไว้)
        const errorData = error.data || 
                          error.error?.data || 
                          error.info?.error?.data ||
                          error.revert?.data;

        if (errorData) {
            try {
                const decodedError = vaultInterface.parseError(errorData);
                
                if (decodedError) {
                    switch (decodedError.name) {
                        case "AlreadySettled":
                            return res.status(400).json({
                                error: { code: "ALREADY_SETTLED", message: "Status is already 'fulfilled'" }
                            });
                        case "NotReady":
                            return res.status(400).json({
                                error: { code: "UNLOCK_PERIOD_NOT_PASSED", message: "Status is still 'pending'" }
                            });
                        case "InsufficientLiquidity":
                            return res.status(400).json({
                                error: { code: "INSUFFICIENT_LIQUIDITY", message: "Vault lacks THBMock to payout" }
                            });
                        // เพิ่ม case อื่นๆ ตามที่มีใน Solidity
                    }
                }
            } catch (parseError) {
                console.error("Decoding failed:", parseError);
            }
        }

        // เช็คกรณีเป็น Revert String (เช่น revert("Invalid ID"))
        const errorMessage = error.message || "";
        const reason = error.reason || "";

        if (reason.includes("Invalid ID") || errorMessage.includes("Invalid ID")) {
            return res.status(400).json({
                error: { code: "INVALID_REQUEST_ID", message: "ID does not exist" }
            });
        }
        
        // กรณีเป็น Panic Error (เช่น Array out of bounds หรือส่ง ID ที่ไม่มีอยู่จริง)
        if (error.code === 'CALL_EXCEPTION') {
             return res.status(400).json({
                error: { code: "CONTRACT_CALL_EXCEPTION", message: "Transaction reverted on-chain" }
            });
        }

        res.status(500).json({
            error: { code: "INTERNAL_SERVER_ERROR", message: error.message }
        });
    }
});

app.post('/api/nav', async (req, res) => {
    const { nav } = req.body;

    // 1. Validation เบื้องต้น
    if (!nav || isNaN(nav)) {
        return res.status(400).json({ 
            error: { code: "INVALID_INPUT", message: "Please provide valid NAV value" } 
        });
    }

    try {
        // 2. แปลงราคาเป็นหน่วย 18 decimals (เหมือนหน่วย ETH/Wei)
        // เช่น ถ้าส่งมา 1.25 จะกลายเป็น 1250000000000000000
        const navInWei = ethers.parseUnits(nav.toString(), 18);

        // 3. ส่ง Transaction ไปยัง Smart Contract
        const tx = await vaultSharesContract.setNav(navInWei);
        
        // 4. รอการ Confirm (ถ้าต้องการความชัวร์ก่อนตอบ Client)
        const receipt = await tx.wait();

        res.json({
            data: {
                txHash: tx.hash
            }
        });

    } catch (error) {
        console.error("NAV Update Error:", error);

        // ใช้ vaultInterface.parseError แบบที่เราทำไปก่อนหน้านี้
        const errorData = error.data || error.error?.data || error.info?.error?.data;
        
        if (errorData) {
            const decodedError = vaultInterface.parseError(errorData);
            if (decodedError) {
                // ตัวอย่าง Error ที่พบบ่อยในขั้นตอนนี้
                if (decodedError.name === "OwnableUnauthorizedAccount") {
                    return res.status(403).json({
                        error: { code: "UNAUTHORIZED", message: "Only owner can update NAV" }
                    });
                }
            }
        }

        res.status(500).json({
            error: { code: "NAV_UPDATE_FAILED", message: error.message }
        });
    }
});

app.post('/api/withdraw', async (req, res) => {
    const { amount } = req.body;

    // 1. Validation เบื้องต้น
    if (!amount || isNaN(amount)) {
        return res.status(400).json({ 
            error: { code: "INVALID_INPUT", message: "Please provide a valid amount" } 
        });
    }

    try {
        const amountInWei = ethers.parseUnits(amount.toString(), 18);
        const fundVaultAddress = await vaultSharesContract.fundVault();
        const stablecoinAddress = await vaultSharesContract.stablecoin();
        
        // 2. สร้าง Instance ของ Stablecoin เพื่อเช็คยอดเงิน
        const stablecoin = new ethers.Contract(
            stablecoinAddress, 
            ["function balanceOf(address) view returns (uint256)"], 
            provider
        );
        // 2. เช็คยอดเงินใน FundVault (Treasury Balance) ก่อนส่ง TX
        // สมมติว่า stablecoin คือ instance ของ IERC20 ที่เราตั้งค่าไว้
        const treasuryBalance = await stablecoin.balanceOf(fundVaultAddress);

        if (treasuryBalance < amountInWei) {
            return res.status(400).json({
                error: {
                    code: "INSUFFICIENT_TREASURY_BALANCE",
                    message: "Vault has less THB than requested"
                }
            });
        }

        // 3. เรียกฟังก์ชัน withdraw จาก FundVault
        // หมายเหตุ: ตรวจสอบชื่อฟังก์ชันใน FundVault.sol ของคุณอีกครั้ง
        // ปกติจะเป็น fundVaultContract.withdraw(amountInWei)
        const fundVaultContract = new ethers.Contract(fundVaultAddress, fundVaultJSON.abi, wallet);
        const tx = await fundVaultContract.withdraw(amountInWei);
        
        console.log(`Withdrawing: ${tx.hash}`);

        // 4. รอ Transaction Confirm
        await tx.wait();

        // 5. Response 200 OK ตาม Requirement
        res.json({
            data: {
                txHash: tx.hash
            }
        });

    } catch (error) {
        console.error("Withdraw Error:", error);

        // ดักจับ Error Unauthorized (ถ้ามี)
        const errorData = error.data || error.error?.data || error.info?.error?.data;
        if (errorData) {
            const decodedError = vaultInterface.parseError(errorData);
            if (decodedError && decodedError.name === "OwnableUnauthorizedAccount") {
                return res.status(403).json({
                    error: { code: "UNAUTHORIZED", message: "Only owner can withdraw" }
                });
            }
        }

        res.status(500).json({
            error: { code: "WITHDRAW_FAILED", message: error.message }
        });
    }
});

app.listen(3000, () => console.log('🔥 Server running on http://localhost:3000'));