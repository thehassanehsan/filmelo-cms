import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2 } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, toast, Avatar } from '../../components/ui';

const PRESET_COLORS = [
  '#0D4F55','#E8008A','#D4E800','#3b82f6','#f97316','#8b5cf6',
  '#059669','#ef4444','#d97706','#0ea5e9','#ec4899','#14b8a6',
];

const ClientForm = ({ initial, users, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    company_name:'', contact_name:'', email:'', phone:'', industry:'',
    location:'', status:'active', notes:'', user_id:'',
    allowed_message_user_ids:[], color:'#0D4F55', logo_url:''
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" value={form.company_name} onChange={set('company_name')} required placeholder="KFC Pakistan" /></div>
        <div className="form-group"><label className="form-label">Contact Name</label><input className="form-input" value={form.contact_name} onChange={set('contact_name')} placeholder="Hassan Ehsan" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="client@company.com" /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Industry</label><input className="form-input" value={form.industry} onChange={set('industry')} placeholder="Restaurant, Hotel…" /></div>
        <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={set('location')} placeholder="Lahore, Pakistan" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Portal Account</label>
          <select className="form-select" value={form.user_id||''} onChange={set('user_id')}>
            <option value="">No portal access</option>
            {(users||[]).filter(u=>u.role==='client').map(u=>(
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Brand color */}
      <div className="form-group">
        <label className="form-label">Brand Colour</label>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.5rem' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f=>({...f,color:c}))}
              style={{ width:28, height:28, borderRadius:6, background:c, border:form.color===c?'3px solid var(--text)':'2px solid transparent', cursor:'pointer', transition:'all 0.15s' }} />
          ))}
          <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))}
            style={{ width:28, height:28, borderRadius:6, border:'none', padding:0, cursor:'pointer' }} title="Custom colour" />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.78rem', color:'var(--text3)' }}>
          <div style={{ width:16, height:16, borderRadius:4, background:form.color }} />
          Selected: {form.color}
        </div>
      </div>

      {/* Logo URL */}
      <div className="form-group">
        <label className="form-label">Logo URL (optional)</label>
        <input className="form-input" value={form.logo_url} onChange={set('logo_url')} placeholder="https://example.com/logo.png" />
        <div className="form-hint">Paste a direct image URL for the client's logo. It will appear on their card.</div>
        {form.logo_url && (
          <img src={form.logo_url} alt="Preview" onError={e=>e.target.style.display='none'}
            style={{ width:48, height:48, objectFit:'cover', borderRadius:8, marginTop:'0.5rem', border:'1.5px solid var(--border)' }} />
        )}
      </div>

      {/* Notes */}
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Client notes, special requirements…" /></div>

      {/* Allowed message contacts */}
      <div className="form-group">
        <label className="form-label">Client Can Message (Admin sets this)</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', paddingTop:'0.3rem' }}>
          {(users||[]).filter(u=>u.role!=='client').map(u => (
            <button key={u.id} type="button"
              className={`btn btn-sm ${(form.allowed_message_user_ids||[]).includes(u.id)?'btn-primary':'btn-secondary'}`}
              onClick={() => setForm(f => ({
                ...f,
                allowed_message_user_ids: (f.allowed_message_user_ids||[]).includes(u.id)
                  ? f.allowed_message_user_ids.filter(x=>x!==u.id)
                  : [...(f.allowed_message_user_ids||[]), u.id]
              }))}>
              {u.name} ({u.role})
            </button>
          ))}
        </div>
        <div className="form-hint">Client can only message the selected team members.</div>
      </div>

      <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', marginTop:'0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading?<Spinner/>:(initial?'Save Changes':'Add Client')}</button>
      </div>
    </form>
  );
};

export const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const [c,u] = await Promise.all([api.get('/clients'), api.get('/users')]); setClients(c); setUsers(u); }
    catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (!q || c.company_name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      && (filter==='all' || c.status===filter);
  });

  const handleSave = async (form) => {
    if (modal?.client) {
      const updated = await api.put(`/clients/${modal.client.id}`, form);
      setClients(prev => prev.map(c => c.id===updated.id ? updated : c));
      toast.success('Client updated');
    } else {
      const created = await api.post('/clients', form);
      setClients(prev => [created, ...prev]);
      toast.success('Client added');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/clients/${del.id}`);
    setClients(prev => prev.filter(c => c.id!==del.id));
    toast.success('Client deleted');
  };

  const initials = (name) => (name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Clients</h1><p className="text-sm text-muted">{clients.length} clients</p></div>
        <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15}/> Add Client</button>
      </div>

      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <div className="search-bar"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…" /></div>
        {['all','active','inactive','prospect'].map(s => (
          <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><Spinner /></div> :
       filtered.length===0 ? (
        <div className="card">
          <EmptyState icon={<div className="empty-state-icon"><Building2 size={24}/></div>}
            title="No clients found" description={search?'Try a different search':'Add your first client'}
            action={<button className="btn btn-primary" onClick={()=>setModal('add')}><Plus size={14}/> Add Client</button>} />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1rem' }}>
          {filtered.map(c => (
            <div key={c.id} className="card" style={{ padding:0, overflow:'hidden', position:'relative' }}>
              {/* Colour accent bar */}
              <div style={{ height:4, background:c.color||'var(--teal)', width:'100%' }} />
              <div style={{ padding:'1.1rem 1.25rem' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', marginBottom:'0.75rem' }}>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.company_name}
                      onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='grid';}}
                      className="client-avatar-logo" />
                  ) : null}
                  <div className="client-avatar-initials" style={{ background:c.color||'var(--teal)', display: c.logo_url ? 'none' : 'grid' }}>
                    {initials(c.company_name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:'var(--text)', fontSize:'0.95rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.company_name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text3)' }}>{c.contact_name||'—'}</div>
                  </div>
                  <div style={{ display:'flex', gap:'0.3rem', flexShrink:0 }}>
                    <button className="btn btn-ghost btn-icon" onClick={()=>setModal({client:c})} title="Edit"><Edit2 size={13}/></button>
                    <button className="btn btn-danger btn-icon" onClick={()=>setDel(c)} title="Delete"><Trash2 size={13}/></button>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'0.6rem' }}>
                  <Badge status={c.status}/>
                  {c.industry && <span style={{ fontSize:'0.72rem', color:'var(--text3)', background:'var(--surface2)', padding:'2px 7px', borderRadius:99, border:'1px solid var(--border)' }}>{c.industry}</span>}
                </div>
                {c.email && <div style={{ fontSize:'0.75rem', color:'var(--text3)', marginBottom:'0.2rem' }}>✉ {c.email}</div>}
                {c.location && <div style={{ fontSize:'0.75rem', color:'var(--text3)' }}>📍 {c.location}</div>}
                {c.portal_email && <div style={{ fontSize:'0.72rem', color:'#059669', marginTop:'0.4rem' }}>● Portal active</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.client?'Edit Client':'Add New Client'} size="modal-lg">
        {modal && <ClientForm initial={modal?.client?{...modal.client,allowed_message_user_ids:modal.client.allowed_message_user_ids||[],color:modal.client.color||'#0D4F55',logo_url:modal.client.logo_url||''}:undefined} users={users} onSave={handleSave} onClose={()=>setModal(null)} />}
      </Modal>
      <Confirm open={!!del} onClose={()=>setDel(null)} onConfirm={handleDelete} title="Delete Client" message={`Delete "${del?.company_name}"? This cannot be undone.`} danger />
    </>
  );
};
