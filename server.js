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
    const { startupName, people, instaHandle, addedByName, addedByAvatar } = req.body;

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

    const result = await db.execute({
      sql: query,
      args: [
        startupName, people, instaHandle,
        visitingCardUrl, JSON.stringify(cabinMediaUrls), addedByName, addedByAvatar
      ]
    });

    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});