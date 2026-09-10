require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:hub.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      startup_name TEXT,
      people TEXT,
      insta_handle TEXT,
      visiting_card_url TEXT,
      cabin_media_urls TEXT,
      added_by_name TEXT,
      added_by_avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

initDB().catch(console.error);

module.exports = db;