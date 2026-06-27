import { useState, useEffect } from 'react';
import { Activity, Save } from 'lucide-react';
import { api } from '../../utils/api';
import { Avatar, EmptyState, Spinner, toast, timeAgo } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const ActivityPage = () => {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/activity').then(setLog).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  const ACTION_COLOR = {
    login: 'var(--green)', create_user: 'var(--accent)', create_client: 'var(--blue)',
    create_project: 'var(--orange)', create_task: 'var(--yellow)',
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Activity Log</h1>
          <p className="text-sm text-muted">Last 100 events</p>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : log.length === 0 ? (
          <EmptyState icon={<Activity size={40}/>} title="No activity yet" description="Events will appear here as the team uses the system" />
        ) : (
          <div>
            {log.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 0', borderBottom: i < log.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <Avatar initials={a.avatar_initials || a.user_name?.[0] || '?'} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{a.user_name || 'System'}</span>
                    {' '}
                    <span style={{ color: ACTION_COLOR[a.action] || 'var(--text2)', fontWeight: 500 }}>{a.action?.replace(/_/g, ' ')}</span>
                    {a.details?.title && <span style={{ color: 'var(--text3)' }}> — {a.details.title || a.details.name || a.details.company_name}</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.15rem' }}>
                    {a.entity_type && <span style={{ marginRight: '0.5rem', textTransform: 'capitalize' }}>{a.entity_type}</span>}
                    {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export const SettingsPage = () => {
  const { user, loadUser } = useAuth();
  const [form, setForm] = useState({ name: '', backup_email: '', current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (user) setForm(f => ({ ...f, name: user.name || '', backup_email: user.backup_email || '' }));
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password && form.new_password !== form.confirm_password) return toast.error('New passwords do not match');
    setLoading(true);
    try {
      await api.put('/auth/profile', {
        name: form.name,
        backup_email: form.backup_email,
        ...(form.new_password ? { current_password: form.current_password, new_password: form.new_password } : {})
      });
      await loadUser();
      toast.success('Settings saved');
      setForm(f => ({ ...f, current_password: '', new_password: '', confirm_password: '' }));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p className="text-sm text-muted">Manage your account</p>
        </div>
      </div>
      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><div className="card-title">Profile</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Avatar initials={user?.avatar_initials || user?.name?.[0] || '?'} size="xl" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.15rem' }}>{user?.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>{user?.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.15rem', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={set('name')} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">Backup Email</label>
              <input className="form-input" type="email" value={form.backup_email} onChange={set('backup_email')} placeholder="backup@example.com" />
              <div className="form-hint">Used for password reset notifications.</div>
            </div>
            <hr className="divider" />
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', marginBottom: '1rem' }}>Change Password</div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={form.current_password} onChange={set('current_password')} placeholder="••••••••" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={form.new_password} onChange={set('new_password')} placeholder="Min 8 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="Repeat password" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner /> : <><Save size={14}/> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
