import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, UserX, UserCheck, Users } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, Avatar, fmtDate, toast } from '../../components/ui';

const roleColors = { admin: '#7c5cfc', professional: '#3b82f6', client: '#22c55e' };

const UserForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { name: '', email: '', password: '', role: 'professional', backup_email: '', is_active: true });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.name} onChange={set('name')} required placeholder="Hassan Ehsan" />
        </div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select className="form-select" value={form.role} onChange={set('role')}>
            <option value="admin">Admin</option>
            <option value="professional">Professional</option>
            <option value="client">Client</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={form.email} onChange={set('email')} required placeholder="user@filmelo.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Backup Email</label>
          <input className="form-input" type="email" value={form.backup_email} onChange={set('backup_email')} placeholder="backup@gmail.com" />
        </div>
      </div>
      {!initial && (
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input className="form-input" type="password" value={form.password} onChange={set('password')} required placeholder="Min 8 characters" />
          <div className="form-hint">The user can change this after first login.</div>
        </div>
      )}
      {initial && (
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={set('is_active')} />
            <span className="form-label" style={{ margin: 0 }}>Account Active</span>
          </label>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Create User')}
        </button>
      </div>
    </form>
  );
};

export const TeamPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [deactivate, setDeactivate] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.get('/users')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const ms = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const mf = roleFilter === 'all' || u.role === roleFilter;
    return ms && mf;
  });

  const handleSave = async (form) => {
    if (modal?.user) {
      const updated = await api.put(`/users/${modal.user.id}`, form);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      toast.success('User updated');
    } else {
      const created = await api.post('/users', form);
      setUsers(prev => [created, ...prev]);
      toast.success('User created');
    }
  };

  const handleDeactivate = async () => {
    await api.delete(`/users/${deactivate.id}`);
    setUsers(prev => prev.map(u => u.id === deactivate.id ? { ...u, is_active: false } : u));
    toast.success('User deactivated');
  };

  const counts = { all: users.length, admin: users.filter(u => u.role === 'admin').length, professional: users.filter(u => u.role === 'professional').length, client: users.filter(u => u.role === 'client').length };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Team</h1>
          <p className="text-sm text-muted">{users.length} total users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15}/> Add User</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search-bar"><Search size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" /></div>
        {['all','admin','professional','client'].map(r => (
          <button key={r} className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter(r)}>
            {r.charAt(0).toUpperCase() + r.slice(1)} ({counts[r]})
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={40}/>} title="No users found" description="Add team members to get started" action={<button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> Add User</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Avatar initials={u.avatar_initials || u.name?.[0] || '?'} size="sm" />
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: roleColors[u.role], background: `${roleColors[u.role]}22`, padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.is_active !== false
                        ? <span style={{ fontSize: '0.78rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />Active</span>
                        : <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>Inactive</span>}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{fmtDate(u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setModal({ user: u })} title="Edit"><Edit2 size={13}/></button>
                        {u.is_active !== false && (
                          <button className="btn btn-danger btn-icon" onClick={() => setDeactivate(u)} title="Deactivate"><UserX size={13}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.user ? 'Edit User' : 'Add User'} size="modal-lg">
        {modal && <UserForm initial={modal?.user} onSave={handleSave} onClose={() => setModal(null)} />}
      </Modal>
      <Confirm open={!!deactivate} onClose={() => setDeactivate(null)} onConfirm={handleDeactivate} title="Deactivate User" message={`Deactivate "${deactivate?.name}"? They will lose access to the system.`} danger />
    </>
  );
};
