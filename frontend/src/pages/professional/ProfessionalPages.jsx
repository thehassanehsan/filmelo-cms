import { useState, useEffect } from 'react';
import { Briefcase, CheckSquare, TrendingUp, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { Badge, PriorityBadge, Spinner, fmtDate, toast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { TasksPage } from '../admin/TasksPage';
import { ReportsPage } from '../admin/ReportsPage';
import { SettingsPage } from '../admin/ActivityAndSettings';

export const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tasks'),
      api.get('/projects'),
    ]).then(([tasks, projects]) => {
      const myTasks = tasks.filter(t => t.assigned_to === user?.id || t.created_by === user?.id);
      setData({ tasks: myTasks, projects });
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>;
  if (!data) return null;

  const openTasks = data.tasks.filter(t => t.status !== 'done');
  const doneTasks = data.tasks.filter(t => t.status === 'done');
  const inProgress = data.tasks.filter(t => t.status === 'in_progress');
  const urgent = data.tasks.filter(t => t.priority === 'urgent' && t.status !== 'done');

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted">Here's your work overview for today</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><CheckSquare size={18}/></div>
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
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">My Tasks</div></div>
          {openTasks.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No open tasks — great job! 🎉</p>
          ) : openTasks.slice(0, 6).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{t.project_title || 'No project'} · {fmtDate(t.due_date)}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                <PriorityBadge priority={t.priority} />
                <Badge status={t.status} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">My Projects</div></div>
          {data.projects.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No projects assigned yet.</p>
          ) : data.projects.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.85rem' }}>{p.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{p.client_name || 'Internal'}</div>
              </div>
              <Badge status={p.status} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const ProfessionalTasksPage = () => <TasksPage role="professional" />;
export const ProfessionalProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects').then(setProjects).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Projects</h1>
          <p className="text-sm text-muted">{projects.length} projects</p>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text3)', padding: '1rem' }}>No projects assigned to you yet.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.35rem' }}>{p.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>{p.client_name || 'Internal project'}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Badge status={p.status} />
                <PriorityBadge priority={p.priority} />
              </div>
              {p.due_date && <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.6rem' }}>Due: {fmtDate(p.due_date)}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const ProfessionalReportsPage = () => <ReportsPage readOnly={false} />;
export const ProfessionalSettingsPage = () => <SettingsPage />;
