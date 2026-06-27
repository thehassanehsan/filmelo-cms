const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/clients
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'client') {
      // Client users only see their own record
      query = `SELECT c.* FROM clients c
               JOIN users u ON u.id = c.user_id
               WHERE u.id = $1`;
      params = [req.user.id];
    } else {
      query = `SELECT c.*, u.email as portal_email FROM clients c
               LEFT JOIN users u ON u.id = c.user_id
               ORDER BY c.created_at DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/clients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.email as portal_email, u.name as portal_user_name FROM clients c
       LEFT JOIN users u ON u.id = c.user_id WHERE c.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });

    // Client can only see their own
    if (req.user.role === 'client' && result.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clients
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { company_name, contact_name, email, phone, industry, location, status, notes, user_id } = req.body;
  if (!company_name) return res.status(400).json({ error: 'Company name required' });

  try {
    const result = await pool.query(
      `INSERT INTO clients (company_name, contact_name, email, phone, industry, location, status, notes, user_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [company_name, contact_name, email, phone, industry, location, status || 'active', notes, user_id || null, req.user.id]
    );

    await pool.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1,'create_client','client',$2,$3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ company_name })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/clients/:id
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { company_name, contact_name, email, phone, industry, location, status, notes, user_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clients SET
        company_name=COALESCE($1,company_name), contact_name=COALESCE($2,contact_name),
        email=COALESCE($3,email), phone=COALESCE($4,phone), industry=COALESCE($5,industry),
        location=COALESCE($6,location), status=COALESCE($7,status), notes=COALESCE($8,notes),
        user_id=COALESCE($9,user_id), updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [company_name, contact_name, email, phone, industry, location, status, notes, user_id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id=$1', [req.params.id]);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
