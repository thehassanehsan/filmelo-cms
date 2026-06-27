import { useState, useEffect } from 'react';
import { Briefcase, FileText, Receipt, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api';
import { Badge, Spinner, fmtDate, fmtCurrency, toast, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { SettingsPage } from '../admin/ActivityAndSettings';
import { ReportsPage } from '../admin/ReportsPage';
import { InvoicesPage } from '../admin/InvoicesPage';

export const ClientDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/client').then(setData).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>;
  if (!data) return null;

  const activeProjects = (data.projects || []).filter(p => p.status === 'active').length;
  const pendingInvoices = (data.invoices || []).filter(i => i.status === 'pending');
  const totalDue = pendingInvoices.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted">
            {data.client ? `${data.client.company_name} — Client Portal` : 'Your client dashboard'}
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Briefcase size={18}/></div>
          <div className="stat-info"><div className="stat-value">{activeProjects}</div><div className="stat-label">Active Projects</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FileText size={18}/></div>
          <div className="stat-info"><div className="stat-value">{(data.reports || []).length}</div><div className="stat-label">Reports</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Receipt size={18}/></div>
          <div className="stat-info"><div className="stat-value">{pendingInvoices.length}</div><div className="stat-label">Pending Invoices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TrendingUp size={18}/></div>
          <div className="stat-info"><div className="stat-value">{fmtCurrency(totalDue)}</div><div className="stat-label">Amount Due</div></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">My Projects</div></div>
          {!(data.projects?.length) ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No projects yet.</p>
          ) : data.projects.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.875rem' }}>{p.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{p.due_date ? `Due ${fmtDate(p.due_date)}` : 'No deadline'}</div>
              </div>
              <Badge status={p.status} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Recent Reports</div></div>
          {!(data.reports?.length) ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No published reports yet.</p>
          ) : data.reports.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.875rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)', textTransform: 'capitalize' }}>{r.type} · {fmtDate(r.created_at)}</div>
              </div>
              <Badge status={r.status} />
            </div>
          ))}
        </div>
      </div>

      {data.invoices?.length > 0 && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-header"><div className="card-title">Recent Invoices</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Due Date</th></tr></thead>
              <tbody>
                {data.invoices.slice(0, 5).map(i => (
                  <tr key={i.id}>
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}>{i.invoice_number}</td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(i.amount)}</td>
                    <td><Badge status={i.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>{fmtDate(i.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export const ClientProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/projects').then(setProjects).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>My Projects</h1><p className="text-sm text-muted">{projects.length} projects</p></div>
      </div>
      {projects.length === 0 ? (
        <div className="card"><EmptyState icon={<Briefcase size={40}/>} title="No projects yet" description="Your projects will appear here once assigned by your account manager." /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.35rem' }}>{p.title}</div>
              {p.description && <p style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: '0.75rem', lineHeight: 1.6 }}>{p.description}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <Badge status={p.status} />
              </div>
              {p.due_date && <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Due: {fmtDate(p.due_date)}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const ClientReportsPage = () => <ReportsPage readOnly={true} />;
export const ClientInvoicesPage = () => <InvoicesPage readOnly={true} />;
export const ClientSettingsPage = () => <SettingsPage />;
