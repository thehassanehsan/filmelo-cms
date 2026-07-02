import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Briefcase, ChevronRight, X, Calendar, Tag, Users } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, PriorityBadge, EmptyState, Spinner, ProgressBar, fmtDate, fmtCurrency, toast, Avatar } from '../../components/ui';

const ProjectForm = ({ initial, clients, users, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { title:'', description:'', notes:'', client_id:'', status:'active', priority:'medium', start_date:'', due_date:'', budget:'', tags:'', member_ids:[] });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleMember = id => setForm(f => ({
    ...f, member_ids: f.member_ids?.includes(id) ? f.member_ids.filter(x=>x!==id) : [...(f.member_ids||[]), id]
  }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
      await onSave({ ...form, tags, budget: form.budget||null });
      onClose();
    } catch(err) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={set('title')} required placeholder="KFC July 2026 Campaign" /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Project overview…" /></div>
      <div className="form-group"><label className="form-label">Notes (internal)</label><textarea className="form-textarea" style={{minHeight:70}} value={form.notes} onChange={set('notes')} placeholder="Internal notes, strategy, reminders…" /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Client</label>
          <select className="form-select" value={form.client_id} onChange={set('client_id')}>
            <option value="">No client</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option><option value="paused">Paused</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Budget (USD)</label><input className="form-input" type="number" value={form.budget} onChange={set('budget')} placeholder="5000" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={set('due_date')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input className="form-input" value={form.tags} onChange={set('tags')} placeholder="video, social, ads" /></div>
      {!initial && (
        <div className="form-group"><label className="form-label">Assign Team Members</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',paddingTop:'0.3rem'}}>
            {users.filter(u=>u.role!=='client').map(u=>(
              <button key={u.id} type="button"
                className={`btn btn-sm ${(form.member_ids||[]).includes(u.id)?'btn-primary':'btn-secondary'}`}
                onClick={()=>toggleMember(u.id)}>{u.name}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'0.5rem'}}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading?<Spinner />:(initial?'Save':'Create Project')}</button>
      </div>
    </form>
  );
};

// Project detail view with tasks inside
const ProjectDetail = ({ project, users, onClose, onTaskCreated }) => {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title:'', assigned_to:'', priority:'medium', due_date:'', monetary_value:'', description:'' });
  const [saving, setSaving] = useState(false);
  const setT = k => e => setTaskForm(f=>({...f,[k]:e.target.value}));

  useEffect(() => {
    api.get(`/tasks?project_id=${project.id}`).then(setTasks).catch(()=>{}).finally(()=>setLoadingTasks(false));
  }, [project.id]);

  const addTask = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const t = await api.post('/tasks', { ...taskForm, project_id: project.id, monetary_value: taskForm.monetary_value||0 });
      setTasks(prev=>[...prev, t]);
      setTaskForm({ title:'', assigned_to:'', priority:'medium', due_date:'', monetary_value:'', description:'' });
      setShowTaskForm(false);
      onTaskCreated?.();
      toast.success('Task added');
    } catch(err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const markDone = async (task) => {
    const updated = await api.put(`/tasks/${task.id}`, { status: task.status==='done'?'todo':'done' });
    setTasks(prev=>prev.map(t=>t.id===updated.id?updated:t));
  };

  const professionals = users.filter(u=>u.role!=='client');

  return (
    <div>
      {/* Project meta */}
      <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginBottom:'1rem'}}>
        <Badge status={project.status} />
        <PriorityBadge priority={project.priority} />
        {project.client_name && <span style={{fontSize:'0.78rem',color:'var(--text3)'}}>Client: <strong style={{color:'var(--text2)'}}>{project.client_name}</strong></span>}
        {project.due_date && <span style={{fontSize:'0.78rem',color:'var(--text3)',display:'flex',alignItems:'center',gap:4}}><Calendar size={11}/>{fmtDate(project.due_date)}</span>}
      </div>

      {project.description && <p style={{fontSize:'0.875rem',color:'var(--text2)',lineHeight:1.7,marginBottom:'0.75rem'}}>{project.description}</p>}

      {project.notes && (
        <div style={{background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:'var(--radius)',padding:'0.85rem',marginBottom:'1rem',fontSize:'0.84rem',color:'var(--text2)'}}>
          <div style={{fontSize:'0.68rem',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.3rem'}}>Internal Notes</div>
          {project.notes}
        </div>
      )}

      {project.tags?.length > 0 && (
        <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap',marginBottom:'1rem'}}>
          {project.tags.map(tag=>(
            <span key={tag} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:99,padding:'2px 9px',fontSize:'0.7rem',color:'var(--text3)',display:'flex',alignItems:'center',gap:3}}>
              <Tag size={9}/> {tag}
            </span>
          ))}
        </div>
      )}

      {project.budget && (
        <div style={{marginBottom:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'var(--text3)',marginBottom:'0.3rem'}}>
            <span>Budget</span><span>{fmtCurrency(project.spent||0)} / {fmtCurrency(project.budget)}</span>
          </div>
          <ProgressBar value={project.spent||0} max={project.budget} />
        </div>
      )}

      <hr className="divider" />

      {/* Tasks section */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem'}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.9rem'}}>Tasks ({tasks.length})</div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowTaskForm(s=>!s)}><Plus size={13}/> Add Task</button>
      </div>

      {showTaskForm && (
        <form onSubmit={addTask} style={{background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:'var(--radius)',padding:'1rem',marginBottom:'1rem'}}>
          <div className="form-row">
            <div className="form-group" style={{marginBottom:'0.75rem'}}><label className="form-label">Task Title *</label><input className="form-input" value={taskForm.title} onChange={setT('title')} required placeholder="Edit video…" /></div>
            <div className="form-group" style={{marginBottom:'0.75rem'}}><label className="form-label">Assign To</label>
              <select className="form-select" value={taskForm.assigned_to} onChange={setT('assigned_to')}>
                <option value="">Unassigned</option>
                {professionals.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{marginBottom:'0.75rem'}}><label className="form-label">Priority</label>
              <select className="form-select" value={taskForm.priority} onChange={setT('priority')}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group" style={{marginBottom:'0.75rem'}}><label className="form-label">Due Date</label><input className="form-input" type="date" value={taskForm.due_date} onChange={setT('due_date')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{marginBottom:'0.75rem'}}><label className="form-label">Value (PKR/USD)</label><input className="form-input" type="number" value={taskForm.monetary_value} onChange={setT('monetary_value')} placeholder="1000" /></div>
            <div style={{display:'flex',alignItems:'flex-end',paddingBottom:'0.75rem',gap:'0.5rem'}}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving?<Spinner/>:'Add Task'}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setShowTaskForm(false)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {loadingTasks ? <div style={{textAlign:'center',padding:'1rem'}}><Spinner /></div> :
       tasks.length===0 ? <p style={{color:'var(--text3)',fontSize:'0.84rem'}}>No tasks yet. Add the first one above.</p> :
       tasks.map(t => (
        <div key={t.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.65rem 0.85rem',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'0.4rem'}}>
          <input type="checkbox" checked={t.status==='done'} onChange={()=>markDone(t)} style={{accentColor:'var(--teal)',width:15,height:15,cursor:'pointer'}} />
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:500,fontSize:'0.84rem',color:t.status==='done'?'var(--text3)':'var(--text)',textDecoration:t.status==='done'?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
            <div style={{fontSize:'0.7rem',color:'var(--text3)'}}>
              {t.assignee_name||'Unassigned'} {t.due_date?`· Due ${fmtDate(t.due_date)}`:''} {t.monetary_value>0?`· ${fmtCurrency(t.monetary_value)}`:''}
            </div>
          </div>
          <PriorityBadge priority={t.priority} />
          <Badge status={t.status} />
        </div>
      ))}
    </div>
  );
};

export const ProjectsPage = ({ adminView = true }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, u] = await Promise.all([api.get('/projects'), api.get('/clients'), api.get('/users')]);
      setProjects(p); setClients(c); setUsers(u);
    } catch(err) { toast.error(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q)) &&
           (filter==='all' || p.status===filter);
  });

  const handleSave = async (form) => {
    if (modal?.project) {
      const u = await api.put(`/projects/${modal.project.id}`, form);
      setProjects(prev=>prev.map(p=>p.id===u.id?{...p,...u}:p));
      toast.success('Project updated');
    } else {
      const c = await api.post('/projects', form);
      setProjects(prev=>[c,...prev]);
      toast.success('Project created');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/projects/${del.id}`);
    setProjects(prev=>prev.filter(p=>p.id!==del.id));
    toast.success('Deleted');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Projects</h1><p className="text-sm text-muted">{projects.length} projects</p></div>
        {adminView && <button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={15}/> New Project</button>}
      </div>

      <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        <div className="search-bar"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…" /></div>
        {['all','active','paused','completed','cancelled'].map(s=>(
          <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-secondary'}`} onClick={()=>setFilter(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
        ))}
      </div>

      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner /></div> :
       filtered.length===0 ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Briefcase size={24}/></div>} title="No projects" description="Create your first project" action={adminView&&<button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={14}/> New Project</button>} /></div> :
       <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(310px, 1fr))',gap:'1rem'}}>
        {filtered.map(p=>(
          <div key={p.id} className="card" style={{padding:'1.25rem',cursor:'pointer'}} onClick={()=>setDetail(p)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.65rem'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:'var(--text)',fontSize:'0.95rem',marginBottom:'0.15rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                <div style={{fontSize:'0.75rem',color:'var(--text3)'}}>{p.client_name||'No client'}</div>
              </div>
              {adminView && (
                <div style={{display:'flex',gap:'0.25rem',marginLeft:'0.5rem',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon" onClick={()=>setModal({project:p})}><Edit2 size={12}/></button>
                  <button className="btn btn-danger btn-icon" onClick={()=>setDel(p)}><Trash2 size={12}/></button>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'0.65rem'}}>
              <Badge status={p.status}/><PriorityBadge priority={p.priority}/>
            </div>
            {p.description && <p style={{fontSize:'0.78rem',color:'var(--text3)',marginBottom:'0.65rem',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.description}</p>}
            {p.tags?.length>0 && (
              <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap',marginBottom:'0.65rem'}}>
                {p.tags.slice(0,4).map(tag=><span key={tag} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:99,padding:'1px 7px',fontSize:'0.65rem',color:'var(--text3)'}}>{tag}</span>)}
              </div>
            )}
            {p.budget && <div style={{fontSize:'0.72rem',color:'var(--text3)',marginBottom:'0.5rem'}}>Budget: {fmtCurrency(p.budget)}</div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.72rem',color:'var(--text3)'}}>
              <span style={{display:'flex',alignItems:'center',gap:3}}><Calendar size={10}/>{p.due_date?fmtDate(p.due_date):'No deadline'}</span>
              <span style={{display:'flex',alignItems:'center',gap:4,color:'var(--teal)',fontWeight:600}}>Open <ChevronRight size={12}/></span>
            </div>
          </div>
        ))}
       </div>
      }

      {/* Project Detail Modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail?.title} size="modal-lg">
        {detail && <ProjectDetail project={detail} users={users} onClose={()=>setDetail(null)} onTaskCreated={load} />}
      </Modal>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.project?'Edit Project':'New Project'} size="modal-lg">
        {modal && <ProjectForm initial={modal?.project?{...modal.project,tags:(modal.project.tags||[]).join(', ')}:undefined} clients={clients} users={users} onSave={handleSave} onClose={()=>setModal(null)} />}
      </Modal>

      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDelete} title="Delete Project" message={`Delete "${del?.title}"? All tasks will also be deleted.`} danger />
    </>
  );
};
