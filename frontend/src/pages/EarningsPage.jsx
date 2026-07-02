import { useState, useEffect } from 'react';
import { DollarSign, CheckSquare, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { Spinner, fmtDate, fmtCurrency, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const penaltyInfo = (daysLate) => {
  const d = Number(daysLate || 0);
  if (d <= 0) return { pct:100, label:'On time',      color:'#059669' };
  if (d === 1) return { pct:50,  label:'1 day late',  color:'#f97316' };
  if (d === 2) return { pct:25,  label:'2 days late', color:'var(--pink)' };
  return       { pct:0,   label:`${d} days late`, color:'#ef4444' };
};

export const EarningsPage = ({ userId: propUserId }) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/tasks/earnings/${userId}`)
      .then(setTasks)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId || loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:'3rem' }}>
      <Spinner size="spinner-lg"/>
    </div>
  );

  if (error) return (
    <div style={{ padding:'2rem', textAlign:'center', color:'var(--pink)' }}>
      <p>Failed to load earnings: {error}</p>
      <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const doneTasks     = tasks.filter(t => t.status === 'done');
  const totalEarned   = doneTasks.reduce((s,t) => s + Number(t.earned || 0), 0);
  const totalPossible = doneTasks.reduce((s,t) => s + Number(t.monetary_value || 0), 0);
  const pending       = tasks.filter(t => t.status !== 'done' && Number(t.monetary_value) > 0)
                             .reduce((s,t) => s + Number(t.monetary_value || 0), 0);

  return (
    <>
      {!propUserId && (
        <div className="page-header">
          <div className="page-header-left">
            <h1>My Earnings</h1>
            <p className="text-sm text-muted">Task-based compensation tracker</p>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        <div className="stat-card" style={{ borderTop:'3px solid #059669' }}>
          <div className="stat-icon green"><DollarSign size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{fmtCurrency(totalEarned)}</div>
            <div className="stat-label">Total Earned</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop:'3px solid #3b82f6' }}>
          <div className="stat-icon blue"><Clock size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{fmtCurrency(pending)}</div>
            <div className="stat-label">Pending (open tasks)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><CheckSquare size={18}/></div>
          <div className="stat-info">
            <div className="stat-value">{doneTasks.length}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
        </div>
      </div>

      {/* Rules legend */}
      <div style={{ background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'0.85rem 1rem', marginBottom:'1.25rem', fontSize:'0.8rem', color:'var(--text2)' }}>
        <div style={{ fontWeight:700, marginBottom:'0.4rem' }}>Completion Bonus Rules</div>
        <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
          <span style={{ color:'#059669' }}>● On time = 100%</span>
          <span style={{ color:'#f97316' }}>● 1 day late = 50%</span>
          <span style={{ color:'var(--pink)' }}>● 2 days late = 25%</span>
          <span style={{ color:'#ef4444' }}>● 3+ days late = 0%</span>
        </div>
      </div>

      <div className="card" style={{ padding:0 }}>
        {tasks.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'var(--text3)' }}>
            No tasks with monetary value assigned yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th><th>Project</th><th>Status</th>
                  <th>Due</th><th>Completed</th><th>Timeliness</th>
                  <th>Value</th><th>Earned</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const daysLate = t.status === 'done' ? Number(t.days_late || 0) : null;
                  const info     = daysLate !== null ? penaltyInfo(daysLate) : null;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight:500, color:'var(--text)', fontSize:'0.875rem' }}>{t.title}</td>
                      <td style={{ fontSize:'0.78rem', color:'var(--text3)' }}>{t.project_title||'—'}</td>
                      <td><Badge status={t.status}/></td>
                      <td style={{ fontSize:'0.78rem' }}>{fmtDate(t.due_date)}</td>
                      <td style={{ fontSize:'0.78rem' }}>{t.completed_at ? fmtDate(t.completed_at) : '—'}</td>
                      <td>
                        {info
                          ? <span style={{ color:info.color, fontWeight:700, fontSize:'0.78rem' }}>{info.label}</span>
                          : <span style={{ color:'var(--text3)', fontSize:'0.78rem' }}>Pending</span>}
                      </td>
                      <td style={{ fontWeight:600 }}>{fmtCurrency(t.monetary_value || 0)}</td>
                      <td style={{ fontWeight:700 }}>
                        {t.status === 'done'
                          ? <span style={{ color:info ? info.color : '#059669' }}>
                              {fmtCurrency(t.earned || 0)}
                              {info && info.pct < 100 && (
                                <span style={{ fontSize:'0.65rem', marginLeft:4 }}>({info.pct}%)</span>
                              )}
                            </span>
                          : <span style={{ color:'var(--text3)' }}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
