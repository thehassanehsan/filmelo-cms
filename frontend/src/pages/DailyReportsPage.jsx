import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, FolderOpen, ExternalLink, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, Avatar, EmptyState, Spinner, fmtDate, timeAgo, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const ReportForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    tasks_completed: '',
    projects_worked: '',
    drive_links: '',
    notes: '',
    report_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={form.report_date} onChange={set('report_date')} />
      </div>
      <div className="form-group">
        <label className="form-label">Tasks Completed Today</label>
        <textarea className="form-textarea" style={{ minHeight: 90 }} value={form.tasks_completed} onChange={set('tasks_completed')}
          placeholder="List the tasks you completed today, one per line…&#10;- Edited KFC July video&#10;- Color graded Burns Road reel" />
      </div>
      <div className="form-group">
        <label className="form-label">Projects Worked On</label>
        <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.projects_worked} onChange={set('projects_worked')}
          placeholder="Which projects did you work on today?&#10;- KFC July 2026&#10;- Burns Road Kitchen" />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
          <FolderOpen size={13}/> Google Drive Links (optional)
        </label>
        <textarea className="form-textarea" style={{ minHeight: 60 }} value={form.drive_links} onChange={set('drive_links')}
          placeholder="Paste Drive links to deliverables you worked on today…" />
        <div className="form-hint">These links will be embedded in the report for easy access.</div>
      </div>
      <div className="form-group">
        <label className="form-label">Additional Notes</label>
        <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.notes} onChange={set('notes')}
          placeholder="Any blockers, updates, questions for the team…" />
      </div>
      <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner/> : (initial ? 'Save Changes' : 'Submit Report')}
        </button>
      </div>
    </form>
  );
};

const ReportCard = ({ report, isAdmin, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const links = (report.drive_links || '').split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));

  return (
    <div style={{ border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:'0.75rem', background:'var(--surface)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.9rem 1.1rem', cursor:'pointer', background:'var(--surface)' }}
        onClick={() => setExpanded(e => !e)}>
        {isAdmin && <Avatar initials={report.author_initials || report.author_name?.[0] || '?'} size="sm"/>}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, color:'var(--text)', fontSize:'0.875rem' }}>
            {isAdmin ? report.author_name : fmtDate(report.report_date)}
            {isAdmin && <span style={{ color:'var(--text3)', fontWeight:400, fontSize:'0.78rem', marginLeft:'0.5rem' }}>
              {fmtDate(report.report_date)}
            </span>}
          </div>
          {report.tasks_completed && (
            <div style={{ fontSize:'0.72rem', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>
              {report.tasks_completed.split('\n')[0]}
              {report.tasks_completed.split('\n').length > 1 ? ` +${report.tasks_completed.split('\n').length - 1} more` : ''}
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ fontSize:'0.68rem', color:'var(--text3)' }}>{timeAgo(report.created_at)}</span>
          <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); onEdit(report); }} title="Edit"><Edit2 size={13}/></button>
          <button className="btn btn-danger btn-icon" onClick={e => { e.stopPropagation(); onDelete(report); }} title="Delete"><Trash2 size={13}/></button>
          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'1.5px solid var(--border)', padding:'1rem 1.1rem', display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          {report.tasks_completed && (
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>✅ Tasks Completed</div>
              <div style={{ fontSize:'0.84rem', color:'var(--text2)', lineHeight:1.8, whiteSpace:'pre-line' }}>{report.tasks_completed}</div>
            </div>
          )}
          {report.projects_worked && (
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>📁 Projects Worked On</div>
              <div style={{ fontSize:'0.84rem', color:'var(--text2)', lineHeight:1.8, whiteSpace:'pre-line' }}>{report.projects_worked}</div>
            </div>
          )}
          {report.notes && (
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>📝 Notes</div>
              <div style={{ fontSize:'0.84rem', color:'var(--text2)', lineHeight:1.8, whiteSpace:'pre-line' }}>{report.notes}</div>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>🔗 Drive Links</div>
              {links.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm" style={{ display:'inline-flex', marginRight:'0.4rem', marginBottom:'0.4rem' }}>
                  <ExternalLink size={11}/> File {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DailyReportsPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [search, setSearch] = useState('');
  const isAdmin = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try { setReports(await api.get('/dailyreports')); }
    catch (err) { toast.error('Failed to load: ' + err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (modal?.report) {
      const updated = await api.put(`/dailyreports/${modal.report.id}`, form);
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast.success('Report updated');
    } else {
      const created = await api.post('/dailyreports', form);
      setReports(prev => [created, ...prev]);
      toast.success('Report submitted');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/dailyreports/${del.id}`);
    setReports(prev => prev.filter(r => r.id !== del.id));
    toast.success('Deleted');
  };

  // Group by professional for admin view
  const grouped = {};
  const filtered = reports.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.author_name?.toLowerCase().includes(q) || r.tasks_completed?.toLowerCase().includes(q);
  });

  if (isAdmin) {
    filtered.forEach(r => {
      const key = r.user_id || 'unknown';
      if (!grouped[key]) grouped[key] = { name: r.author_name, initials: r.author_initials, reports: [] };
      grouped[key].reports.push(r);
    });
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Daily Reports</h1>
          <p className="text-sm text-muted">{reports.length} reports</p>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15}/> Submit Today's Report
          </button>
        )}
      </div>

      {isAdmin && (
        <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem' }}>
          <div className="search-bar">
            <ClipboardList size={14}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or task…" />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><Spinner/></div>
      ) : reports.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<div className="empty-state-icon"><ClipboardList size={24}/></div>}
            title="No reports yet"
            description={isAdmin ? 'Professionals will submit daily reports here.' : "You haven't submitted any reports yet."}
            action={!isAdmin && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> Submit Report</button>}
          />
        </div>
      ) : isAdmin ? (
        // Admin: grouped by professional
        Object.entries(grouped).map(([uid, g]) => (
          <div key={uid} style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.75rem', paddingBottom:'0.5rem', borderBottom:'1.5px solid var(--border)' }}>
              <Avatar initials={g.initials || g.name?.[0] || '?'} size="md"/>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text)' }}>{g.name}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>{g.reports.length} report{g.reports.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            {g.reports.map(r => (
              <ReportCard key={r.id} report={r} isAdmin={isAdmin}
                onDelete={setDel} onEdit={r => setModal({ report: r })} />
            ))}
          </div>
        ))
      ) : (
        // Professional: own reports
        filtered.map(r => (
          <ReportCard key={r.id} report={r} isAdmin={false}
            onDelete={setDel} onEdit={r => setModal({ report: r })} />
        ))
      )}

      {!isAdmin && (
        <button
          className="btn btn-primary"
          onClick={() => setModal('add')}
          style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', borderRadius:99, boxShadow:'var(--shadow-lg)', zIndex:50 }}>
          <Plus size={15}/> Submit Report
        </button>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.report ? 'Edit Report' : "Today's Report"} size="modal-lg">
        {modal && <ReportForm initial={modal?.report} onSave={handleSave} onClose={() => setModal(null)} />}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete} title="Delete Report" message="Delete this daily report?" danger />
    </>
  );
};
