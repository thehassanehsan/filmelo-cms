import { useState, useEffect } from 'react';
import { Plus, Search, List, LayoutGrid, Edit2, Trash2, CheckSquare, MessageSquare, Calendar } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, PriorityBadge, EmptyState, Spinner, Avatar, fmtDate, toast } from '../../components/ui';

const COLS = [
  { key: 'todo',        label: 'To Do',       dotClass: 'dot-todo' },
  { key: 'in_progress', label: 'In Progress',  dotClass: 'dot-in_progress' },
  { key: 'review',      label: 'Review',       dotClass: 'dot-review' },
  { key: 'done',        label: 'Done',         dotClass: 'dot-done' },
];

const TaskForm = ({ initial, projects, users, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    title: '', description: '', project_id: '', assigned_to: '',
    status: 'todo', priority: 'medium', due_date: '', tags: ''
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await onSave({ ...form, tags, project_id: form.project_id || null, assigned_to: form.assigned_to || null });
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const professionals = users.filter(u => u.role !== 'client');

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Task Title *</label>
        <input className="form-input" value={form.title} onChange={set('title')} required placeholder="Design homepage mockup" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Task details and requirements…" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Project</label>
          <select className="form-select" value={form.project_id} onChange={set('project_id')}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Assign To</label>
          <select className="form-select" value={form.assigned_to} onChange={set('assigned_to')}>
            <option value="">Unassigned</option>
            {professionals.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input className="form-input" type="date" value={form.due_date} onChange={set('due_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input className="form-input" value={form.tags} onChange={set('tags')} placeholder="design, review, client" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Create Task')}
        </button>
      </div>
    </form>
  );
};

const TaskDetail = ({ task, onClose, onStatusChange }) => {
  const [comments, setComments] = useState(task.comments || []);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const c = await api.post(`/tasks/${task.id}/comments`, { content: comment });
      setComments(prev => [...prev, c]);
      setComment('');
    } catch (err) { toast.error(err.message); }
    finally { setPosting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Badge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.due_date && <span style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11}/>{fmtDate(task.due_date)}</span>}
      </div>
      {task.description && <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.7 }}>{task.description}</p>}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {task.project_title && <div style={{ fontSize: '0.78rem' }}><span style={{ color: 'var(--text3)' }}>Project: </span><span style={{ color: 'var(--text2)' }}>{task.project_title}</span></div>}
        {task.assignee_name && <div style={{ fontSize: '0.78rem' }}><span style={{ color: 'var(--text3)' }}>Assigned: </span><span style={{ color: 'var(--text2)' }}>{task.assignee_name}</span></div>}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text3)', marginRight: '0.25rem' }}>Move to:</span>
        {COLS.map(c => c.key !== task.status && (
          <button key={c.key} className="btn btn-secondary btn-sm" onClick={() => onStatusChange(c.key)}>{c.label}</button>
        ))}
      </div>
      <hr className="divider" />
      <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageSquare size={14}/> Comments ({comments.length})
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '0.75rem' }}>
        {comments.length === 0 ? <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>No comments yet</p> : comments.map(c => (
          <div key={c.id} style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Avatar initials={c.avatar_initials || c.user_name?.[0] || '?'} size="sm" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{c.user_name}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text2)', paddingLeft: '2rem', lineHeight: 1.6 }}>{c.content}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input className="form-input" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={e => e.key === 'Enter' && postComment()} style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={postComment} disabled={posting}>{posting ? <Spinner /> : 'Post'}</button>
      </div>
    </div>
  );
};

export const TasksPage = ({ role = 'admin' }) => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('kanban');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, u] = await Promise.all([api.get('/tasks'), api.get('/projects'), api.get('/users')]);
      setTasks(t); setProjects(p); setUsers(u);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    return !q || t.title?.toLowerCase().includes(q) || t.project_title?.toLowerCase().includes(q) || t.assignee_name?.toLowerCase().includes(q);
  });

  const handleSave = async (form) => {
    if (modal?.task) {
      const updated = await api.put(`/tasks/${modal.task.id}`, form);
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      toast.success('Task updated');
    } else {
      const created = await api.post('/tasks', form);
      setTasks(prev => [created, ...prev]);
      toast.success('Task created');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (detail) setDetail(prev => ({ ...prev, status: newStatus }));
    toast.success('Status updated');
  };

  const handleDelete = async () => {
    await api.delete(`/tasks/${del.id}`);
    setTasks(prev => prev.filter(t => t.id !== del.id));
    toast.success('Task deleted');
  };

  const openDetail = async (task) => {
    try {
      const full = await api.get(`/tasks/${task.id}`);
      setDetail(full);
    } catch { setDetail(task); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{role === 'professional' ? 'My Tasks' : 'Tasks'}</h1>
          <p className="text-sm text-muted">{tasks.length} total tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {role !== 'professional' && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15}/> New Task</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <Search size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" />
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
          <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('kanban')}><LayoutGrid size={13}/> Board</button>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}><List size={13}/> List</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
      ) : view === 'kanban' ? (
        <div className="kanban-board">
          {COLS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <div className={`kanban-col-dot ${col.dotClass}`} />
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-col-count">{colTasks.length}</span>
                  {role !== 'professional' && (
                    <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }}
                      onClick={() => setModal({ preStatus: col.key })}><Plus size={12}/></button>
                  )}
                </div>
                <div className="kanban-items">
                  {colTasks.map(t => (
                    <div key={t.id} className="kanban-card" onClick={() => openDetail(t)}>
                      <div className="kanban-card-title">{t.title}</div>
                      {t.project_title && <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: '0.4rem' }}>{t.project_title}</div>}
                      <div className="kanban-card-meta">
                        <PriorityBadge priority={t.priority} />
                        {t.assignee_initials ? <Avatar initials={t.assignee_initials} size="sm" /> : <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Unassigned</span>}
                      </div>
                      {t.due_date && <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10}/>{fmtDate(t.due_date)}</div>}
                    </div>
                  ))}
                  {colTasks.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textAlign: 'center', padding: '0.5rem' }}>No tasks</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <EmptyState icon={<CheckSquare size={40}/>} title="No tasks" description="Create your first task" action={role !== 'professional' && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> New Task</button>} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Task</th><th>Project</th><th>Assigned</th><th>Priority</th><th>Status</th><th>Due</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 500, color: 'var(--text)', cursor: 'pointer' }} onClick={() => openDetail(t)}>{t.title}</div></td>
                      <td style={{ fontSize: '0.8rem' }}>{t.project_title || '—'}</td>
                      <td>
                        {t.assignee_name
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar initials={t.assignee_initials || t.assignee_name[0]} size="sm" /><span style={{ fontSize: '0.82rem' }}>{t.assignee_name}</span></div>
                          : <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>Unassigned</span>}
                      </td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><Badge status={t.status} /></td>
                      <td style={{ fontSize: '0.8rem' }}>{fmtDate(t.due_date)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {role !== 'professional' && <button className="btn btn-ghost btn-icon" onClick={() => setModal({ task: t })}><Edit2 size={13}/></button>}
                          {role !== 'professional' && <button className="btn btn-danger btn-icon" onClick={() => setDel(t)}><Trash2 size={13}/></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.task ? 'Edit Task' : 'New Task'} size="modal-lg">
        {modal && <TaskForm initial={modal?.task ? { ...modal.task, tags: (modal.task.tags || []).join(', ') } : { status: modal?.preStatus || 'todo' }} projects={projects} users={users} onSave={handleSave} onClose={() => setModal(null)} />}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title || 'Task Detail'} size="modal-lg">
        {detail && <TaskDetail task={detail} onClose={() => setDetail(null)} onStatusChange={(s) => handleStatusChange(detail.id, s)} />}
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete} title="Delete Task" message={`Delete "${del?.title}"?`} danger />
    </>
  );
};
