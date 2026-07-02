import { useState, useEffect } from 'react';
import { DollarSign, CheckSquare, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import { Avatar, Spinner, fmtDate, fmtCurrency, Badge } from '../../components/ui';

const penaltyPct = (daysLate) => {
  const d = Number(daysLate || 0);
  if (d <= 0) return 100;
  if (d === 1) return 50;
  if (d === 2) return 25;
  return 0;
};

const penaltyColor = (pct) => {
  if (pct === 100) return '#059669';
  if (pct === 50)  return '#f97316';
  if (pct === 25)  return 'var(--pink)';
  return '#ef4444';
};

export const ProfessionalEarningsDashboard = () => {
  const [professionals, setProfessionals] = useState([]);
  const [allEarnings, setAllEarnings]     = useState({});
  const [loading, setLoading]             = useState(true);
  const [expanded, setExpanded]           = useState({});

  useEffect(() => {
    api.get('/users').then(async (users) => {
      const profs = users.filter(u => u.role === 'professional' && u.is_active !== false);
      setProfessionals(profs);
      const map = {};
      await Promise.all(profs.map(async p => {
        try { map[p.id] = await api.get(`/tasks/earnings/${p.id}`); }
        catch { map[p.id] = []; }
      }));
      setAllEarnings(map);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggle = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const getSummary = (tasks) => {
    const done    = tasks.filter(t => t.status === 'done');
    const pending = tasks.filter(t => t.status !== 'done' && Number(t.monetary_value) > 0);
    return {
      done:      done.length,
      pending:   pending.length,
      earned:    done.reduce((s,t) => s + Number(t.earned || 0), 0),
      potential: pending.reduce((s,t) => s + Number(t.monetary_value || 0), 0),
    };
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}>
      <Spinner size="spinner-lg"/>
    </div>
  );

  const grandTotal = Object.values(allEarnings).flat()
    .filter(t => t.status === 'done')
    .reduce((s,t) => s + Number(t.earned || 0), 0);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Professional Earnings</h1>
          <p className="text-sm text-muted">Task-based compensation — monthly payout reference</p>
        </div>
        <div style={{ background:'var(--teal)', color:'var(--lime)', padding:'0.65rem 1.15rem', borderRadius:'var(--radius)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem' }}>
          Total to Pay: {fmtCurrency(grandTotal)}
        </div>
      </div>

      {professionals.length === 0 && (
        <div className="card" style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
          No professionals found. Add team members in Admin → Team.
        </div>
      )}

      {professionals.map(prof => {
        const tasks   = allEarnings[prof.id] || [];
        const summary = getSummary(tasks);
        const isOpen  = expanded[prof.id];

        return (
          <div key={prof.id} style={{ marginBottom:'1rem', border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
            <div onClick={() => toggle(prof.id)}
              style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem', background:'var(--surface)', cursor:'pointer', flexWrap:'wrap' }}>
              <Avatar initials={prof.avatar_initials || prof.name?.[0] || '?'} size="md"/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text)', fontSize:'0.95rem' }}>{prof.name}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text3)' }}>{prof.email}</div>
              </div>
              <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.2rem', color:'#059669' }}>{fmtCurrency(summary.earned)}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>Earned</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.2rem', color:'var(--text)' }}>{summary.done}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>Done</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.2rem', color:'#f97316' }}>{summary.pending}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>Pending</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', color:'var(--text3)' }}>{fmtCurrency(summary.potential)}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>Potential</div>
                </div>
              </div>
              <div style={{ color:'var(--text3)', flexShrink:0 }}>
                {isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop:'1.5px solid var(--border)' }}>
                {tasks.length === 0 ? (
                  <div style={{ padding:'1.5rem', textAlign:'center', color:'var(--text3)', fontSize:'0.84rem' }}>
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
                          const pct      = daysLate !== null ? penaltyPct(daysLate) : null;
                          return (
                            <tr key={t.id}>
                              <td style={{ fontWeight:500, color:'var(--text)', fontSize:'0.84rem' }}>{t.title}</td>
                              <td style={{ fontSize:'0.78rem', color:'var(--text3)' }}>
                                {t.project_title||'—'}
                                {t.client_name && <><br/><span style={{ fontSize:'0.7rem' }}>{t.client_name}</span></>}
                              </td>
                              <td><Badge status={t.status}/></td>
                              <td style={{ fontSize:'0.78rem' }}>{fmtDate(t.due_date)}</td>
                              <td style={{ fontSize:'0.78rem' }}>{t.completed_at ? fmtDate(t.completed_at) : '—'}</td>
                              <td>
                                {pct !== null
                                  ? <span style={{ color:penaltyColor(pct), fontWeight:700, fontSize:'0.78rem' }}>
                                      {daysLate <= 0 ? 'On time' : `${daysLate}d late`}
                                    </span>
                                  : <span style={{ color:'var(--text3)', fontSize:'0.78rem' }}>Open</span>}
                              </td>
                              <td style={{ fontWeight:600 }}>{fmtCurrency(t.monetary_value || 0)}</td>
                              <td style={{ fontWeight:700 }}>
                                {t.status === 'done'
                                  ? <span style={{ color:penaltyColor(pct || 0) }}>
                                      {fmtCurrency(t.earned || 0)}
                                      {pct !== null && pct < 100 && <span style={{ fontSize:'0.65rem', marginLeft:4 }}>({pct}%)</span>}
                                    </span>
                                  : <span style={{ color:'var(--text3)' }}>—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:'var(--surface2)' }}>
                          <td colSpan={6} style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text)', padding:'0.75rem 1rem' }}>Total for {prof.name}</td>
                          <td style={{ fontWeight:700, fontSize:'0.875rem', padding:'0.75rem 1rem' }}>{fmtCurrency(tasks.reduce((s,t)=>s+Number(t.monetary_value||0),0))}</td>
                          <td style={{ fontWeight:700, fontSize:'0.875rem', color:'#059669', padding:'0.75rem 1rem' }}>{fmtCurrency(summary.earned)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
