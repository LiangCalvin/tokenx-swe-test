// indexer.js
const { ethers } = require("ethers");
const db = require("./database");

async function startIndexer(vaultSharesContract) {
    console.log("🚀 Indexer is starting...");

    // --- ส่วนที่ 1: ดึงข้อมูลย้อนหลัง (Sync History) ---
    // ป้องกันกรณี server ดับ หรือ indexer หลุดไปช่วงหนึ่ง
    const syncEvents = async () => {
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
    }


    // 1. รันครั้งแรกทันที
    await syncEvents();

    // 2. ตั้งเวลาให้รันกวาดใหม่ทุกๆ 15 วินาที (Fallback Strategy)
    // วิธีนี้จะช่วยให้แม้ Listener จะพัง แต่ข้อมูลจะถูกอัปเดตแน่นอนภายใน 15 วิ
    setInterval(syncEvents, 15000);

    // --- ส่วนที่ 2: ฟัง Event ใหม่ (Real-time Listening) ---
    // ใส่ try-catch ครอบเพื่อป้องกัน Error "results is not iterable" ทำระบบพัง
    try {
        vaultSharesContract.on("RedemptionRequested", async (id, wallet, shares, nav, amount, event) => {
            console.log(`📌 New Request Caught: ID ${id}`);

            const block = await event.getBlock();
            const unlockDate = Number(block.timestamp) + (24 * 60 * 60);
            
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