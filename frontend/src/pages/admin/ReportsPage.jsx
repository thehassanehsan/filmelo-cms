import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText, Eye, Send, ExternalLink, FolderOpen } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, fmtDate, toast } from '../../components/ui';

const DriveEmbed = ({ link }) => {
  if (!link) return null;
  // Convert Google Drive share link to embed link
  let embedUrl = link;
  if (link.includes('drive.google.com/file/d/')) {
    const match = link.match(/\/file\/d\/([^/]+)/);
    if (match) embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
  } else if (link.includes('docs.google.com')) {
    embedUrl = link.includes('/pub') ? link : link.replace('/edit', '/preview').replace('/view', '/preview');
  } else if (link.includes('drive.google.com/open?id=')) {
    const id = new URL(link).searchParams.get('id');
    if (id) embedUrl = `https://drive.google.com/file/d/${id}/preview`;
  }
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <FolderOpen size={13}/> Google Drive
      </div>
      <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: 420, border: 'none', display: 'block' }}
          allow="autoplay"
          title="Google Drive Embed"
        />
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer"
        className="btn btn-secondary btn-sm"
        style={{ marginTop: '0.5rem', display: 'inline-flex' }}>
        <ExternalLink size={12}/> Open in Google Drive
      </a>
    </div>
  );
};

const ReportForm = ({ initial, clients, projects, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    title: '', type: 'monthly', client_id: '', project_id: '',
    summary: '', period_start: '', period_end: '', status: 'draft', drive_link: '',
    content: { impressions: '', reach: '', clicks: '', conversions: '', spend: '', notes: '' }
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setC = k => e => setForm(f => ({ ...f, content: { ...f.content, [k]: e.target.value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Report Title *</label>
        <input className="form-input" value={form.title} onChange={set('title')} required placeholder="June 2025 — Monthly Performance Report" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={set('type')}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="campaign">Campaign</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published (notifies client)</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Client *</label>
          <select className="form-select" value={form.client_id} onChange={set('client_id')} required>
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Project (optional)</label>
          <select className="form-select" value={form.project_id} onChange={set('project_id')}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Period Start</label>
          <input className="form-input" type="date" value={form.period_start} onChange={set('period_start')} />
        </div>
        <div className="form-group">
          <label className="form-label">Period End</label>
          <input className="form-input" type="date" value={form.period_end} onChange={set('period_end')} />
        </div>
      </div>

      {/* Google Drive Link */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderOpen size={13}/> Google Drive Link (optional)
        </label>
        <input className="form-input" value={form.drive_link} onChange={set('drive_link')} placeholder="https://drive.google.com/file/d/..." />
        <div className="form-hint">Paste any Google Drive share link — it will be embedded directly in the report.</div>
      </div>

      {/* Metrics */}
      <div style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Performance Metrics</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Impressions</label>
            <input className="form-input" value={form.content.impressions} onChange={setC('impressions')} placeholder="125,000" />
          </div>
          <div className="form-group">
            <label className="form-label">Reach</label>
            <input className="form-input" value={form.content.reach} onChange={setC('reach')} placeholder="82,000" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Clicks</label>
            <input className="form-input" value={form.content.clicks} onChange={setC('clicks')} placeholder="3,400" />
          </div>
          <div className="form-group">
            <label className="form-label">Conversions</label>
            <input className="form-input" value={form.content.conversions} onChange={setC('conversions')} placeholder="120" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ad Spend (USD)</label>
            <input className="form-input" value={form.content.spend} onChange={setC('spend')} placeholder="1,500" />
          </div>
          <div className="form-group" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Campaign Notes</label>
          <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.content.notes} onChange={setC('notes')} placeholder="Key highlights, wins, areas for improvement…" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Executive Summary</label>
        <textarea className="form-textarea" value={form.summary} onChange={set('summary')} placeholder="Brief summary visible to the client on their dashboard…" />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Create Report')}
        </button>
      </div>
    </form>
  );
};

const ReportView = ({ report }) => {
  const c = report.content || {};
  const metrics = [
    { label: 'Impressions', value: c.impressions },
    { label: 'Reach', value: c.reach },
    { label: 'Clicks', value: c.clicks },
    { label: 'Conversions', value: c.conversions },
    { label: 'Ad Spend', value: c.spend ? `$${c.spend}` : null },
  ].filter(m => m.value);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Badge status={report.status} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'capitalize' }}>{report.type} report</span>
        {report.period_start && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{fmtDate(report.period_start)} – {fmtDate(report.period_end)}</span>}
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: '1rem' }}>
        {report.client_name && <span>Client: <strong style={{ color: 'var(--text2)' }}>{report.client_name}</strong></span>}
        {report.project_title && <span style={{ marginLeft: '1rem' }}>Project: <strong style={{ color: 'var(--text2)' }}>{report.project_title}</strong></span>}
      </div>
      {metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {metrics.map(m => (
            <div key={m.label} style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{m.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: '0.15rem' }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}
      {c.notes && (
        <div style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Campaign Notes</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7 }}>{c.notes}</p>
        </div>
      )}
      {report.summary && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Executive Summary</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7 }}>{report.summary}</p>
        </div>
      )}
      {/* Google Drive Embed */}
      <DriveEmbed link={report.drive_link} />
    </div>
  );
};

export const ReportsPage = ({ readOnly = false }) => {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, c, p] = await Promise.all([api.get('/reports'), api.get('/clients'), api.get('/projects')]);
      setReports(r); setClients(c); setProjects(p);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return !q || r.title?.toLowerCase().includes(q) || r.client_name?.toLowerCase().includes(q);
  });

  const handleSave = async (form) => {
    if (modal?.report) {
      const updated = await api.put(`/reports/${modal.report.id}`, form);
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast.success('Report updated');
    } else {
      const created = await api.post('/reports', form);
      setReports(prev => [created, ...prev]);
      toast.success('Report created');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/reports/${del.id}`);
    setReports(prev => prev.filter(r => r.id !== del.id));
    toast.success('Report deleted');
  };

  const publish = async (report) => {
    const updated = await api.put(`/reports/${report.id}`, { status: 'published' });
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    toast.success('Report published — client notified');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports</h1>
          <p className="text-sm text-muted">{reports.length} reports</p>
        </div>
        {!readOnly && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15}/> New Report</button>}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="search-bar">
          <Search size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<div className="empty-state-icon"><FileText size={24}/></div>} title="No reports yet" description={readOnly ? 'Published reports will appear here.' : 'Create your first report for a client.'} action={!readOnly && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> New Report</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Client</th><th>Type</th><th>Period</th><th>Drive</th><th>Status</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.title}</div></td>
                    <td style={{ fontSize: '0.82rem' }}>{r.client_name || '—'}</td>
                    <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{r.type}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{r.period_start ? `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}` : '—'}</td>
                    <td>
                      {r.drive_link
                        ? <a href={r.drive_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}><FolderOpen size={12}/> Drive</a>
                        : <span style={{ color: 'var(--text4)', fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td><Badge status={r.status} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{fmtDate(r.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setView(r)} title="View"><Eye size={13}/></button>
                        {!readOnly && <button className="btn btn-ghost btn-icon" onClick={() => setModal({ report: r })} title="Edit"><Edit2 size={13}/></button>}
                        {!readOnly && r.status === 'draft' && <button className="btn btn-ghost btn-icon" style={{ color: 'var(--teal)' }} onClick={() => publish(r)} title="Publish to client"><Send size={13}/></button>}
                        {!readOnly && <button className="btn btn-danger btn-icon" onClick={() => setDel(r)} title="Delete"><Trash2 size={13}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.report ? 'Edit Report' : 'New Report'} size="modal-lg">
        {modal && (
          <ReportForm
            initial={modal?.report ? { ...modal.report, content: modal.report.content || {}, drive_link: modal.report.drive_link || '' } : undefined}
            clients={clients} projects={projects}
            onSave={handleSave} onClose={() => setModal(null)}
          />
        )}
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title} size="modal-lg">
        {view && <ReportView report={view} />}
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete} title="Delete Report" message={`Delete "${del?.title}"? This cannot be undone.`} danger />
    </>
  );
};
