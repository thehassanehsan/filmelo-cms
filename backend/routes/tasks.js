const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// ⚠️  /earnings/:userId MUST be before /:id
router.get('/earnings/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        p.title as project_title,
        cl.company_name as client_name,
        CASE
          WHEN t.status = 'done' AND t.due_date IS NOT NULL THEN
            GREATEST(0, (COALESCE(t.completed_at, NOW())::date - t.due_date::date))
          ELSE 0
        END as days_late,
        CASE
          WHEN t.status != 'done' THEN 0
          WHEN COALESCE(t.monetary_value, 0) = 0 THEN 0
          WHEN t.due_date IS NULL THEN t.monetary_value
          WHEN (COALESCE(t.completed_at, NOW())::date - t.due_date::date) <= 0 THEN t.monetary_value
          WHEN (COALESCE(t.completed_at, NOW())::date - t.due_date::date) = 1 THEN ROUND(t.monetary_value * 0.5, 2)
          WHEN (COALESCE(t.completed_at, NOW())::date - t.due_date::date) = 2 THEN ROUND(t.monetary_value * 0.25, 2)
          ELSE 0
        END as earned
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN clients cl ON cl.id = p.client_id
      WHERE t.assigned_to = $1
      ORDER BY t.updated_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Earnings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  const { project_id, assigned_to, status } = req.query;
  try {
    let conditions = [], params = [], idx = 1;
    if (project_id)  { conditions.push(`t.project_id=$${idx++}`);  params.push(project_id); }
    if (assigned_to) { conditions.push(`t.assigned_to=$${idx++}`); params.push(assigned_to); }
    if (status)      { conditions.push(`t.status=$${idx++}`);       params.push(status); }
    if (req.user.role === 'professional') {
      conditions.push(`t.assigned_to=$${idx++}`);
      params.push(req.user.id);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await pool.query(`
      SELECT t.*,
        p.title as project_title,
        cl.company_name as client_name,
        cl.color as client_color,
        u.name as assignee_name,
        u.avatar_initials as assignee_initials,
        cr.name as creator_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN clients cl ON cl.id = p.client_id
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cr ON cr.id = t.created_by
      ${where}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Tasks GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.title as project_title,
        u.name as assignee_name, u.avatar_initials as assignee_initials
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    const comments = await pool.query(`
      SELECT tc.*, u.name as user_name, u.avatar_initials
      FROM task_comments tc JOIN users u ON u.id = tc.user_id
      WHERE tc.task_id = $1 ORDER BY tc.created_at ASC
    `, [req.params.id]);
    res.json({ ...result.rows[0], comments: comments.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', auth, requireRole('admin', 'professional'), async (req, res) => {
  const { title, description, notes, project_id, assigned_to, status, priority, due_date, tags, monetary_value } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(`
      INSERT INTO tasks (title,description,notes,project_id,assigned_to,status,priority,due_date,tags,monetary_value,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [title, description||null, notes||null, project_id||null, assigned_to||null,
        status||'todo', priority||'medium', due_date||null, tags||[], monetary_value||0, req.user.id]);

    if (assigned_to && assigned_to !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id,title,message,type,link) VALUES ($1,$2,$3,'task','/professional/tasks')`,
        [assigned_to, 'New task assigned', `You've been assigned: ${title}`]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Task POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  const { title, description, notes, assigned_to, status, priority, due_date, tags, monetary_value } = req.body;
  try {
    // Set completed_at when first marked done
    let completedAt = null;
    if (status === 'done') {
      const existing = await pool.query('SELECT status, completed_at FROM tasks WHERE id=$1', [req.params.id]);
      if (existing.rows[0]?.status !== 'done' && !existing.rows[0]?.completed_at) {
        completedAt = new Date().toISOString();
      }
    }

    const result = await pool.query(`
      UPDATE tasks SET
        title=COALESCE($1,title),
        description=COALESCE($2,description),
        notes=COALESCE($3,notes),
        assigned_to=COALESCE($4,assigned_to),
        status=COALESCE($5,status),
        priority=COALESCE($6,priority),
        due_date=COALESCE($7,due_date),
        tags=COALESCE($8,tags),
        monetary_value=COALESCE($9,monetary_value),
        completed_at=COALESCE($10::timestamptz, completed_at),
        updated_at=NOW()
      WHERE id=$11 RETURNING *
    `, [title, description, notes, assigned_to, status, priority, due_date, tags,
        monetary_value, completedAt, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Task PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const r = await pool.query(
      `INSERT INTO task_comments (task_id,user_id,content) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    const full = await pool.query(
      `SELECT tc.*, u.name as user_name, u.avatar_initials FROM task_comments tc JOIN users u ON u.id=tc.user_id WHERE tc.id=$1`,
      [r.rows[0].id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
