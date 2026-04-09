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
// async function startIndexer(vaultSharesContract) {
//   console.log("Listening for events...");

//     // 1. ฟังตอนขอถอน (RedemptionRequested)
//   vaultSharesContract.on("RedemptionRequested", async (id, wallet, shares, nav, amount) => {
//     console.log(`📌 New Request Caught: ID ${id}`);
//     const unlockDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
//     db.run(
//       `INSERT INTO redemptions (requestId, wallet, shares, nav, amount, unlockDate, status) 
//        VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
//       [Number(id), wallet, shares.toString(), nav.toString(), amount.toString(), unlockDate],
//       (err) => { if(err) console.error("DB Error:", err.message); }
//     );
//   });

//   // 2. เพิ่มส่วนนี้: ฟังตอนจ่ายเงินสำเร็จ (RedemptionSettled)
//   vaultSharesContract.on("RedemptionSettled", (id, wallet, amount) => {
//     console.log(`✅ Settled Event Detected: ID ${id}`);
    
//     db.run(
//       `UPDATE redemptions SET status = 'fulfilled' WHERE requestId = ?`,
//       [Number(id)],
//       (err) => {
//         if (err) {
//           console.error("❌ DB Update Error:", err.message);
//         } else {
//           console.log(`📝 Database updated: Request ID ${id} is now fulfilled`);
//         }
//       }
//     );
//   });
  

// }

// indexer.js


async function startIndexer(vaultSharesContract) {
    console.log("🚀 Indexer is starting...");

    // --- ส่วนที่ 1: ดึงข้อมูลย้อนหลัง (Sync History) ---
    // ป้องกันกรณี server ดับ หรือ indexer หลุดไปช่วงหนึ่ง
    try {
        console.log("🔍 Scanning for past events...");
        // ดึง Event ทั้งหมดตั้งแต่ block 0 จนถึงปัจจุบัน
        const pastRequests = await vaultSharesContract.queryFilter("RedemptionRequested", 0, "latest");
        const pastSettles = await vaultSharesContract.queryFilter("RedemptionSettled", 0, "latest");

        for (const event of pastRequests) {
            const { requestId, wallet, shares, nav, amount } = event.args;

            // ดึงข้อมูลตรงๆ จาก Contract เพื่อให้ได้ค่า unlockDate ที่แม่นยำที่สุด
            const reqFromChain = await vaultSharesContract.redemptions(requestId);
            const actualUnlockDate = Number(reqFromChain.unlockDate);

            db.run(
                `INSERT OR IGNORE INTO redemptions (requestId, wallet, shares, nav, amount, unlockDate, status) 
                VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [Number(requestId), wallet, shares.toString(), nav.toString(), amount.toString(), actualUnlockDate]
            );
        }

        for (const event of pastSettles) {
            const { requestId } = event.args;
            db.run(`UPDATE redemptions SET status = 'fulfilled' WHERE requestId = ?`, [Number(requestId)]);
        }
        console.log(`✅ Sync complete. Found ${pastRequests.length} requests.`);
    } catch (err) {
        console.error("❌ Sync Error:", err.message);
    }

    // --- ส่วนที่ 2: ฟัง Event ใหม่ (Real-time Listening) ---
    // ใส่ try-catch ครอบเพื่อป้องกัน Error "results is not iterable" ทำระบบพัง
    try {
        vaultSharesContract.on("RedemptionRequested", async (id, wallet, shares, nav, amount) => {
            console.log(`📌 New Request Caught: ID ${id}`);
            const unlockDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
            
            db.run(
                `INSERT OR IGNORE INTO redemptions (requestId, wallet, shares, nav, amount, unlockDate, status) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [Number(id), wallet, shares.toString(), nav.toString(), amount.toString(), unlockDate]
            );
        });

        vaultSharesContract.on("RedemptionSettled", (id) => {
            console.log(`✅ Settled Event Detected: ID ${id}`);
            db.run(`UPDATE redemptions SET status = 'fulfilled' WHERE requestId = ?`, [Number(id)]);
        });
    } catch (err) {
        console.error("❌ Real-time Listener Error:", err.message);
    }
}

module.exports = { startIndexer };