require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Configure Cloudinary Credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Cloudinary Storage Engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: 'startup_hub_uploads',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi']
    };
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max limit for videos
});

const uploadFields = upload.fields([
  { name: 'visitingCard', maxCount: 1 },
  { name: 'cabinMedia', maxCount: 10 }
]);

// GET ALL CONTACTS
app.get('/api/contacts', (req, res) => {
  db.all('SELECT * FROM contacts ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const contacts = rows.map(row => ({
      ...row,
      people: JSON.parse(row.people || '[]'),
      cabin_media_urls: JSON.parse(row.cabin_media_urls || '[]')
    }));
    res.json(contacts);
  });
});

// POST NEW CONTACT (Cloudinary Direct Stream)
app.post('/api/contacts', uploadFields, (req, res) => {
  try {
    const { startupName, people, instaHandle, addedByName, addedByAvatar } = req.body;

    // Cloudinary returns the hosted HTTPS URL in file.path
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
      (startup_name, people, insta_handle, visiting_card_url, cabin_media_urls, added_by_name, added_by_avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      startupName, people, instaHandle,
      visitingCardUrl, JSON.stringify(cabinMediaUrls), addedByName, addedByAvatar
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Server running at http://localhost:${PORT}`);
});