import { useState } from 'react';
import { Download, FileText, Loader, Calendar } from 'lucide-react';
import { api } from '../../utils/api';
import { Spinner, toast, fmtDate, fmtCurrency } from '../../components/ui';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const buildReportHTML = (data) => {
  const { period, clients, projects, tasks, taskSummary, deliverables, reports, invoices, dailyReports, sales, accounting, accSummary, team, activity } = data;
  const monthName = MONTHS[period.month - 1];
  const generatedOn = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  const fmt = (n) => n != null ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0}).format(n) : '—';
  const fd = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const esc = (s) => (s || '').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const sectionHeader = (title, count) => `
    <div class="section-header">
      <h2>${title}</h2>
      <span class="count-badge">${count}</span>
    </div>`;

  const clientsHTML = clients.map(c => `
    <tr>
      <td><strong>${esc(c.company_name)}</strong></td>
      <td>${esc(c.contact_name) || '—'}</td>
      <td>${esc(c.industry) || '—'}</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td>${fd(c.created_at)}</td>
    </tr>`).join('');

  const projectsHTML = projects.map(p => `
    <tr>
      <td><strong>${esc(p.title)}</strong>${p.tags?.length ? `<div class="tags">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}</td>
      <td>${esc(p.client_name) || '—'}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>${esc(p.priority)}</td>
      <td>${fd(p.due_date)}</td>
      <td>${p.budget ? fmt(p.budget) : '—'}</td>
    </tr>`).join('');

  // Group tasks by assignee
  const tasksByPerson = {};
  tasks.forEach(t => {
    const key = t.assignee_name || 'Unassigned';
    if (!tasksByPerson[key]) tasksByPerson[key] = [];
    tasksByPerson[key].push(t);
  });

  const tasksHTML = Object.entries(tasksByPerson).map(([person, ptasks]) => {
    const personEarned = ptasks.reduce((s,t)=>s+Number(t.earned||0),0);
    const personDone = ptasks.filter(t=>t.status==='done').length;
    return `
    <div class="person-block">
      <div class="person-header">
        <strong>${esc(person)}</strong>
        <span>${personDone}/${ptasks.length} completed · ${fmt(personEarned)} earned</span>
      </div>
      <table>
        <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Due</th><th>Value</th><th>Earned</th></tr></thead>
        <tbody>
          ${ptasks.map(t => `
            <tr>
              <td>${esc(t.title)}</td>
              <td>${esc(t.project_title)||'—'}</td>
              <td><span class="badge badge-${t.status}">${t.status.replace('_',' ')}</span></td>
              <td>${fd(t.due_date)}</td>
              <td>${t.monetary_value>0?fmt(t.monetary_value):'—'}</td>
              <td class="earned-cell">${t.status==='done'?fmt(t.earned):'—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('');

  const deliverablesHTML = deliverables.map(d => `
    <tr>
      <td><strong>${esc(d.title)}</strong></td>
      <td>${esc(d.client_name)||'—'}</td>
      <td><span class="badge badge-${d.status}">${d.status}</span></td>
      <td>Rev ${d.revision_number}</td>
      <td>${fd(d.created_at)}</td>
    </tr>`).join('');

  const invoicesHTML = invoices.map(i => `
    <tr>
      <td><strong>${esc(i.invoice_number)}</strong></td>
      <td>${esc(i.client_name)||'—'}</td>
      <td><span class="badge badge-${i.status}">${i.status}</span></td>
      <td>${fmt(i.amount)}</td>
      <td>${fd(i.issued_date)}</td>
      <td>${fd(i.due_date)}</td>
    </tr>`).join('');

  const dailyReportsByPerson = {};
  dailyReports.forEach(r => {
    const key = r.author_name || 'Unknown';
    if (!dailyReportsByPerson[key]) dailyReportsByPerson[key] = [];
    dailyReportsByPerson[key].push(r);
  });

  const dailyReportsHTML = Object.entries(dailyReportsByPerson).map(([person, reps]) => `
    <div class="person-block">
      <div class="person-header"><strong>${esc(person)}</strong><span>${reps.length} report(s)</span></div>
      ${reps.map(r => `
        <div class="daily-report-card">
          <div class="dr-date">${fd(r.report_date)}</div>
          ${r.tasks_completed ? `<div class="dr-field"><span class="dr-label">Tasks:</span> ${esc(r.tasks_completed)}</div>` : ''}
          ${r.projects_worked ? `<div class="dr-field"><span class="dr-label">Projects:</span> ${esc(r.projects_worked)}</div>` : ''}
          ${r.notes ? `<div class="dr-field"><span class="dr-label">Notes:</span> ${esc(r.notes)}</div>` : ''}
        </div>`).join('')}
    </div>`).join('');

  const salesHTML = sales.map(s => `
    <tr>
      <td><strong>${esc(s.company_name)}</strong></td>
      <td>${esc(s.contact_name)||'—'}</td>
      <td><span class="badge badge-stage">${s.stage.replace('_',' ')}</span></td>
      <td>${esc(s.package)||'—'}</td>
      <td>${s.value?fmt(s.value):'—'}</td>
      <td>${esc(s.assigned_name)||'—'}</td>
    </tr>`).join('');

  const accountingHTML = accounting.map(a => `
    <tr>
      <td>${fd(a.entry_date)}</td>
      <td><span class="badge badge-${a.type==='income'?'active':'cancelled'}">${a.type}</span></td>
      <td>${esc(a.category)||'—'}</td>
      <td>${esc(a.description)||'—'}</td>
      <td class="${a.type==='income'?'income-amt':'expense-amt'}">${fmt(a.amount)}</td>
    </tr>`).join('');

  const teamHTML = team.map(t => `
    <tr>
      <td><strong>${esc(t.name)}</strong></td>
      <td>${esc(t.email)}</td>
      <td style="text-transform:capitalize">${t.role}</td>
      <td>${t.is_active!==false?'Active':'Inactive'}</td>
      <td>${fd(t.created_at)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Filmelo Media — ${monthName} ${period.year} Report</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 10.5px; line-height: 1.5; margin:0; }
  
  .cover { text-align:center; padding: 80px 20px; page-break-after: always; }
  .cover-logo { width:90px; height:90px; background:#0D4F55; border-radius:18px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:24px; }
  .cover-logo span { font-family:'Helvetica Neue',sans-serif; font-weight:800; font-size:32px; color:#D4E800; }
  .cover h1 { font-size: 32px; margin: 0 0 8px; color:#0D4F55; }
  .cover .period { font-size: 20px; color:#666; margin-bottom: 40px; }
  .cover .meta { font-size: 12px; color: #999; }
  .cover-stats { display:flex; justify-content:center; gap:24px; margin-top: 50px; flex-wrap:wrap; }
  .cover-stat { background:#f4f6f8; border-radius:12px; padding:20px 28px; min-width:140px; }
  .cover-stat .val { font-size:22px; font-weight:800; color:#0D4F55; }
  .cover-stat .lbl { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:0.06em; margin-top:4px; }

  .section { page-break-inside: avoid; margin-bottom: 28px; }
  .section-header { display:flex; align-items:center; gap:10px; border-bottom: 2px solid #0D4F55; padding-bottom:6px; margin-bottom:12px; margin-top: 24px; }
  .section-header h2 { font-size: 16px; color:#0D4F55; margin:0; }
  .count-badge { background:#D4E800; color:#093B40; font-size:10px; font-weight:700; padding:2px 9px; border-radius:99px; }

  table { width:100%; border-collapse: collapse; margin-bottom:10px; font-size: 9.5px; }
  th { background:#f4f6f8; text-align:left; padding:6px 8px; font-size:8px; text-transform:uppercase; letter-spacing:0.05em; color:#666; border-bottom:1.5px solid #ddd; }
  td { padding:6px 8px; border-bottom:1px solid #eee; vertical-align:top; }
  tr:last-child td { border-bottom: none; }

  .badge { display:inline-block; padding:1px 7px; border-radius:99px; font-size:8px; font-weight:700; text-transform:capitalize; }
  .badge-active, .badge-done, .badge-paid, .badge-published { background:#e6f4ea; color:#0a7a3c; }
  .badge-pending, .badge-todo, .badge-draft { background:#fef3c7; color:#92600a; }
  .badge-in_progress { background:#dbeafe; color:#1e40af; }
  .badge-review { background:#fed7aa; color:#9a3412; }
  .badge-inactive, .badge-cancelled { background:#fce7f3; color:#9d174d; }
  .badge-paused, .badge-prospect { background:#e0e7ff; color:#3730a3; }
  .badge-stage { background:#ede9fe; color:#5b21b6; }

  .tags { margin-top:3px; }
  .tag { display:inline-block; background:#f0f0f0; border-radius:99px; padding:1px 6px; font-size:7.5px; color:#666; margin-right:3px; }

  .person-block { margin-bottom: 16px; border:1px solid #eee; border-radius:8px; overflow:hidden; page-break-inside: avoid; }
  .person-header { background:#0D4F55; color:#fff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; font-size:10.5px; }
  .person-header span { font-size: 9px; opacity: 0.85; }
  .person-block table { margin-bottom:0; }
  .earned-cell { font-weight:700; color:#0a7a3c; }

  .daily-report-card { padding:10px 12px; border-bottom:1px solid #f0f0f0; }
  .daily-report-card:last-child { border-bottom:none; }
  .dr-date { font-weight:700; font-size:9.5px; color:#0D4F55; margin-bottom:4px; }
  .dr-field { font-size:9px; margin-bottom:2px; color:#444; }
  .dr-label { font-weight:700; color:#666; }

  .income-amt { color:#0a7a3c; font-weight:700; }
  .expense-amt { color:#9d174d; font-weight:700; }

  .summary-grid { display:flex; gap:14px; margin-bottom: 16px; flex-wrap:wrap; }
  .summary-card { flex:1; min-width:130px; background:#f4f6f8; border-radius:10px; padding:12px 16px; }
  .summary-card .val { font-size:18px; font-weight:800; color:#0D4F55; }
  .summary-card .lbl { font-size:9px; color:#888; text-transform:uppercase; margin-top:2px; }

  .empty-note { color:#999; font-size:9.5px; font-style:italic; padding: 10px 0; }

  .footer-note { text-align:center; font-size:8.5px; color:#999; margin-top: 40px; padding-top: 16px; border-top:1px solid #eee; }

  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-logo"><span>FM</span></div>
  <h1>Filmelo Media</h1>
  <div class="period">${monthName} ${period.year} — Monthly Report</div>
  <div class="meta">Generated on ${generatedOn} · Confidential — Internal Use Only</div>

  <div class="cover-stats">
    <div class="cover-stat"><div class="val">${clients.length}</div><div class="lbl">Clients</div></div>
    <div class="cover-stat"><div class="val">${projects.length}</div><div class="lbl">Projects</div></div>
    <div class="cover-stat"><div class="val">${taskSummary.total}</div><div class="lbl">Tasks</div></div>
    <div class="cover-stat"><div class="val">${fmt(accSummary.income)}</div><div class="lbl">Revenue</div></div>
    <div class="cover-stat"><div class="val">${fmt(accSummary.balance)}</div><div class="lbl">Net Profit</div></div>
  </div>
</div>

<!-- FINANCIAL SUMMARY -->
${sectionHeader('Financial Summary', accounting.length)}
<div class="summary-grid">
  <div class="summary-card"><div class="val">${fmt(accSummary.income)}</div><div class="lbl">Total Income</div></div>
  <div class="summary-card"><div class="val">${fmt(accSummary.expense)}</div><div class="lbl">Total Expenses</div></div>
  <div class="summary-card"><div class="val">${fmt(accSummary.balance)}</div><div class="lbl">Net Balance</div></div>
  <div class="summary-card"><div class="val">${fmt(taskSummary.totalEarned)}</div><div class="lbl">Professional Payouts</div></div>
</div>
${accounting.length ? `<table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${accountingHTML}</tbody></table>` : '<div class="empty-note">No accounting entries this period.</div>'}

<!-- CLIENTS -->
${sectionHeader('Clients', clients.length)}
${clients.length ? `<table><thead><tr><th>Company</th><th>Contact</th><th>Industry</th><th>Status</th><th>Added</th></tr></thead><tbody>${clientsHTML}</tbody></table>` : '<div class="empty-note">No clients on record.</div>'}

<!-- PROJECTS -->
${sectionHeader('Projects', projects.length)}
${projects.length ? `<table><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Budget</th></tr></thead><tbody>${projectsHTML}</tbody></table>` : '<div class="empty-note">No projects this period.</div>'}

<!-- TASKS BY PROFESSIONAL -->
${sectionHeader('Tasks & Earnings by Team Member', taskSummary.total)}
<div class="summary-grid">
  <div class="summary-card"><div class="val">${taskSummary.done}</div><div class="lbl">Completed</div></div>
  <div class="summary-card"><div class="val">${taskSummary.total - taskSummary.done}</div><div class="lbl">Open</div></div>
  <div class="summary-card"><div class="val">${fmt(taskSummary.totalEarned)}</div><div class="lbl">Total Earned</div></div>
</div>
${taskSummary.total ? tasksHTML : '<div class="empty-note">No tasks this period.</div>'}

<!-- DELIVERABLES -->
${sectionHeader('Deliverables', deliverables.length)}
${deliverables.length ? `<table><thead><tr><th>Title</th><th>Client</th><th>Status</th><th>Revision</th><th>Date</th></tr></thead><tbody>${deliverablesHTML}</tbody></table>` : '<div class="empty-note">No deliverables this period.</div>'}

<!-- DAILY REPORTS -->
${sectionHeader('Daily Reports', dailyReports.length)}
${dailyReports.length ? dailyReportsHTML : '<div class="empty-note">No daily reports submitted this period.</div>'}

<!-- INVOICES -->
${sectionHeader('Invoices', invoices.length)}
${invoices.length ? `<table><thead><tr><th>Invoice #</th><th>Client</th><th>Status</th><th>Amount</th><th>Issued</th><th>Due</th></tr></thead><tbody>${invoicesHTML}</tbody></table>` : '<div class="empty-note">No invoices this period.</div>'}

<!-- SALES PIPELINE -->
${sectionHeader('Sales Pipeline', sales.length)}
${sales.length ? `<table><thead><tr><th>Company</th><th>Contact</th><th>Stage</th><th>Package</th><th>Value</th><th>Assigned</th></tr></thead><tbody>${salesHTML}</tbody></table>` : '<div class="empty-note">No active deals this period.</div>'}

<!-- TEAM -->
${sectionHeader('Team Roster', team.length)}
${team.length ? `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>${teamHTML}</tbody></table>` : '<div class="empty-note">No team members.</div>'}

<div class="footer-note">
  Filmelo Media — Agency Management System · This document was generated automatically and contains confidential business data.
</div>

</body>
</html>`;
};

export const ExportPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const generate = async (openPreview = false) => {
    setLoading(true);
    try {
      const data = await api.get(`/export/monthly?year=${year}&month=${month}`);
      const html = buildReportHTML(data);

      if (openPreview) {
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        toast.success('Report opened — use your browser\'s Print → Save as PDF to download');
      } else {
        // Download as HTML file directly
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Filmelo-Report-${MONTHS[month-1]}-${year}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded — open it and Print → Save as PDF');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Monthly Export</h1>
          <p className="text-sm text-muted">Download a complete record of clients, projects, tasks, revenue and more</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-header">
          <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <FileText size={18}/> Generate Report
          </div>
        </div>

        <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: 1.7 }}>
          This creates one complete document containing every client, project, task (grouped by professional with earnings), deliverable, daily report, invoice, sales pipeline entry, and financial transaction for the selected month — formatted for printing or archiving.
        </p>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => generate(true)} disabled={loading} style={{ flex: 1 }}>
            {loading ? <Spinner /> : <><FileText size={15}/> Preview & Print</>}
          </button>
          <button className="btn btn-secondary" onClick={() => generate(false)} disabled={loading} style={{ flex: 1 }}>
            {loading ? <Spinner /> : <><Download size={15}/> Download File</>}
          </button>
        </div>

        <div style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.85rem 1rem', marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text3)' }}>
          <strong style={{ color: 'var(--text2)' }}>How to save as PDF:</strong>
          <ol style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: 2 }}>
            <li>Click <strong>"Preview & Print"</strong> — a new tab opens with the full report</li>
            <li>Press <strong>Ctrl+P</strong> (or Cmd+P on Mac)</li>
            <li>In the print dialog, set Destination to <strong>"Save as PDF"</strong></li>
            <li>Click Save — you now have a permanent PDF record</li>
          </ol>
        </div>
      </div>
    </>
  );
};
