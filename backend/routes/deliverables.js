const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/deliverables
router.get('/', auth, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'client') {
      // Clients only see deliverables for their linked client record
      query = `
        SELECT d.*, c.company_name as client_name, p.title as project_title,
               u.name as created_by_name, u.avatar_initials as created_by_initials
        FROM deliverables d
        LEFT JOIN clients c ON c.id = d.client_id
        LEFT JOIN projects p ON p.id = d.project_id
        LEFT JOIN users u ON u.id = d.created_by
        WHERE c.user_id = $1
        ORDER BY d.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `
        SELECT d.*, c.company_name as client_name, p.title as project_title,
               u.name as created_by_name, u.avatar_initials as created_by_initials
        FROM deliverables d
        LEFT JOIN clients c ON c.id = d.client_id
        LEFT JOIN projects p ON p.id = d.project_id
        LEFT JOIN users u ON u.id = d.created_by
        ORDER BY d.created_at DESC`;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/deliverables/:id  (with remarks)
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.company_name as client_name, p.title as project_title,
             u.name as created_by_name
      FROM deliverables d
      LEFT JOIN clients c ON c.id = d.client_id
      LEFT JOIN projects p ON p.id = d.project_id
      LEFT JOIN users u ON u.id = d.created_by
      WHERE d.id = $1`, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Deliverable not found' });

    const remarks = await pool.query(`
      SELECT dr.*, u.name as user_name, u.avatar_initials, u.role as user_role
      FROM deliverable_remarks dr
      LEFT JOIN users u ON u.id = dr.user_id
      WHERE dr.deliverable_id = $1
      ORDER BY dr.created_at ASC`, [req.params.id]);

    res.json({ ...result.rows[0], remarks: remarks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/deliverables  (admin + professional)
router.post('/', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, client_id, project_id, video_link, status, revision_number, description } = req.body;
  if (!title || !client_id) return res.status(400).json({ error: 'Title and client required' });

  try {
    const result = await pool.query(`
      INSERT INTO deliverables (title, client_id, project_id, video_link, status, revision_number, description, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, client_id, project_id || null, video_link || null,
       status || 'draft', revision_number || 1, description || null, req.user.id]);

    // Notify client
    const clientUser = await pool.query('SELECT user_id FROM clients WHERE id=$1', [client_id]);
    if (clientUser.rows[0]?.user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1,$2,$3,'deliverable','/client/deliverables')`,
        [clientUser.rows[0].user_id,
         'New deliverable ready',
         `"${title}" has been uploaded for your review.`]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deliverables/:id
router.put('/:id', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, client_id, project_id, video_link, status, revision_number, description } = req.body;
  try {
    const result = await pool.query(`
      UPDATE deliverables SET
        title=COALESCE($1,title), client_id=COALESCE($2,client_id),
        project_id=COALESCE($3,project_id), video_link=COALESCE($4,video_link),
        status=COALESCE($5,status), revision_number=COALESCE($6,revision_number),
        description=COALESCE($7,description), updated_at=NOW()
      WHERE id=$8 RETURNING *`,
      [title, client_id, project_id, video_link, status, revision_number, description, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Deliverable not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deliverables/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM deliverables WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/deliverables/:id/remarks  (all roles can remark)
router.post('/:id/remarks', auth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await pool.query(`
      INSERT INTO deliverable_remarks (deliverable_id, user_id, content)
      VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content.trim()]);

    // Notify the deliverable creator
    const del = await pool.query('SELECT created_by, title FROM deliverables WHERE id=$1', [req.params.id]);
    if (del.rows[0]?.created_by && del.rows[0].created_by !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1,$2,$3,'remark','/admin/deliverables')`,
        [del.rows[0].created_by,
         'New remark on deliverable',
         `${req.user.name} left a remark on "${del.rows[0].title}"`]);
    }

    const full = await pool.query(`
      SELECT dr.*, u.name as user_name, u.avatar_initials, u.role as user_role
      FROM deliverable_remarks dr
      LEFT JOIN users u ON u.id = dr.user_id
      WHERE dr.id=$1`, [result.rows[0].id]);

    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
