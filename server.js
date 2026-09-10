// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// DYNAMIC STORAGE: Creates a unique folder per contact submission
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.contactFolder) {
      const uniqueId = `contact_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      req.contactFolder = path.join(uploadsDir, uniqueId);
      req.contactFolderRelative = `/uploads/${uniqueId}`;
      if (!fs.existsSync(req.contactFolder)) {
        fs.mkdirSync(req.contactFolder, { recursive: true });
      }
    }
    cb(null, req.contactFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    cb(null, `${file.fieldname}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max limit
});

const uploadFields = upload.fields([
  { name: 'visitingCard', maxCount: 1 },
  { name: 'cabinMedia', maxCount: 10 }
]);

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

app.post('/api/contacts', uploadFields, (req, res) => {
  try {
    const { startupName, people, instaHandle, addedByName, addedByAvatar } = req.body;

    const folderRel = req.contactFolderRelative || '';

    let visitingCardUrl = null;
    if (req.files && req.files['visitingCard'] && req.files['visitingCard'][0]) {
      visitingCardUrl = `${folderRel}/${req.files['visitingCard'][0].filename}`;
    }

    let cabinMediaUrls = [];
    if (req.files && req.files['cabinMedia']) {
      cabinMediaUrls = req.files['cabinMedia'].map(file => ({
        type: file.mimetype,
        url: `${folderRel}/${file.filename}`
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
      res.json({ success: true, id: this.lastID, folder: folderRel });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Neo-Brutalist Hub running at http://localhost:${PORT}`);
});