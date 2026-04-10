// Run terminal 'npx hardhat console --network localhost'

// 1. ดึง Instance ของ Contract
const vs = await ethers.getContractAt("VaultShares", "ใส่_VAULT_SHARES_ADDRESS");
const thb = await ethers.getContractAt("THBMock", "ใส่_THB_MOCK_ADDRESS");

// 2. ดึง Account ของเรามา และ เสกเหรียญให้ตัวเอง
const [owner] = await ethers.getSigners();
await thb.mint(owner.address, ethers.parseEther("1000"));

// 3. เช็คยอดเงินเพื่อความชัวร์
const bal = await thb.balanceOf(owner.address);
console.log("Balance:", ethers.formatEther(bal));

// 4. อนุมัติ (Approve)
const amount = ethers.parseEther("100");
await thb.approve(await vs.getAddress(), amount);

// 5. ฝาก (Deposit)
await vs.deposit(amount);

// 5.1 เช็คยอดเงินสด (THB) - ควรจะเหลือ 900 (ถ้าฝากไป 100)
const thbBal = await thb.balanceOf(owner.address);
console.log("THB Asset:", ethers.formatEther(thbBal));
console.log("THB Asset:", ethers.formatEther(await thb.balanceOf(owner.address)));

// 5.2 เช็ค Shares in hand
const shareBal = await vs.balanceOf(owner.address);
console.log("Shares in hand:", ethers.formatEther(shareBal));
console.log("Current Shares:", ethers.formatEther(await vs.balanceOf(owner.address)));

// 5.3 เช็คยอดเงินสด (THB) ที่นอนนิ่งอยู่ในสัญญา Vault
const fv = await ethers.getContractAt("FundVault", "ใส่_FUND_VAULT_ADDRESS");
console.log("Real Liquidity (at FundVault):", ethers.formatEther(await thb.balanceOf(await fv.getAddress())));

// 6. ขอถอน (Request Redeem) (นี่คือจุดที่จะทำให้ Indexer ทำงาน)
await vs.requestRedeem(ethers.parseEther("50"));

// 7. สั่งเร่งเวลาไป 25 ชั่วโมง (ให้เกิน 24 ชม. ที่กำหนดไว้)
await network.provider.send("evm_increaseTime", [90000]); 

// 8. ขุด Block ใหม่เพื่อให้เวลาอัปเดต
await network.provider.send("evm_mine");

// 9. ถอนเงินออกจาก FundVault ไปให้ Owner (หรือกระเป๋าอื่น) 
// ตอนนี้มี 250 ถ้าถอนออก 220 จะเหลือติดตู้แค่ 30 ซึ่งไม่พอจ่ายรายการละ 50
await fv.withdraw(ethers.parseEther("220"));

// 10. ทดสอบ attacker
const signers = await ethers.getSigners();
const stranger = signers[1]; // คนที่ 2 ใน list (index 1)
const vsAsStranger = vs.connect(stranger);
// ลองเรียกแบบไม่มี try-catch ก่อน เพื่อดูว่ามัน Revert สีแดงๆ จริงไหม
await vs.connect((await ethers.getSigners())[1]).setNav(ethers.parseEther("999"))