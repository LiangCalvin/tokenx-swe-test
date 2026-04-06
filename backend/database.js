const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./vault.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS redemptions (
    requestId INTEGER PRIMARY KEY,
    wallet TEXT,
    shares TEXT,
    nav TEXT,
    amount TEXT,
    unlockDate INTEGER,
    status TEXT DEFAULT 'pending'
  )`);
});

module.exports = db;