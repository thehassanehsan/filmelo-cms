const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// GET /api/drive
router.get('/', auth, async (req, res) => {
  try {
    // Get the most recently updated global drive setting
    const result = await pool.query(
      `SELECT id, folder_link, label, updated_at FROM drive_settings ORDER BY updated_at DESC LIMIT 1`
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Drive GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drive (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { folder_link, label } = req.body;
  if (!folder_link?.trim()) return res.status(400).json({ error: 'folder_link required' });
  try {
    // Delete all existing settings and insert fresh
    await pool.query(`DELETE FROM drive_settings`);
    const result = await pool.query(
      `INSERT INTO drive_settings (folder_link, label, updated_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [folder_link.trim(), label?.trim() || 'Team Drive']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Drive POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
