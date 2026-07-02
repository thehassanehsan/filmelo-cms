import { useState, useEffect } from 'react';
import { Briefcase, CheckSquare, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { api } from '../../utils/api';
import { Badge, PriorityBadge, Spinner, fmtDate, fmtCurrency, toast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { TasksPage } from '../admin/TasksPage';
import { ReportsPage } from '../admin/ReportsPage';
import { SettingsPage } from '../admin/ActivityAndSettings';
import { EarningsPage } from '../EarningsPage';

export const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!user?.id) return;   // wait until user is loaded
    setLoading(true);
    setError(null);

    Promise.all([
      api.get('/tasks'),
      api.get('/projects'),
      api.get(`/tasks/earnings/${user.id}`),
    ])
      .then(([t, p, e]) => { setTasks(t); setProjects(p); setEarnings(e); })
      .catch(err => { console.error(err); setError(err.message); })
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user?.id || loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}>
      <Spinner size="spinner-lg" />
    </div>
  );

  if (error) return (
    <div style={{ padding:'2rem', textAlign:'center', color:'var(--pink)' }}>
      <p style={{ marginBottom:'1rem' }}>Failed to load dashboard: {error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const openTasks   = tasks.filter(t => t.status !== 'done');
  const doneTasks   = tasks.filter(t => t.status === 'done');
  const inProgress  = tasks.filter(t => t.status === 'in_progress');
  const urgent      = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done');
  const totalEarned = earnings.filter(t => t.status === 'done').reduce((s, t) => s + Number(t.earned || 0), 0);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted">Here's your work overview</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom:'1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon teal"><CheckSquare size={18}/></div>
          <div className="stat-info"><div className="stat-value">{openTasks.length}</div><div className="stat-label">Open Tasks</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><TrendingUp size={18}/></div>
          <div className="stat-info"><div className="stat-value">{inProgress.length}</div><div className="stat-label">In Progress</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckSquare size={18}/></div>
          <div className="stat-info"><div className="stat-value">{doneTasks.length}</div><div className="stat-label">Completed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Clock size={18}/></div>
          <div className="stat-info"><div className="stat-value">{urgent.length}</div><div className="stat-label">Urgent</div></div>
        </div>
        <div className="stat-card" style={{ borderTop:'3px solid #059669' }}>
          <div className="stat-icon green"><DollarSign size={18}/></div>
          <div className="stat-info"><div className="stat-value">{fmtCurrency(totalEarned)}</div><div className="stat-label">Earned</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">My Tasks</div></div>
          {openTasks.length === 0
            ? <p style={{ color:'var(--text3)', fontSize:'0.85rem' }}>No open tasks — great job! 🎉</p>
            : openTasks.slice(0,7).map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, color:'var(--text)', fontSize:'0.85rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>{t.project_title||'No project'}{t.due_date?` · Due ${fmtDate(t.due_date)}`:''}</div>
                </div>
                <PriorityBadge priority={t.priority}/>
                <Badge status={t.status}/>
              </div>
            ))
          }
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">My Projects</div></div>
          {projects.length === 0
            ? <p style={{ color:'var(--text3)', fontSize:'0.85rem' }}>No projects assigned yet.</p>
            : projects.slice(0,6).map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.6rem 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight:500, color:'var(--text)', fontSize:'0.85rem' }}>{p.title}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>{p.client_name||'Internal'}</div>
                </div>
                <Badge status={p.status}/>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
};

export const ProfessionalTasksPage    = () => <TasksPage role="professional"/>;
export const ProfessionalReportsPage  = () => <ReportsPage readOnly={false}/>;
export const ProfessionalSettingsPage = () => <SettingsPage/>;
export const ProfessionalEarningsPage = () => <EarningsPage/>;

export const ProfessionalProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    api.get('/projects').then(setProjects).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));
  }, []);
  if (loading) return <div style={{display:'flex',justifyContent:'center',paddingTop:'4rem'}}><Spinner size="spinner-lg"/></div>;
  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>My Projects</h1><p className="text-sm text-muted">{projects.length} projects</p></div>
      </div>
      {projects.length===0
        ? <div className="card"><p style={{color:'var(--text3)',padding:'1rem'}}>No projects assigned yet.</p></div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(290px,1fr))',gap:'1rem'}}>
            {projects.map(p=>(
              <div key={p.id} className="card" style={{padding:'1.25rem'}}>
                <div style={{fontWeight:600,color:'var(--text)',marginBottom:'0.3rem'}}>{p.title}</div>
                {p.description&&<p style={{fontSize:'0.8rem',marginBottom:'0.6rem',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.description}</p>}
                {p.notes&&<div style={{fontSize:'0.78rem',color:'var(--text3)',marginBottom:'0.6rem',background:'var(--surface2)',padding:'0.5rem 0.75rem',borderRadius:'var(--radius)'}}>{p.notes}</div>}
                <div style={{fontSize:'0.75rem',color:'var(--text3)',marginBottom:'0.6rem'}}>{p.client_name||'Internal'}</div>
                <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                  <Badge status={p.status}/><PriorityBadge priority={p.priority}/>
                </div>
                {p.due_date&&<div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:'0.6rem'}}>Due: {fmtDate(p.due_date)}</div>}
                {p.tags?.length>0&&<div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap',marginTop:'0.5rem'}}>
                  {p.tags.map(tag=><span key={tag} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:99,padding:'1px 7px',fontSize:'0.65rem',color:'var(--text3)'}}>{tag}</span>)}
                </div>}
              </div>
            ))}
          </div>
      }
    </>
  );
};
