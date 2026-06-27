const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

// ────── INVOICES ──────
// GET /api/invoices
router.get('/invoices', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, c.company_name as client_name, p.title as project_title
       FROM invoices i
       LEFT JOIN clients c ON c.id = i.client_id
       LEFT JOIN projects p ON p.id = i.project_id
       ORDER BY i.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/invoices', auth, requireRole('admin'), async (req, res) => {
  const { client_id, project_id, amount, due_date, notes } = req.body;
  if (!client_id || !amount) return res.status(400).json({ error: 'Client and amount required' });
  try {
    const count = await pool.query('SELECT COUNT(*) FROM invoices');
    const num = `FM-${String(Number(count.rows[0].count) + 1).padStart(4, '0')}`;
    const result = await pool.query(
      `INSERT INTO invoices (invoice_number, client_id, project_id, amount, due_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [num, client_id, project_id || null, amount, due_date || null, notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/invoices/:id', auth, requireRole('admin'), async (req, res) => {
  const { status, paid_date, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE invoices SET status=COALESCE($1,status), paid_date=COALESCE($2,paid_date), notes=COALESCE($3,notes), updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, paid_date, notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/invoices/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ────── ACTIVITY LOG ──────
router.get('/activity', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role, u.avatar_initials
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ────── NOTIFICATIONS ──────
router.get('/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ────── DASHBOARD STATS ──────
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const [clients, projects, tasks, invoices, teamMembers] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM clients WHERE status=$1', ['active']),
      pool.query("SELECT COUNT(*) FROM projects WHERE status='active'"),
      pool.query("SELECT COUNT(*) FROM tasks WHERE status != 'done'"),
      pool.query("SELECT COALESCE(SUM(amount),0) as total, COUNT(*) FILTER (WHERE status='pending') as pending FROM invoices"),
      pool.query("SELECT COUNT(*) FROM users WHERE role IN ('admin','professional') AND is_active=true")
    ]);

    const recentActivity = await pool.query(
      `SELECT al.*, u.name as user_name, u.avatar_initials FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT 10`
    );

    const tasksByStatus = await pool.query(
      `SELECT status, COUNT(*) FROM tasks GROUP BY status`
    );

    const projectsByStatus = await pool.query(
      `SELECT status, COUNT(*) FROM projects GROUP BY status`
    );

    res.json({
      active_clients: Number(clients.rows[0].count),
      active_projects: Number(projects.rows[0].count),
      open_tasks: Number(tasks.rows[0].count),
      revenue: Number(invoices.rows[0].total),
      pending_invoices: Number(invoices.rows[0].pending),
      team_members: Number(teamMembers.rows[0].count),
      recent_activity: recentActivity.rows,
      tasks_by_status: tasksByStatus.rows,
      projects_by_status: projectsByStatus.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Client dashboard
router.get('/dashboard/client', auth, requireRole('client'), async (req, res) => {
  try {
    const clientResult = await pool.query('SELECT * FROM clients WHERE user_id=$1', [req.user.id]);
    const client = clientResult.rows[0];
    if (!client) return res.json({ projects: [], reports: [], invoices: [] });

    const [projects, reports, invoices] = await Promise.all([
      pool.query('SELECT * FROM projects WHERE client_id=$1 ORDER BY created_at DESC', [client.id]),
      pool.query("SELECT * FROM reports WHERE client_id=$1 AND status='published' ORDER BY created_at DESC LIMIT 5", [client.id]),
      pool.query('SELECT * FROM invoices WHERE client_id=$1 ORDER BY created_at DESC', [client.id])
    ]);

    res.json({
      client,
      projects: projects.rows,
      reports: reports.rows,
      invoices: invoices.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
