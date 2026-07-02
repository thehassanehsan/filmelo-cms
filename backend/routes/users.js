const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/users — admin sees all, others see professionals only
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `SELECT id, name, email, role, backup_email, avatar_initials, is_active, created_at FROM users ORDER BY created_at DESC`;
      params = [];
    } else {
      query = `SELECT id, name, email, role, avatar_initials FROM users WHERE role IN ('admin','professional') AND is_active=true ORDER BY name`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — admin creates users
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, backup_email } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'All fields required' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, backup_email, avatar_initials)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, avatar_initials, is_active, created_at`,
      [name, email, hash, role, backup_email || null, initials]
    );

    await pool.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1,'create_user','user',$2,$3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ name, email, role })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { name, email, role, backup_email, is_active } = req.body;
  try {
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : undefined;
    const result = await pool.query(
      `UPDATE users SET
        name=COALESCE($1, name),
        email=COALESCE($2, email),
        role=COALESCE($3, role),
        backup_email=COALESCE($4, backup_email),
        is_active=COALESCE($5, is_active),
        avatar_initials=COALESCE($6, avatar_initials),
        updated_at=NOW()
       WHERE id=$7 RETURNING id, name, email, role, backup_email, avatar_initials, is_active`,
      [name, email, role, backup_email, is_active, initials, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  try {
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
