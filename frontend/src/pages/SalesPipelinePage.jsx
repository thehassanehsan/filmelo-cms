import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, TrendingUp, DollarSign } from 'lucide-react';
import { api } from '../utils/api';
import { Modal, Confirm, EmptyState, Spinner, Avatar, fmtDate, fmtCurrency, toast } from '../components/ui';

const STAGES = [
  { key:'prospect',    label:'Prospect',    color:'#9CA3AF' },
  { key:'pitching',    label:'Pitching',    color:'#3b82f6' },
  { key:'in_process',  label:'In Process',  color:'#f97316' },
  { key:'negotiation', label:'Negotiation', color:'#8b5cf6' },
  { key:'closing',     label:'Closing',     color:'var(--pink)' },
  { key:'won',         label:'Won',         color:'#059669' },
  { key:'lost',        label:'Lost',        color:'#ef4444' },
];

const StageBadge = ({ stage }) => {
  const s = STAGES.find(x=>x.key===stage) || STAGES[0];
  return <span style={{background:`${s.color}18`,color:s.color,border:`1px solid ${s.color}40`,borderRadius:99,padding:'2px 9px',fontSize:'0.7rem',fontWeight:700}}>{s.label}</span>;
};

const PipelineForm = ({ initial, users, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { company_name:'', contact_name:'', contact_email:'', contact_phone:'', stage:'prospect', package:'', value:'', assigned_to:'', deadline:'', notes:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await onSave(form); onClose(); }
    catch(err) { toast.error(err.message); } finally { setLoading(false); }
  };

  const professionals = users.filter(u=>u.role!=='client');
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" value={form.company_name} onChange={set('company_name')} required placeholder="ACME Corp" /></div>
        <div className="form-group"><label className="form-label">Contact Name</label><input className="form-input" value={form.contact_name} onChange={set('contact_name')} placeholder="John Doe" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="john@acme.com" /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+92 300 0000000" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Stage</label>
          <select className="form-select" value={form.stage} onChange={set('stage')}>
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Package / Service</label><input className="form-input" value={form.package} onChange={set('package')} placeholder="Social Media Management" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Deal Value</label><input className="form-input" type="number" value={form.value} onChange={set('value')} placeholder="50000" /></div>
        <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Assigned To</label>
        <select className="form-select" value={form.assigned_to} onChange={set('assigned_to')}>
          <option value="">Unassigned</option>
          {professionals.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Key details, requirements, next steps…" /></div>
      <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'0.5rem'}}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading?<Spinner/>:(initial?'Save':'Add to Pipeline')}</button>
      </div>
    </form>
  );
};

export const SalesPipelinePage = () => {
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const [d,u] = await Promise.all([api.get('/sales'), api.get('/users')]); setDeals(d); setUsers(u); }
    catch(err) { toast.error(err.message); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const filtered = deals.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.company_name?.toLowerCase().includes(q) || d.contact_name?.toLowerCase().includes(q)) &&
           (stageFilter==='all' || d.stage===stageFilter);
  });

  const totalPipeline = filtered.filter(d=>!['won','lost'].includes(d.stage)).reduce((s,d)=>s+Number(d.value||0),0);
  const totalWon = deals.filter(d=>d.stage==='won').reduce((s,d)=>s+Number(d.value||0),0);

  const handleSave = async (form) => {
    if (modal?.deal) { const u=await api.put(`/sales/${modal.deal.id}`,form); setDeals(prev=>prev.map(d=>d.id===u.id?u:d)); toast.success('Updated'); }
    else { const c=await api.post('/sales',form); setDeals(prev=>[c,...prev]); toast.success('Added to pipeline'); }
  };
  const handleDelete = async () => { await api.delete(`/sales/${del.id}`); setDeals(prev=>prev.filter(d=>d.id!==del.id)); toast.success('Removed'); };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Sales Pipeline</h1><p className="text-sm text-muted">{deals.length} deals</p></div>
        <button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={15}/> Add Deal</button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card"><div className="stat-icon blue"><TrendingUp size={18}/></div><div className="stat-info"><div className="stat-value">{fmtCurrency(totalPipeline)}</div><div className="stat-label">Pipeline Value</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><DollarSign size={18}/></div><div className="stat-info"><div className="stat-value">{fmtCurrency(totalWon)}</div><div className="stat-label">Won This Period</div></div></div>
        <div className="stat-card"><div className="stat-icon teal"><TrendingUp size={18}/></div><div className="stat-info"><div className="stat-value">{deals.filter(d=>d.stage==='closing').length}</div><div className="stat-label">Closing Soon</div></div></div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        <div className="search-bar"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search deals…" /></div>
        <button className={`btn btn-sm ${stageFilter==='all'?'btn-primary':'btn-secondary'}`} onClick={()=>setStageFilter('all')}>All</button>
        {STAGES.map(s=>(
          <button key={s.key} className={`btn btn-sm ${stageFilter===s.key?'btn-primary':'btn-secondary'}`} onClick={()=>setStageFilter(s.key)} style={stageFilter===s.key?{}:{}}>{s.label}</button>
        ))}
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Spinner /></div> :
         filtered.length===0 ? <EmptyState icon={<div className="empty-state-icon"><TrendingUp size={24}/></div>} title="No deals found" description="Add your first sales opportunity" action={<button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={14}/> Add Deal</button>} /> :
         <div className="table-wrap">
           <table>
             <thead><tr><th>Company</th><th>Contact</th><th>Stage</th><th>Package</th><th>Value</th><th>Assigned</th><th>Deadline</th><th></th></tr></thead>
             <tbody>
               {filtered.map(d=>(
                 <tr key={d.id}>
                   <td><div style={{fontWeight:600,color:'var(--text)',fontSize:'0.875rem'}}>{d.company_name}</div></td>
                   <td style={{fontSize:'0.82rem'}}>{d.contact_name||'—'}<br/><span style={{color:'var(--text3)',fontSize:'0.72rem'}}>{d.contact_email||''}</span></td>
                   <td><StageBadge stage={d.stage}/></td>
                   <td style={{fontSize:'0.82rem',color:'var(--text2)'}}>{d.package||'—'}</td>
                   <td style={{fontWeight:600}}>{d.value?fmtCurrency(d.value):'—'}</td>
                   <td>{d.assigned_name?<div style={{display:'flex',alignItems:'center',gap:6}}><Avatar initials={d.avatar_initials||d.assigned_name[0]} size="sm"/><span style={{fontSize:'0.8rem'}}>{d.assigned_name}</span></div>:'—'}</td>
                   <td style={{fontSize:'0.78rem',color:'var(--text3)'}}>{fmtDate(d.deadline)}</td>
                   <td><div style={{display:'flex',gap:'0.35rem'}}>
                     <button className="btn btn-ghost btn-icon" onClick={()=>setModal({deal:d})}><Edit2 size={13}/></button>
                     <button className="btn btn-danger btn-icon" onClick={()=>setDel(d)}><Trash2 size={13}/></button>
                   </div></td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
        }
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.deal?'Edit Deal':'New Sales Opportunity'} size="modal-lg">
        {modal && <PipelineForm initial={modal?.deal} users={users} onSave={handleSave} onClose={()=>setModal(null)} />}
      </Modal>
      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDelete} title="Remove Deal" message={`Remove "${del?.company_name}" from pipeline?`} danger />
    </>
  );
};
