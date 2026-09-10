// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hub.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      startup_name TEXT NOT NULL,
      people TEXT NOT NULL, -- JSON array of [{name, role, phone}]
      insta_handle TEXT NOT NULL,
      visiting_card_url TEXT,
      cabin_media_urls TEXT,
      added_by_name TEXT,
      added_by_avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;