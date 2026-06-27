const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  const { project_id, assigned_to, status } = req.query;
  try {
    let conditions = [];
    let params = [];
    let idx = 1;

    if (project_id) { conditions.push(`t.project_id=$${idx++}`); params.push(project_id); }
    if (assigned_to) { conditions.push(`t.assigned_to=$${idx++}`); params.push(assigned_to); }
    if (status) { conditions.push(`t.status=$${idx++}`); params.push(status); }

    // Professionals only see tasks in their projects
    if (req.user.role === 'professional') {
      conditions.push(
        `(t.assigned_to=$${idx} OR t.created_by=$${idx} OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id=$${idx}))`
      );
      params.push(req.user.id);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `
      SELECT t.*,
        p.title as project_title,
        u.name as assignee_name, u.avatar_initials as assignee_initials,
        c.name as creator_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      ${where}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        t.due_date ASC NULLS LAST
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.title as project_title, u.name as assignee_name, u.avatar_initials as assignee_initials
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });

    const comments = await pool.query(
      `SELECT tc.*, u.name as user_name, u.avatar_initials
       FROM task_comments tc JOIN users u ON u.id = tc.user_id
       WHERE tc.task_id=$1 ORDER BY tc.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], comments: comments.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, description, project_id, assigned_to, status, priority, due_date, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date, tags, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, project_id || null, assigned_to || null, status || 'todo', priority || 'medium', due_date || null, tags || [], req.user.id]
    );

    // Notify assignee
    if (assigned_to && assigned_to !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,'task',$4)`,
        [assigned_to, 'New task assigned', `You've been assigned: ${title}`, `/tasks/${result.rows[0].id}`]
      );
    }

    await pool.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1,'create_task','task',$2,$3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ title, project_id })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  const { title, description, assigned_to, status, priority, due_date, tags } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET
        title=COALESCE($1,title), description=COALESCE($2,description),
        assigned_to=COALESCE($3,assigned_to), status=COALESCE($4,status),
        priority=COALESCE($5,priority), due_date=COALESCE($6,due_date),
        tags=COALESCE($7,tags), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, description, assigned_to, status, priority, due_date, tags, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, requireRole('admin', 'professional'), async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    const withUser = await pool.query(
      `SELECT tc.*, u.name as user_name, u.avatar_initials FROM task_comments tc
       JOIN users u ON u.id = tc.user_id WHERE tc.id=$1`,
      [result.rows[0].id]
    );
    res.status(201).json(withUser.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
