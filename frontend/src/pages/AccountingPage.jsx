import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, EmptyState, Spinner, fmtDate, fmtCurrency, toast } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const INCOME_CATS  = ['Client Payment','Retainer','Project Fee','Consultation','Other Income'];
const EXPENSE_CATS = ['Salaries','Software','Advertising','Equipment','Rent','Utilities','Travel','Other Expense'];

const EntryForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { type:'income', category:'', amount:'', description:'', reference:'', entry_date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const cats = form.type==='income' ? INCOME_CATS : EXPENSE_CATS;

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await onSave(form); onClose(); }
    catch(err) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Type *</label>
          <select className="form-select" value={form.type} onChange={set('type')}>
            <option value="income">Income</option><option value="expense">Expense</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={set('category')}>
            <option value="">Select…</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Amount *</label><input className="form-input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required placeholder="50000" /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.entry_date} onChange={set('entry_date')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={set('description')} placeholder="Client payment for July campaign…" /></div>
      <div className="form-group"><label className="form-label">Reference / Invoice #</label><input className="form-input" value={form.reference} onChange={set('reference')} placeholder="INV-001" /></div>
      <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'0.5rem'}}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading?<Spinner/>:(initial?'Save':'Add Entry')}</button>
      </div>
    </form>
  );
};

const COLORS = ['#059669','#E8008A','#3b82f6','#f97316','#8b5cf6','#D4E800'];

export const AccountingPage = () => {
  const [data, setData] = useState({ entries:[], summary:{}, by_category:[] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [tab, setTab] = useState('overview');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try { setData(await api.get('/accounting')); }
    catch(err) { toast.error(err.message); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const handleSave = async (form) => {
    if (modal?.entry) { await api.put(`/accounting/${modal.entry.id}`,form); toast.success('Updated'); }
    else { await api.post('/accounting',form); toast.success('Entry added'); }
    load();
  };
  const handleDelete = async () => { await api.delete(`/accounting/${del.id}`); toast.success('Deleted'); load(); };

  const { entries, summary, by_category } = data;
  const filtered = entries.filter(e=>typeFilter==='all'||e.type===typeFilter);

  const chartData = by_category.filter(c=>c.type==='income').slice(0,6).map(c=>({ name:c.category||'Other', value:Number(c.total) }));
  const expChartData = by_category.filter(c=>c.type==='expense').slice(0,6).map(c=>({ name:c.category||'Other', value:Number(c.total) }));

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Accounting</h1><p className="text-sm text-muted">Master financial overview</p></div>
        <button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={15}/> Add Entry</button>
      </div>

      {/* Summary stat cards */}
      {!loading && (
        <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
          <div className="stat-card" style={{borderTop:'3px solid #059669'}}>
            <div className="stat-icon green"><TrendingUp size={18}/></div>
            <div className="stat-info"><div className="stat-value">{fmtCurrency(summary.total_income||0)}</div><div className="stat-label">Total Income</div></div>
          </div>
          <div className="stat-card" style={{borderTop:'3px solid var(--pink)'}}>
            <div className="stat-icon pink"><TrendingDown size={18}/></div>
            <div className="stat-info"><div className="stat-value">{fmtCurrency(summary.total_expense||0)}</div><div className="stat-label">Total Expenses</div></div>
          </div>
          <div className="stat-card" style={{borderTop:`3px solid ${Number(summary.balance||0)>=0?'#059669':'var(--pink)'}`}}>
            <div className="stat-icon" style={{background:`${Number(summary.balance||0)>=0?'rgba(5,150,105,0.1)':'rgba(232,0,138,0.1)'}`,color:Number(summary.balance||0)>=0?'#059669':'var(--pink)'}}>
              <DollarSign size={18}/>
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{color:Number(summary.balance||0)>=0?'#059669':'var(--pink)'}}>{fmtCurrency(Math.abs(summary.balance||0))}</div>
              <div className="stat-label">{Number(summary.balance||0)>=0?'Net Profit':'Net Loss'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview','entries'].map(t=>(
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='overview' && !loading && (
        <div className="grid-2" style={{marginBottom:'1.25rem'}}>
          <div className="card">
            <div className="card-header"><div className="card-title">Income Breakdown</div></div>
            {chartData.length===0 ? <p style={{color:'var(--text3)',fontSize:'0.84rem'}}>No income entries yet</p> :
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>fmtCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>}
            <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem',marginTop:'0.5rem'}}>
              {chartData.map((d,i)=>(
                <div key={d.name} style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.72rem',color:'var(--text2)'}}>
                  <div style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length]}}/>
                  {d.name} ({fmtCurrency(d.value)})
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Expense Breakdown</div></div>
            {expChartData.length===0 ? <p style={{color:'var(--text3)',fontSize:'0.84rem'}}>No expense entries yet</p> :
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expChartData} margin={{top:0,right:0,bottom:0,left:-20}}>
                <XAxis dataKey="name" tick={{fill:'var(--text3)',fontSize:10}} />
                <YAxis tick={{fill:'var(--text3)',fontSize:10}} />
                <Tooltip contentStyle={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>fmtCurrency(v)} />
                <Bar dataKey="value" fill="var(--pink)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </div>
      )}

      {tab==='entries' && (
        <>
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}>
            {['all','income','expense'].map(t=>(
              <button key={t} className={`btn btn-sm ${typeFilter===t?'btn-primary':'btn-secondary'}`} onClick={()=>setTypeFilter(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <div className="card" style={{padding:0}}>
            {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner/></div> :
             filtered.length===0 ? <EmptyState icon={<div className="empty-state-icon"><BarChart2 size={24}/></div>} title="No entries" description="Add income or expense entries" action={<button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={14}/> Add Entry</button>} /> :
             <div className="table-wrap">
               <table>
                 <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Reference</th><th>Amount</th><th></th></tr></thead>
                 <tbody>
                   {filtered.map(e=>(
                     <tr key={e.id}>
                       <td style={{fontSize:'0.78rem',color:'var(--text3)'}}>{fmtDate(e.entry_date)}</td>
                       <td>
                         <span style={{background:e.type==='income'?'rgba(5,150,105,0.1)':'rgba(232,0,138,0.1)',color:e.type==='income'?'#059669':'var(--pink)',padding:'2px 8px',borderRadius:99,fontSize:'0.7rem',fontWeight:700,textTransform:'capitalize'}}>{e.type}</span>
                       </td>
                       <td style={{fontSize:'0.82rem'}}>{e.category||'—'}</td>
                       <td style={{fontSize:'0.82rem',color:'var(--text2)',maxWidth:200}}>{e.description||'—'}</td>
                       <td style={{fontSize:'0.78rem',color:'var(--text3)'}}>{e.reference||'—'}</td>
                       <td style={{fontWeight:700,color:e.type==='income'?'#059669':'var(--pink)'}}>{fmtCurrency(e.amount)}</td>
                       <td><div style={{display:'flex',gap:'0.35rem'}}>
                         <button className="btn btn-ghost btn-icon" onClick={()=>setModal({entry:e})}><Edit2 size={13}/></button>
                         <button className="btn btn-danger btn-icon" onClick={()=>setDel(e)}><Trash2 size={13}/></button>
                       </div></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
            }
          </div>
        </>
      )}

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.entry?'Edit Entry':'New Accounting Entry'} size="modal-lg">
        {modal && <EntryForm initial={modal?.entry} onSave={handleSave} onClose={()=>setModal(null)} />}
      </Modal>
      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDelete} title="Delete Entry" message={`Delete this ${del?.type} entry of ${fmtCurrency(del?.amount)}?`} danger />
    </>
  );
};
