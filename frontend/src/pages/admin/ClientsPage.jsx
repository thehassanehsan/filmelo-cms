import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, toast } from '../../components/ui';

const ClientForm = ({ initial, users, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { company_name: '', contact_name: '', email: '', phone: '', industry: '', location: '', status: 'active', notes: '', user_id: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Company Name *</label>
          <input className="form-input" value={form.company_name} onChange={set('company_name')} required placeholder="Filmelo Media" />
        </div>
        <div className="form-group">
          <label className="form-label">Contact Name</label>
          <input className="form-input" value={form.contact_name} onChange={set('contact_name')} placeholder="Hassan Ehsan" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="client@company.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Industry</label>
          <input className="form-input" value={form.industry} onChange={set('industry')} placeholder="Restaurant, Hotel…" />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={form.location} onChange={set('location')} placeholder="Philadelphia, PA" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Portal Account</label>
          <select className="form-select" value={form.user_id || ''} onChange={set('user_id')}>
            <option value="">No portal access</option>
            {(users || []).filter(u => u.role === 'client').map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Client notes, special requirements…" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Add Client')}
        </button>
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
  const [modal, setModal] = useState(null); // null | 'add' | { client }
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([api.get('/clients'), api.get('/users')]);
      setClients(c); setUsers(u);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.company_name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const handleSave = async (form) => {
    if (modal?.client) {
      const updated = await api.put(`/clients/${modal.client.id}`, form);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success('Client updated');
    } else {
      const created = await api.post('/clients', form);
      setClients(prev => [created, ...prev]);
      toast.success('Client added');
    }
  };

  const handleDelete = async () => {
    await api.delete(`/clients/${del.id}`);
    setClients(prev => prev.filter(c => c.id !== del.id));
    toast.success('Client deleted');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Clients</h1>
          <p className="text-sm text-muted">{clients.length} total clients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={15}/> Add Client
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" />
        </div>
        {['all','active','inactive','prospect'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Building2 size={40}/>} title="No clients found" description={search ? 'Try a different search' : 'Add your first client to get started'} action={<button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> Add Client</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Portal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem' }}>{c.company_name}</div>
                      {c.email && <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{c.email}</div>}
                    </td>
                    <td>{c.contact_name || '—'}</td>
                    <td>{c.industry || '—'}</td>
                    <td>{c.location || '—'}</td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      {c.portal_email ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>● Active</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setModal({ client: c })} title="Edit">
                          <Edit2 size={13}/>
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => setDel(c)} title="Delete">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.client ? 'Edit Client' : 'Add New Client'}
        size="modal-lg"
      >
        {modal && (
          <ClientForm
            initial={modal?.client}
            users={users}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${del?.company_name}"? This action cannot be undone.`}
        danger
      />
    </>
  );
};
