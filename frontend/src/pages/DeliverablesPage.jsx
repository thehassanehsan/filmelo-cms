import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Play, MessageSquare, ExternalLink, Film } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, Avatar, fmtDate, timeAgo, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

// Convert any video/drive link to embeddable URL
const toEmbedUrl = (link) => {
  if (!link) return null;
  // YouTube
  const ytMatch = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vmMatch = link.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  // Google Drive
  const gdMatch = link.match(/\/file\/d\/([^/]+)/);
  if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;
  // Already embed URL
  if (link.includes('/embed/') || link.includes('/preview')) return link;
  return link;
};

const StatusBadge = ({ status }) => {
  const cls = { draft: 'del-status-draft', revision: 'del-status-revision', final: 'del-status-final' };
  return (
    <span className={`badge ${cls[status] || 'del-status-draft'}`} style={{ borderRadius: 99 }}>
      {status}
    </span>
  );
};

const DeliverableForm = ({ initial, clients, projects, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    title: '', client_id: '', project_id: '', video_link: '',
    status: 'draft', revision_number: 1, description: ''
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
        <label className="form-label">Deliverable Title *</label>
        <input className="form-input" value={form.title} onChange={set('title')} required placeholder="Brand Video — Final Cut" />
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
          <label className="form-label">Project</label>
          <select className="form-select" value={form.project_id} onChange={set('project_id')}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Video / File Link</label>
        <input className="form-input" value={form.video_link} onChange={set('video_link')} placeholder="YouTube, Vimeo, or Google Drive share link" />
        <div className="form-hint">Paste a YouTube, Vimeo, or Google Drive link — it will be embedded for the client to preview.</div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="draft">Draft</option>
            <option value="revision">Revision</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Revision Number</label>
          <input className="form-input" type="number" min="1" value={form.revision_number} onChange={set('revision_number')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description / Notes</label>
        <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Changes made in this version, instructions for client review…" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Upload Deliverable')}
        </button>
      </div>
    </form>
  );
};

const DeliverableDetail = ({ deliverable, onClose, currentUser, onUpdate }) => {
  const [remarks, setRemarks] = useState(deliverable.remarks || []);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const embedUrl = toEmbedUrl(deliverable.video_link);

  const postRemark = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/deliverables/${deliverable.id}/remarks`, { content: text.trim() });
      setRemarks(prev => [...prev, r]);
      setText('');
    } catch (err) { toast.error(err.message); }
    finally { setPosting(false); }
  };

  return (
    <div>
      {/* Status row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <StatusBadge status={deliverable.status} />
        <span className="revision-badge">Rev {deliverable.revision_number}</span>
        {deliverable.client_name && <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>Client: <strong style={{ color: 'var(--text2)' }}>{deliverable.client_name}</strong></span>}
        {deliverable.project_title && <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>Project: <strong style={{ color: 'var(--text2)' }}>{deliverable.project_title}</strong></span>}
      </div>

      {/* Description */}
      {deliverable.description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1.1rem' }}>{deliverable.description}</p>
      )}

      {/* Video embed */}
      {embedUrl ? (
        <div style={{ marginBottom: '1.25rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid var(--border)', background: '#000', aspectRatio: '16/9' }}>
          <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Deliverable preview" />
        </div>
      ) : deliverable.video_link ? (
        <a href={deliverable.video_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
          <ExternalLink size={13}/> Open File
        </a>
      ) : (
        <div style={{ background: 'var(--surface2)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', color: 'var(--text3)', marginBottom: '1rem', fontSize: '0.84rem' }}>
          No video link attached yet
        </div>
      )}

      {/* Remarks */}
      <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={14}/> Client Remarks ({remarks.length})
        </div>
        <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: '0.75rem' }}>
          {remarks.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>No remarks yet.</p>
          ) : remarks.map(r => (
            <div key={r.id} className="remark">
              <div className="remark-header">
                <Avatar initials={r.avatar_initials || r.user_name?.[0] || '?'} size="sm" />
                <strong style={{ color: 'var(--text2)' }}>{r.user_name}</strong>
                <span style={{ textTransform: 'capitalize', background: 'var(--surface3)', padding: '1px 6px', borderRadius: 99, fontSize: '0.65rem' }}>{r.user_role}</span>
                <span style={{ marginLeft: 'auto' }}>{timeAgo(r.created_at)}</span>
              </div>
              {r.content}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <textarea
            className="form-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Leave a remark or feedback…"
            rows={2}
            style={{ flex: 1, minHeight: 60, resize: 'none' }}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) postRemark(); }}
          />
          <button className="btn btn-primary" onClick={postRemark} disabled={posting || !text.trim()}>
            {posting ? <Spinner /> : 'Send'}
          </button>
        </div>
        <div className="form-hint" style={{ marginTop: '0.3rem' }}>Ctrl+Enter to send</div>
      </div>
    </div>
  );
};

export const DeliverablesPage = ({ readOnly = false }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, c, p] = await Promise.all([
        api.get('/deliverables'),
        readOnly ? Promise.resolve([]) : api.get('/clients'),
        readOnly ? Promise.resolve([]) : api.get('/projects'),
      ]);
      setItems(d); setClients(c); setProjects(p);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.title?.toLowerCase().includes(q) || d.client_name?.toLowerCase().includes(q);
    const mf = statusFilter === 'all' || d.status === statusFilter;
    return ms && mf;
  });

  const openDetail = async (item) => {
    try {
      const full = await api.get(`/deliverables/${item.id}`);
      setDetail(full);
    } catch { setDetail(item); }
  };

  const handleSave = async (form) => {
    if (modal?.item) {
      const updated = await api.put(`/deliverables/${modal.item.id}`, form);
      setItems(prev => prev.map(d => d.id === updated.id ? updated : d));
      toast.success('Deliverable updated');
    } else {
      const created = await api.post('/deliverables', form);
      setItems(prev => [created, ...prev]);
      toast.success('Deliverable uploaded');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/deliverables/${del.id}`);
    setItems(prev => prev.filter(d => d.id !== del.id));
    toast.success('Deleted');
  };

  const embedUrl = (link) => toEmbedUrl(link);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Deliverables</h1>
          <p className="text-sm text-muted">{items.length} deliverable{items.length !== 1 ? 's' : ''}</p>
        </div>
        {!readOnly && (
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15}/> Upload Deliverable
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <Search size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deliverables…" />
        </div>
        {['all','draft','revision','final'].map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<div className="empty-state-icon"><Film size={24}/></div>}
            title="No deliverables yet"
            description={readOnly ? 'Your deliverables will appear here once uploaded.' : 'Upload a deliverable for a client to review.'}
            action={!readOnly && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> Upload Deliverable</button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.1rem' }}>
          {filtered.map(d => {
            const embed = embedUrl(d.video_link);
            return (
              <div key={d.id} className="deliverable-card">
                {/* Thumbnail / preview */}
                <div className="deliverable-thumb" onClick={() => openDetail(d)}>
                  {embed ? (
                    <>
                      <iframe src={embed} title="preview" tabIndex={-1} />
                      <div className="deliverable-thumb-overlay">
                        <div className="deliverable-play-btn"><Play size={18} fill="currentColor"/></div>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text4)', textAlign: 'center' }}>
                      <Film size={32} strokeWidth={1}/>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>No preview</div>
                    </div>
                  )}
                </div>

                <div className="deliverable-body">
                  <div className="deliverable-title">{d.title}</div>
                  <div className="deliverable-meta">
                    {d.client_name} {d.project_title ? `· ${d.project_title}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <StatusBadge status={d.status} />
                    <span className="revision-badge">Rev {d.revision_number}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openDetail(d)}>
                      <MessageSquare size={12}/> View & Remarks
                    </button>
                    {!readOnly && (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setModal({ item: d })} title="Edit"><Edit2 size={13}/></button>
                        <button className="btn btn-danger btn-icon" onClick={() => setDel(d)} title="Delete"><Trash2 size={13}/></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.item ? 'Edit Deliverable' : 'Upload Deliverable'} size="modal-lg">
        {modal && (
          <DeliverableForm
            initial={modal?.item}
            clients={clients} projects={projects}
            onSave={handleSave} onClose={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Detail + Remarks Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title} size="modal-lg">
        {detail && (
          <DeliverableDetail
            deliverable={detail}
            currentUser={user}
            onClose={() => setDetail(null)}
            onUpdate={(updated) => setItems(prev => prev.map(d => d.id === updated.id ? updated : d))}
          />
        )}
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Deliverable" message={`Delete "${del?.title}"? All remarks will also be deleted.`} danger />
    </>
  );
};
