const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/projects
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'client') {
      query = `SELECT p.*, c.company_name as client_name FROM projects p
               LEFT JOIN clients c ON c.id = p.client_id
               WHERE c.user_id = $1 ORDER BY p.created_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'professional') {
      query = `SELECT p.*, c.company_name as client_name FROM projects p
               LEFT JOIN clients c ON c.id = p.client_id
               LEFT JOIN project_members pm ON pm.project_id = p.id
               WHERE pm.user_id = $1 OR p.created_by = $1
               ORDER BY p.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT p.*, c.company_name as client_name FROM projects p
               LEFT JOIN clients c ON c.id = p.client_id ORDER BY p.created_at DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.company_name as client_name, c.contact_name as client_contact
       FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });

    // Get members
    const members = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_initials, pm.role as project_role
       FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id=$1`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], members: members.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects
router.post('/', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, description, client_id, status, priority, start_date, due_date, budget, member_ids } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const result = await pool.query(
      `INSERT INTO projects (title, description, client_id, status, priority, start_date, due_date, budget, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, client_id || null, status || 'active', priority || 'medium', start_date || null, due_date || null, budget || null, req.user.id]
    );
    const project = result.rows[0];

    // Add creator as member
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [project.id, req.user.id, 'lead']
    );

    // Add other members
    if (member_ids && member_ids.length) {
      for (const uid of member_ids) {
        await pool.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [project.id, uid]
        );
      }
    }

    await pool.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1,'create_project','project',$2,$3)`,
      [req.user.id, project.id, JSON.stringify({ title })]
    );

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, description, client_id, status, priority, start_date, due_date, budget, spent } = req.body;
  try {
    const result = await pool.query(
      `UPDATE projects SET
        title=COALESCE($1,title), description=COALESCE($2,description),
        client_id=COALESCE($3,client_id), status=COALESCE($4,status),
        priority=COALESCE($5,priority), start_date=COALESCE($6,start_date),
        due_date=COALESCE($7,due_date), budget=COALESCE($8,budget),
        spent=COALESCE($9,spent), updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, description, client_id, status, priority, start_date, due_date, budget, spent, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:id/members
router.post('/:id/members', auth, requireRole('admin'), async (req, res) => {
  const { user_id, role } = req.body;
  try {
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [req.params.id, user_id, role || 'member']
    );
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
