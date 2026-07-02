const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/messages/allowed-contacts — for clients, returns only admin-approved contacts
router.get('/allowed-contacts', auth, async (req, res) => {
  try {
    if (req.user.role === 'client') {
      // Get client record and allowed_message_user_ids
      const clientResult = await pool.query('SELECT allowed_message_user_ids FROM clients WHERE user_id=$1', [req.user.id]);
      const allowed = clientResult.rows[0]?.allowed_message_user_ids || [];
      if (!allowed.length) return res.json([]);
      const users = await pool.query(
        `SELECT id,name,email,role,avatar_initials FROM users WHERE id=ANY($1) AND is_active=true`,
        [allowed]);
      return res.json(users.rows);
    }
    // Admins/professionals see everyone
    const result = await pool.query(
      `SELECT id,name,email,role,avatar_initials FROM users WHERE is_active=true AND id!=$1 ORDER BY name`,
      [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/messages/audit/:userId/:otherId — ADMIN ONLY: full conversation including deleted
router.get('/audit/:userId/:otherId', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, s.name as sender_name, s.avatar_initials as sender_initials
      FROM messages m
      JOIN users s ON s.id=m.sender_id
      WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
      ORDER BY m.created_at ASC`, [req.params.userId, req.params.otherId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/messages/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH ranked AS (
        SELECT DISTINCT ON (LEAST(sender_id,receiver_id), GREATEST(sender_id,receiver_id))
          CASE WHEN sender_id=$1 THEN receiver_id ELSE sender_id END as other_user,
          content as last_message, created_at as last_at, sender_id
        FROM messages WHERE (sender_id=$1 OR receiver_id=$1) AND is_deleted=false
        ORDER BY LEAST(sender_id,receiver_id), GREATEST(sender_id,receiver_id), created_at DESC
      )
      SELECT r.*, u.name as other_name, u.avatar_initials as other_initials, u.role as other_role,
        (SELECT COUNT(*) FROM messages m2 WHERE m2.sender_id=r.other_user AND m2.receiver_id=$1 AND m2.is_read=false AND m2.is_deleted=false) as unread
      FROM ranked r JOIN users u ON u.id=r.other_user
      ORDER BY r.last_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/messages/:userId
router.get('/:userId', auth, async (req, res) => {
  try {
    await pool.query(`UPDATE messages SET is_read=true WHERE sender_id=$1 AND receiver_id=$2 AND is_read=false`,
      [req.params.userId, req.user.id]);
    const result = await pool.query(`
      SELECT m.*, s.name as sender_name, s.avatar_initials as sender_initials,
        fwd.content as forwarded_content, fwdu.name as forwarded_from_name
      FROM messages m
      JOIN users s ON s.id=m.sender_id
      LEFT JOIN messages fwd ON fwd.id=m.forwarded_from
      LEFT JOIN users fwdu ON fwdu.id=fwd.sender_id
      WHERE ((m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1))
      ORDER BY m.created_at ASC
    `, [req.user.id, req.params.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/messages
router.post('/', auth, async (req, res) => {
  const { receiver_id, content, forwarded_from } = req.body;
  if (!receiver_id || !content?.trim()) return res.status(400).json({ error: 'Required' });

  // Enforce client messaging restriction
  if (req.user.role === 'client') {
    const clientResult = await pool.query('SELECT allowed_message_user_ids FROM clients WHERE user_id=$1', [req.user.id]);
    const allowed = clientResult.rows[0]?.allowed_message_user_ids || [];
    if (!allowed.includes(receiver_id)) return res.status(403).json({ error: 'You are not allowed to message this person.' });
  }

  try {
    const r = await pool.query(`INSERT INTO messages (sender_id,receiver_id,content,forwarded_from) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, receiver_id, content.trim(), forwarded_from||null]);
    await pool.query(`INSERT INTO notifications (user_id,title,message,type,link) VALUES ($1,$2,$3,'message','/messages')`,
      [receiver_id, 'New message', `Message from ${req.user.name}`]);
    const full = await pool.query(`SELECT m.*, u.name as sender_name, u.avatar_initials as sender_initials FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1`, [r.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/messages/:id/edit
router.put('/:id/edit', auth, async (req, res) => {
  const { content } = req.body;
  try {
    const msg = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Not found' });
    if (msg.rows[0].sender_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });
    const r = await pool.query(`UPDATE messages SET content=$1, original_content=COALESCE(original_content,content), is_edited=true, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [content, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/messages/:id (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const msg = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Not found' });
    // Admin can delete any; others only their own
    if (req.user.role !== 'admin' && msg.rows[0].sender_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await pool.query(`UPDATE messages SET is_deleted=true, content='[Message deleted]', updated_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/messages/unread/count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=false AND is_deleted=false`, [req.user.id]);
    res.json({ count: Number(r.rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
