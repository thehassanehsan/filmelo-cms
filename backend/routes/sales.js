const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// All sales routes — admin only
router.use(auth, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, u.name as assigned_name, u.avatar_initials
      FROM sales_pipeline s
      LEFT JOIN users u ON u.id=s.assigned_to
      ORDER BY s.created_at DESC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { company_name, contact_name, contact_email, contact_phone, stage, package: pkg, value, assigned_to, deadline, notes } = req.body;
  if (!company_name) return res.status(400).json({ error: 'Company name required' });
  try {
    const r = await pool.query(`
      INSERT INTO sales_pipeline (company_name,contact_name,contact_email,contact_phone,stage,package,value,assigned_to,deadline,notes,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [company_name, contact_name, contact_email, contact_phone, stage||'prospect', pkg, value||null, assigned_to||null, deadline||null, notes, req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  const { company_name, contact_name, contact_email, contact_phone, stage, package: pkg, value, assigned_to, deadline, notes } = req.body;
  try {
    const r = await pool.query(`
      UPDATE sales_pipeline SET
        company_name=COALESCE($1,company_name), contact_name=COALESCE($2,contact_name),
        contact_email=COALESCE($3,contact_email), contact_phone=COALESCE($4,contact_phone),
        stage=COALESCE($5,stage), package=COALESCE($6,package), value=COALESCE($7,value),
        assigned_to=COALESCE($8,assigned_to), deadline=COALESCE($9,deadline),
        notes=COALESCE($10,notes), updated_at=NOW()
      WHERE id=$11 RETURNING *`,
      [company_name, contact_name, contact_email, contact_phone, stage, pkg, value, assigned_to, deadline, notes, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try { await pool.query('DELETE FROM sales_pipeline WHERE id=$1', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
