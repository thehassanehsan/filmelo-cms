import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Briefcase, Users, Calendar } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, PriorityBadge, EmptyState, Spinner, ProgressBar, fmtDate, fmtCurrency, toast } from '../../components/ui';

const ProjectForm = ({ initial, clients, users, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    title: '', description: '', client_id: '', status: 'active', priority: 'medium',
    start_date: '', due_date: '', budget: '', member_ids: []
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter(x => x !== id) : [...f.member_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...form, budget: form.budget || null });
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const professionals = users.filter(u => u.role === 'admin' || u.role === 'professional');

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Project Title *</label>
        <input className="form-input" value={form.title} onChange={set('title')} required placeholder="Q4 Social Media Campaign" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Project overview and goals…" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Client</label>
          <select className="form-select" value={form.client_id} onChange={set('client_id')}>
            <option value="">No client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Budget (USD)</label>
          <input className="form-input" type="number" value={form.budget} onChange={set('budget')} placeholder="5000" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input className="form-input" type="date" value={form.due_date} onChange={set('due_date')} />
        </div>
      </div>
      {!initial && professionals.length > 0 && (
        <div className="form-group">
          <label className="form-label">Team Members</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0' }}>
            {professionals.map(u => (
              <button
                key={u.id} type="button"
                className={`btn btn-sm ${form.member_ids.includes(u.id) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleMember(u.id)}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Create Project')}
        </button>
      </div>
    </form>
  );
};

export const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, u] = await Promise.all([api.get('/projects'), api.get('/clients'), api.get('/users')]);
      setProjects(p); setClients(c); setUsers(u);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const ms = !q || p.title?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q);
    const mf = filter === 'all' || p.status === filter;
    return ms && mf;
  });

  const handleSave = async (form) => {
    if (modal?.project) {
      const updated = await api.put(`/projects/${modal.project.id}`, form);
      setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      toast.success('Project updated');
    } else {
      const created = await api.post('/projects', form);
      setProjects(prev => [created, ...prev]);
      toast.success('Project created');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/projects/${del.id}`);
    setProjects(prev => prev.filter(p => p.id !== del.id));
    toast.success('Project deleted');
  };

  const budgetPct = p => p.budget ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Projects</h1>
          <p className="text-sm text-muted">{projects.length} total projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15}/> New Project</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" />
        </div>
        {['all','active','paused','completed','cancelled'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<Briefcase size={40}/>} title="No projects found" description="Create your first project to get started" action={<button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> New Project</button>} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{p.client_name || 'No client'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => setModal({ project: p })}><Edit2 size={13}/></button>
                  <button className="btn btn-danger btn-icon" onClick={() => setDel(p)}><Trash2 size={13}/></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                <Badge status={p.status} />
                <PriorityBadge priority={p.priority} />
              </div>
              {p.budget && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.3rem' }}>
                    <span>Budget</span>
                    <span>{fmtCurrency(p.spent || 0)} / {fmtCurrency(p.budget)}</span>
                  </div>
                  <ProgressBar value={p.spent || 0} max={p.budget} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text3)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11}/> {p.due_date ? fmtDate(p.due_date) : 'No deadline'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.project ? 'Edit Project' : 'New Project'} size="modal-lg">
        {modal && <ProjectForm initial={modal?.project} clients={clients} users={users} onSave={handleSave} onClose={() => setModal(null)} />}
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete} title="Delete Project" message={`Delete "${del?.title}"? This will also remove all tasks in this project.`} danger />
    </>
  );
};
