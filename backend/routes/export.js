const express = require('express');
const router = express.Router();
const { pool } = require('../db/schema');
const { auth, requireRole } = require('../middleware/auth');

router.get('/monthly', auth, requireRole('admin'), async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });

  const y = parseInt(year), m = parseInt(month);
  const start = `${y}-${String(m).padStart(2,'0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2,'0')}-${lastDay}`;

  try {
    const [clients, projects, tasks, deliverables, reports, invoices,
           dailyReports, sales, accounting, team] = await Promise.all([

      pool.query(`SELECT * FROM clients ORDER BY company_name`),

      pool.query(`
        SELECT p.*, c.company_name as client_name
        FROM projects p LEFT JOIN clients c ON c.id=p.client_id
        ORDER BY p.created_at DESC`),

      pool.query(`
        SELECT t.*,
          p.title as project_title,
          cl.company_name as client_name,
          u.name as assignee_name,
          CASE
            WHEN t.status='done' AND COALESCE(t.monetary_value,0)>0 THEN
              CASE
                WHEN t.due_date IS NULL THEN t.monetary_value
                WHEN (COALESCE(t.completed_at,NOW())::date - t.due_date::date) <= 0 THEN t.monetary_value
                WHEN (COALESCE(t.completed_at,NOW())::date - t.due_date::date) = 1 THEN ROUND(t.monetary_value*0.5,2)
                WHEN (COALESCE(t.completed_at,NOW())::date - t.due_date::date) = 2 THEN ROUND(t.monetary_value*0.25,2)
                ELSE 0
              END
            ELSE 0
          END as earned
        FROM tasks t
        LEFT JOIN projects p ON p.id=t.project_id
        LEFT JOIN clients cl ON cl.id=p.client_id
        LEFT JOIN users u ON u.id=t.assigned_to
        WHERE (t.created_at::date BETWEEN $1 AND $2)
           OR (t.completed_at::date BETWEEN $1 AND $2)
           OR (t.status != 'done' AND t.created_at::date <= $2::date)
        ORDER BY u.name NULLS LAST, t.created_at`, [start, end]),

      pool.query(`
        SELECT d.*, c.company_name as client_name FROM deliverables d
        LEFT JOIN clients c ON c.id=d.client_id
        WHERE d.created_at::date BETWEEN $1 AND $2 ORDER BY d.created_at`, [start, end]),

      pool.query(`
        SELECT r.*, c.company_name as client_name FROM reports r
        LEFT JOIN clients c ON c.id=r.client_id
        WHERE r.created_at::date BETWEEN $1 AND $2 ORDER BY r.created_at`, [start, end]),

      pool.query(`
        SELECT i.*, c.company_name as client_name FROM invoices i
        LEFT JOIN clients c ON c.id=i.client_id
        WHERE i.issued_date BETWEEN $1 AND $2 ORDER BY i.issued_date`, [start, end]),

      pool.query(`
        SELECT dr.*, u.name as author_name FROM daily_reports dr
        LEFT JOIN users u ON u.id=dr.user_id
        WHERE dr.report_date BETWEEN $1 AND $2
        ORDER BY u.name NULLS LAST, dr.report_date DESC`, [start, end]),

      pool.query(`
        SELECT s.*, u.name as assigned_name FROM sales_pipeline s
        LEFT JOIN users u ON u.id=s.assigned_to
        ORDER BY s.created_at DESC`),

      pool.query(`
        SELECT * FROM accounting
        WHERE entry_date BETWEEN $1 AND $2 ORDER BY entry_date`, [start, end]),

      pool.query(`
        SELECT id,name,email,role,is_active,created_at FROM users
        WHERE role!='client' ORDER BY role,name`),
    ]);

    const accSummary = {
      income:  accounting.rows.filter(a=>a.type==='income').reduce((s,a)=>s+Number(a.amount),0),
      expense: accounting.rows.filter(a=>a.type==='expense').reduce((s,a)=>s+Number(a.amount),0),
    };
    accSummary.balance = accSummary.income - accSummary.expense;

    const taskSummary = {
      total: tasks.rows.length,
      done:  tasks.rows.filter(t=>t.status==='done').length,
      totalEarned: tasks.rows.reduce((s,t)=>s+Number(t.earned||0),0),
    };

    res.json({
      period: { year: y, month: m, start, end },
      clients: clients.rows,
      projects: projects.rows,
      tasks: tasks.rows,
      taskSummary,
      deliverables: deliverables.rows,
      reports: reports.rows,
      invoices: invoices.rows,
      dailyReports: dailyReports.rows,
      sales: sales.rows,
      accounting: accounting.rows,
      accSummary,
      team: team.rows,
    });
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
