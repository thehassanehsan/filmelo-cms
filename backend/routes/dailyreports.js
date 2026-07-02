const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth } = require('../middleware/auth');

// GET /api/dailyreports
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let query, params;

    if (isAdmin) {
      query = `
        SELECT dr.*, u.name as author_name, u.avatar_initials as author_initials
        FROM daily_reports dr
        LEFT JOIN users u ON u.id = dr.user_id
        ORDER BY dr.report_date DESC, dr.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT dr.*, u.name as author_name, u.avatar_initials as author_initials
        FROM daily_reports dr
        LEFT JOIN users u ON u.id = dr.user_id
        WHERE dr.user_id = $1
        ORDER BY dr.report_date DESC, dr.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('dailyreports GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dailyreports
router.post('/', auth, async (req, res) => {
  const { tasks_completed, projects_worked, drive_links, notes, report_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO daily_reports (user_id, tasks_completed, projects_worked, drive_links, notes, report_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.id,
        tasks_completed?.trim() || null,
        projects_worked?.trim() || null,
        drive_links?.trim() || null,
        notes?.trim() || null,
        report_date || new Date().toISOString().split('T')[0],
      ]
    );
    const full = await pool.query(
      `SELECT dr.*, u.name as author_name, u.avatar_initials as author_initials
       FROM daily_reports dr LEFT JOIN users u ON u.id = dr.user_id WHERE dr.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error('dailyreports POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dailyreports/:id
router.put('/:id', auth, async (req, res) => {
  const { tasks_completed, projects_worked, drive_links, notes, report_date } = req.body;
  try {
    const check = await pool.query('SELECT user_id FROM daily_reports WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const result = await pool.query(
      `UPDATE daily_reports SET
        tasks_completed = COALESCE($1, tasks_completed),
        projects_worked = COALESCE($2, projects_worked),
        drive_links     = COALESCE($3, drive_links),
        notes           = COALESCE($4, notes),
        report_date     = COALESCE($5, report_date),
        updated_at      = NOW()
       WHERE id = $6 RETURNING *`,
      [tasks_completed, projects_worked, drive_links, notes, report_date, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('dailyreports PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dailyreports/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const check = await pool.query('SELECT user_id FROM daily_reports WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM daily_reports WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('dailyreports DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
