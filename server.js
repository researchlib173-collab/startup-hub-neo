require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db = require('./db');

console.log('⚡ Starting Express App setup...');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Cloudinary Storage Engine
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'startup_hub_uploads',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi'],
      resource_type: 'auto'
    }
  });
  console.log('⚡ Cloudinary storage initialized.');
} catch (err) {
  console.error('⚠️ Cloudinary storage fallback activated:', err.message);
  storage = multer.diskStorage({});
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

const uploadFields = upload.fields([
  { name: 'visitingCard', maxCount: 1 },
  { name: 'cabinMedia', maxCount: 10 }
]);

// GET ALL CONTACTS
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM contacts ORDER BY created_at DESC');
    const contacts = result.rows.map(row => ({
      ...row,
      people: JSON.parse(row.people || '[]'),
      cabin_media_urls: JSON.parse(row.cabin_media_urls || '[]')
    }));
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST NEW CONTACT
app.post('/api/contacts', uploadFields, async (req, res) => {
  try {
    const { 
      startupName, people, instaHandle, 
      email, website, linkedin, address, 
      addedByName, addedByAvatar 
    } = req.body;

    let visitingCardUrl = null;
    if (req.files && req.files['visitingCard'] && req.files['visitingCard'][0]) {
      visitingCardUrl = req.files['visitingCard'][0].path;
    }

    let cabinMediaUrls = [];
    if (req.files && req.files['cabinMedia']) {
      cabinMediaUrls = req.files['cabinMedia'].map(file => ({
        type: file.mimetype,
        url: file.path
      }));
    }

    const query = `
      INSERT INTO contacts 
      (startup_name, people, insta_handle, email, website, linkedin, address, visiting_card_url, cabin_media_urls, added_by_name, added_by_avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.execute({
      sql: query,
      args: [
        startupName, people, instaHandle,
        email || null, website || null, linkedin || null, address || null,
        visitingCardUrl, JSON.stringify(cabinMediaUrls), addedByName, addedByAvatar
      ]
    });

    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bind explicitly to 0.0.0.0 for Render host compliance
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is live and running on port ${PORT}`);
});