const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// GET /api/teamchat — get last 100 messages
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tc.*, u.name as sender_name, u.avatar_initials as sender_initials, u.role as sender_role
      FROM team_chat tc
      LEFT JOIN users u ON u.id = tc.sender_id
      ORDER BY tc.created_at ASC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/teamchat — send a message
router.post('/', auth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await pool.query(
      `INSERT INTO team_chat (sender_id, content) VALUES ($1,$2) RETURNING *`,
      [req.user.id, content.trim()]
    );
    const full = await pool.query(
      `SELECT tc.*, u.name as sender_name, u.avatar_initials as sender_initials, u.role as sender_role
       FROM team_chat tc LEFT JOIN users u ON u.id = tc.sender_id WHERE tc.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
