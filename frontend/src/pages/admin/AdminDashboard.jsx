import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Briefcase, CheckSquare, DollarSign, Users, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api';
import { Avatar, Badge, fmtCurrency, timeAgo, Spinner } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#7c5cfc', '#3b82f6', '#f97316', '#22c55e'];

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>;
  if (!stats) return <p>Failed to load dashboard.</p>;

  const taskData = (stats.tasks_by_status || []).map(r => ({ name: r.status.replace('_', ' '), value: Number(r.count) }));
  const projectData = (stats.projects_by_status || []).map(r => ({ name: r.status, count: Number(r.count) }));

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p className="text-sm text-muted">Welcome back — here's what's happening at Filmelo Media</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/clients" className="btn btn-secondary btn-sm">View Clients</Link>
          <Link to="/admin/projects" className="btn btn-primary btn-sm">+ New Project</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><Building2 size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{stats.active_clients}</div>
            <div className="stat-label">Active Clients</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Briefcase size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{stats.active_projects}</div>
            <div className="stat-label">Active Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><CheckSquare size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{stats.open_tasks}</div>
            <div className="stat-label">Open Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{fmtCurrency(stats.revenue)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TrendingUp size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending_invoices}</div>
            <div className="stat-label">Pending Invoices</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Users size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{stats.team_members}</div>
            <div className="stat-label">Team Members</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Projects by Status</div>
              <div className="card-subtitle">Current project distribution</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Tasks by Status</div>
              <div className="card-subtitle">Current workload overview</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={taskData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {taskData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '-0.5rem' }}>
            {taskData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Activity</div>
          <Link to="/admin/activity" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        <div>
          {(stats.recent_activity || []).slice(0, 8).map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <Avatar initials={a.avatar_initials || a.user_name?.[0] || '?'} size="sm" />
              <div style={{ flex: 1 }}>
                <span style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500 }}>{a.user_name || 'Unknown'}</span>
                <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}> {a.action?.replace(/_/g, ' ')}</span>
                {a.details?.title && <span style={{ color: 'var(--text2)', fontSize: '0.82rem' }}> — <em>{a.details.title}</em></span>}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', flexShrink: 0 }}>{timeAgo(a.created_at)}</div>
            </div>
          ))}
          {!stats.recent_activity?.length && (
            <p style={{ color: 'var(--text3)', fontSize: '0.85rem', padding: '1rem 0' }}>No activity yet</p>
          )}
        </div>
      </div>
    </>
  );
};
