require('dotenv').config();
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL || 'file:hub.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function initDB() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startup_name TEXT,
        people TEXT,
        insta_handle TEXT,
        email TEXT,
        website TEXT,
        linkedin TEXT,
        address TEXT,
        visiting_card_url TEXT,
        cabin_media_urls TEXT,
        added_by_name TEXT,
        added_by_avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add new columns if table already existed
    const newCols = ['email', 'website', 'linkedin', 'address'];
    for (const col of newCols) {
      try {
        await db.execute(`ALTER TABLE contacts ADD COLUMN ${col} TEXT`);
      } catch (e) {
        // Column already exists
      }
    }
    console.log('⚡ Connected to Turso DB & updated schema successfully.');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

initDB();
module.exports = db;