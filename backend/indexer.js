// indexer.js
const { ethers } = require("ethers");
const db = require("./database");

// async function startIndexer(vaultSharesContract) {
//   console.log("Listening for events...");

//   // ฟังเหตุการณ์เมื่อมีการขอถอนเงิน
//   vaultSharesContract.on("RedemptionRequested", (id, wallet, shares, nav, amount, event) => {
//     const unlockDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // T+1
    
//     db.run(
//       `INSERT INTO redemptions (requestId, wallet, shares, nav, amount, unlockDate, status) 
//        VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
//       [Number(id), wallet, shares.toString(), nav.toString(), amount.toString(), unlockDate]
//     );
//     console.log(`Indexed Request ID: ${id}`);
//   });

//   // ฟังเหตุการณ์เมื่อ Admin จ่ายเงินสำเร็จ
//   vaultSharesContract.on("RedemptionSettled", (id) => {
//     db.run(`UPDATE redemptions SET status = 'fulfilled' WHERE requestId = ?`, [Number(id)]);
//     console.log(`Settled Request ID: ${id}`);
//   });
// }
// indexer.js
async function startIndexer(vaultSharesContract) {
  console.log("Listening for events...");

  // ใช้คำสั่งนี้เพื่อดักฟังเหตุการณ์แบบเฉพาะเจาะจง
  vaultSharesContract.on("RedemptionRequested", async (id, wallet, shares, nav, amount) => {
    console.log(`📌 New Request Caught: ID ${id}`);
    const unlockDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
    db.run(
      `INSERT INTO redemptions (requestId, wallet, shares, nav, amount, unlockDate, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [Number(id), wallet, shares.toString(), nav.toString(), amount.toString(), unlockDate],
      (err) => { if(err) console.error("DB Error:", err.message); }
    );
  });
}

module.exports = { startIndexer };