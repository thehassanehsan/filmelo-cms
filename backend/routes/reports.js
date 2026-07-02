const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/reports
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'client') {
      query = `SELECT r.*, c.company_name as client_name, p.title as project_title, u.name as created_by_name
               FROM reports r
               LEFT JOIN clients c ON c.id = r.client_id
               LEFT JOIN projects p ON p.id = r.project_id
               LEFT JOIN users u ON u.id = r.created_by
               WHERE c.user_id = $1 AND r.status = 'published'
               ORDER BY r.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT r.*, c.company_name as client_name, p.title as project_title, u.name as created_by_name
               FROM reports r
               LEFT JOIN clients c ON c.id = r.client_id
               LEFT JOIN projects p ON p.id = r.project_id
               LEFT JOIN users u ON u.id = r.created_by
               ORDER BY r.created_at DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, c.company_name as client_name, p.title as project_title, u.name as created_by_name
       FROM reports r
       LEFT JOIN clients c ON c.id = r.client_id
       LEFT JOIN projects p ON p.id = r.project_id
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Report not found' });
    if (req.user.role === 'client') {
      const clientCheck = await pool.query(
        'SELECT id FROM clients WHERE id=$1 AND user_id=$2',
        [result.rows[0].client_id, req.user.id]
      );
      if (!clientCheck.rows.length || result.rows[0].status !== 'published') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reports
router.post('/', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, type, client_id, project_id, content, summary, period_start, period_end, status, drive_link } = req.body;
  if (!title || !type || !client_id) return res.status(400).json({ error: 'Title, type and client required' });
  try {
    // Safely stringify content — handle both object and already-stringified
    let contentJson = null;
    if (content) {
      try {
        contentJson = typeof content === 'string' ? content : JSON.stringify(content);
      } catch { contentJson = '{}'; }
    }

    const result = await pool.query(
      `INSERT INTO reports (title, type, client_id, project_id, content, summary, period_start, period_end, status, drive_link, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        title, type, client_id,
        project_id || null,
        contentJson || '{}',
        summary || null,
        period_start || null,
        period_end || null,
        status || 'draft',
        drive_link || null,
        req.user.id
      ]
    );

    if (status === 'published') {
      const clientUser = await pool.query('SELECT user_id FROM clients WHERE id=$1', [client_id]);
      if (clientUser.rows[0]?.user_id) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,'report',$4)`,
          [clientUser.rows[0].user_id, 'New report available', `${title} has been published for your review.`, `/client/reports`]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Report create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reports/:id
router.put('/:id', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, type, client_id, project_id, content, summary, period_start, period_end, status, drive_link } = req.body;
  try {
    let contentJson = undefined;
    if (content !== undefined) {
      try {
        contentJson = typeof content === 'string' ? content : JSON.stringify(content);
      } catch { contentJson = '{}'; }
    }

    const result = await pool.query(
      `UPDATE reports SET
        title=COALESCE($1,title),
        type=COALESCE($2,type),
        client_id=COALESCE($3,client_id),
        project_id=COALESCE($4,project_id),
        content=COALESCE($5::jsonb,content),
        summary=COALESCE($6,summary),
        period_start=COALESCE($7,period_start),
        period_end=COALESCE($8,period_end),
        status=COALESCE($9,status),
        drive_link=COALESCE($10,drive_link),
        updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, type, client_id, project_id, contentJson || null, summary, period_start, period_end, status, drive_link, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Report not found' });

    // Notify client on publish
    if (status === 'published') {
      const rep = result.rows[0];
      const clientUser = await pool.query('SELECT user_id FROM clients WHERE id=$1', [rep.client_id]);
      if (clientUser.rows[0]?.user_id) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,'report',$4)`,
          [clientUser.rows[0].user_id, 'Report updated', `${rep.title} has been updated.`, `/client/reports`]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Report update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM reports WHERE id=$1', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
