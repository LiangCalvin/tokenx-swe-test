const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

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
    "function settleRedemption(uint256 _requestId) external",
    "function redemptions(uint256) view returns (uint256 id, address wallet, uint256 shares, uint256 nav, uint256 amount, uint256 unlockDate, uint8 status)"
];

const vaultSharesContract = new ethers.Contract(vaultSharesAddress, abi, wallet);

// รัน Indexer ทันทีที่ Start Server
startIndexer(vaultSharesContract);

// --- API Endpoints ---

// GET /api/redemptions
app.get('/api/redemptions', (req, res) => {
    const query = `SELECT * FROM redemptions`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const now = Math.floor(Date.now() / 1000);
        const data = rows.map(row => {
            let status = row.status;
            // Logic เปลี่ยน status เป็น ready แบบ Dynamic
            if (status === 'pending' && now >= row.unlockDate) {
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
});

// เพิ่มใน server.js
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

        res.json({ message: "Settlement successful", txHash: tx.hash });
    } catch (error) {
        console.error(error);
        // ดัก Error ตามที่ Test คาดหวัง
        if (error.message.includes("InsufficientLiquidity")) {
            return res.status(400).json({ error: "INSUFFICIENT_LIQUIDITY" });
        }
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('🔥 Server running on http://localhost:3000'));