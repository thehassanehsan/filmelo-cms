import { useState, useEffect } from 'react';
import { Briefcase, FileText, Film, MessageSquare } from 'lucide-react';
import { api } from '../../utils/api';
import { Badge, PriorityBadge, Spinner, fmtDate, toast, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { SettingsPage } from '../admin/ActivityAndSettings';
import { ReportsPage } from '../admin/ReportsPage';
import { DeliverablesPage } from '../DeliverablesPage';

export const ClientDashboard = () => {
  const { user } = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/client')
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}>
      <Spinner size="spinner-lg"/>
    </div>
  );
  if (!data) return null;

  const activeProjects  = (data.projects || []).filter(p => p.status === 'active').length;
  const recentReports   = (data.reports  || []).length;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
          <p className="text-sm text-muted">
            {data.client ? `${data.client.company_name} — Client Portal` : 'Your dashboard'}
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom:'1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Briefcase size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{activeProjects}</div>
            <div className="stat-label">Active Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><FileText size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{recentReports}</div>
            <div className="stat-label">Reports</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">My Projects</div></div>
          {!(data.projects?.length)
            ? <p style={{ color:'var(--text3)', fontSize:'0.85rem' }}>No projects yet.</p>
            : data.projects.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'0.65rem 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:500, color:'var(--text)', fontSize:'0.875rem', marginBottom:'0.15rem' }}>{p.title}</div>
                  {p.description && <div style={{ fontSize:'0.75rem', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>}
                  {p.due_date && <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Due: {fmtDate(p.due_date)}</div>}
                </div>
                <Badge status={p.status}/>
              </div>
            ))
          }
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Recent Reports</div></div>
          {!(data.reports?.length)
            ? <p style={{ color:'var(--text3)', fontSize:'0.85rem' }}>No published reports yet.</p>
            : data.reports.map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.65rem 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight:500, color:'var(--text)', fontSize:'0.875rem' }}>{r.title}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text3)', textTransform:'capitalize' }}>{r.type} · {fmtDate(r.created_at)}</div>
                </div>
                <Badge status={r.status}/>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
};

export const ClientProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/projects').then(setProjects).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}>
      <Spinner size="spinner-lg"/>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Projects</h1>
          <p className="text-sm text-muted">{projects.length} projects</p>
        </div>
      </div>
      {projects.length === 0
        ? <div className="card"><EmptyState icon={<div className="empty-state-icon"><Briefcase size={24}/></div>} title="No projects yet" description="Your projects will appear here once assigned." /></div>
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:'1rem' }}>
            {projects.map(p => (
              <div key={p.id} className="card" style={{ padding:'1.25rem' }}>
                <div style={{ fontWeight:600, color:'var(--text)', marginBottom:'0.3rem' }}>{p.title}</div>
                {p.description && <p style={{ fontSize:'0.82rem', marginBottom:'0.65rem', lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{p.description}</p>}
                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.6rem' }}>
                  <Badge status={p.status}/>
                  <PriorityBadge priority={p.priority}/>
                </div>
                {p.due_date && <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Due: {fmtDate(p.due_date)}</div>}
                {p.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', marginTop:'0.5rem' }}>
                    {p.tags.map(tag => (
                      <span key={tag} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:99, padding:'1px 7px', fontSize:'0.65rem', color:'var(--text3)' }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </>
  );
};

// Client invoices — show status only, no amounts
export const ClientInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/invoices').then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:'3rem' }}><Spinner/></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Invoices</h1></div>
      </div>
      <div className="card" style={{ padding:0 }}>
        {invoices.length === 0
          ? <EmptyState icon={<div className="empty-state-icon"><FileText size={24}/></div>} title="No invoices" description="Your invoices will appear here." />
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice #</th><th>Status</th><th>Issued</th><th>Due Date</th></tr></thead>
                <tbody>
                  {invoices.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontFamily:'var(--font-display)', fontSize:'0.85rem', fontWeight:600 }}>{i.invoice_number}</td>
                      <td><Badge status={i.status}/></td>
                      <td style={{ fontSize:'0.8rem', color:'var(--text3)' }}>{fmtDate(i.issued_date)}</td>
                      <td style={{ fontSize:'0.8rem', color:'var(--text3)' }}>{fmtDate(i.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  );
};

export const ClientReportsPage      = () => <ReportsPage readOnly={true}/>;
export const ClientDeliverablesPage = () => <DeliverablesPage readOnly={true}/>;
export const ClientSettingsPage     = () => <SettingsPage/>;
