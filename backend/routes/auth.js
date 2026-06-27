const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

const sign = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'professional', backup_email } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password required' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const initials = getInitials(name);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, backup_email, avatar_initials)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role`,
      [name, email, hash, role, backup_email || null, initials]
    );
    const user = result.rows[0];
    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1 AND is_active=true',
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, action, entity_type) VALUES ($1,'login','user')`,
      [user.id]
    );

    res.json({
      token: sign(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_initials: user.avatar_initials }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    // Always respond success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, expires, user.id]
    );

    // Send email if SMTP configured
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await transporter.sendMail({
        from: `"Filmelo Media" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Password Reset — Filmelo CMS',
        html: `<p>Hi ${user.name},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`
      });
      // Also send to backup email
      if (user.backup_email) {
        await transporter.sendMail({
          from: `"Filmelo Media" <${process.env.SMTP_USER}>`,
          to: user.backup_email,
          subject: 'Password Reset — Filmelo CMS (backup)',
          html: `<p>Hi ${user.name},</p><p>A password reset was requested. Click <a href="${resetUrl}">here</a>.</p>`
        });
      }
    }

    res.json({ message: 'If that email exists, a reset link has been sent.', dev_token: process.env.NODE_ENV === 'development' ? token : undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
      [token]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [hash, user.id]
    );
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, backup_email, avatar_initials, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  const { name, backup_email, current_password, new_password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];

    if (new_password) {
      const match = await bcrypt.compare(current_password, user.password_hash);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
      const hash = await bcrypt.hash(new_password, 12);
      await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, user.id]);
    }

    const initials = name ? getInitials(name) : user.avatar_initials;
    await pool.query(
      'UPDATE users SET name=$1, backup_email=$2, avatar_initials=$3, updated_at=NOW() WHERE id=$4',
      [name || user.name, backup_email || user.backup_email, initials, user.id]
    );

    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
