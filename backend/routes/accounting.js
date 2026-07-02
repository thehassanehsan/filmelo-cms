const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth, requireRole('admin'));

// GET /api/accounting — all entries + summary
router.get('/', async (req, res) => {
  try {
    const entries = await pool.query(`SELECT a.*, u.name as created_by_name FROM accounting a LEFT JOIN users u ON u.id=a.created_by ORDER BY a.entry_date DESC, a.created_at DESC`);
    const summary = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) as total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as total_expense,
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE -amount END),0) as balance
      FROM accounting`);
    const by_category = await pool.query(`SELECT type, category, SUM(amount) as total FROM accounting GROUP BY type,category ORDER BY type,total DESC`);
    res.json({ entries: entries.rows, summary: summary.rows[0], by_category: by_category.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  const { type, category, amount, description, reference, entry_date } = req.body;
  if (!type || !amount) return res.status(400).json({ error: 'Type and amount required' });
  try {
    const r = await pool.query(`INSERT INTO accounting (type,category,amount,description,reference,entry_date,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [type, category, amount, description, reference, entry_date||null, req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  const { type, category, amount, description, reference, entry_date } = req.body;
  try {
    const r = await pool.query(`UPDATE accounting SET type=COALESCE($1,type),category=COALESCE($2,category),amount=COALESCE($3,amount),description=COALESCE($4,description),reference=COALESCE($5,reference),entry_date=COALESCE($6,entry_date),updated_at=NOW() WHERE id=$7 RETURNING *`,
      [type, category, amount, description, reference, entry_date, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try { await pool.query('DELETE FROM accounting WHERE id=$1', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
