const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// GET /api/messages/conversations — list of people you've talked to
router.get('/conversations', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_user)
        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user,
        m.content as last_message,
        m.created_at as last_at,
        m.sender_id,
        u.name as other_name,
        u.avatar_initials as other_initials,
        u.role as other_role,
        COUNT(m2.id) FILTER (WHERE m2.receiver_id = $1 AND m2.is_read = false) as unread
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
      LEFT JOIN messages m2 ON m2.sender_id = u.id AND m2.receiver_id = $1 AND m2.is_read = false
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY other_user, m.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/:userId — get conversation with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    // Mark as read
    await pool.query(
      `UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2`,
      [req.params.userId, req.user.id]
    );

    const result = await pool.query(`
      SELECT m.*, 
        s.name as sender_name, s.avatar_initials as sender_initials,
        r.name as receiver_name
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.receiver_id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
    `, [req.user.id, req.params.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages — send a message
router.post('/', auth, async (req, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content?.trim()) return res.status(400).json({ error: 'Receiver and content required' });
  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, receiver_id, content.trim()]
    );

    // Notify receiver
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,'message',$4)`,
      [receiver_id, 'New message', `Message from ${req.user.name}`, `/messages`]
    );

    // Return with sender info
    const full = await pool.query(
      `SELECT m.*, u.name as sender_name, u.avatar_initials as sender_initials
       FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/unread/count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
