import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Spinner } from '../components/ui';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react';

// Animated floating dots for brand panel
const FloatingDots = () => {
  const dots = Array.from({ length: 12 }, (_, i) => ({
    size: Math.random() * 14 + 6,
    left: Math.random() * 90 + 5,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 8,
  }));
  return (
    <div className="auth-floating-dots">
      {dots.map((d, i) => (
        <div key={i} className="auth-dot" style={{
          width: d.size, height: d.size,
          left: `${d.left}%`, bottom: '-20px',
          animationDelay: `${d.delay}s`,
          animationDuration: `${d.duration}s`,
        }} />
      ))}
    </div>
  );
};

const BrandPanel = () => (
  <div className="auth-brand">
    <FloatingDots />
    <div className="auth-brand-orb o1" />
    <div className="auth-brand-orb o2" />
    <div className="auth-brand-content">
      <div className="auth-brand-logo">
        <span className="auth-brand-logo-text">FM</span>
      </div>
      <h2>Filmelo Media</h2>
      <p>Your all-in-one agency management system — clients, projects, tasks and reports in one place.</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
        {['Client Portals', 'Kanban Tasks', 'Reports', 'Invoices'].map(f => (
          <div key={f} style={{ background: 'rgba(212,232,0,0.12)', border: '1px solid rgba(212,232,0,0.25)', borderRadius: 99, padding: '4px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={11} style={{ color: '#D4E800' }} /> {f}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, icon: Icon, required, hint }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />}
        <input
          className="form-input"
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{ paddingLeft: Icon ? '2.25rem' : '0.9rem', paddingRight: isPassword ? '2.5rem' : '0.9rem' }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            {show ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        )}
      </div>
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
};

export const LoginPage = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') nav('/admin');
      else if (user.role === 'professional') nav('/professional');
      else nav('/client');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-root">
      <BrandPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="fm-logo-mark lg" />
            <div className="auth-logo-text-block">
              <div className="auth-logo-name">Filmelo Media</div>
              <div className="auth-logo-sub">Agency Management System</div>
            </div>
          </div>
          <h2 style={{ marginBottom: '0.25rem' }}>Welcome back</h2>
          <p style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>Sign in to your account to continue</p>
          <form onSubmit={handleSubmit}>
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@filmelo.com" icon={Mail} required />
            <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon={Lock} required />
            {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div style={{ textAlign: 'right', marginBottom: '1.1rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 600 }}>Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><Spinner />&nbsp;Signing in…</> : 'Sign In'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text3)' }}>
            New to Filmelo? <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600 }}>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', backup_email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/register', { name: form.name, email: form.email, password: form.password, backup_email: form.backup_email });
      const user = await login(form.email, form.password);
      if (user.role === 'admin') nav('/admin');
      else if (user.role === 'professional') nav('/professional');
      else nav('/client');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-root">
      <BrandPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="fm-logo-mark lg" />
            <div className="auth-logo-text-block">
              <div className="auth-logo-name">Filmelo Media</div>
              <div className="auth-logo-sub">Agency Management System</div>
            </div>
          </div>
          <h2 style={{ marginBottom: '0.25rem' }}>Create account</h2>
          <p style={{ marginBottom: '1.75rem' }}>Join the Filmelo team</p>
          <form onSubmit={handleSubmit}>
            <InputField label="Full Name" value={form.name} onChange={set('name')} placeholder="Hassan Ehsan" icon={User} required />
            <InputField label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@filmelo.com" icon={Mail} required />
            <InputField label="Backup Email" type="email" value={form.backup_email} onChange={set('backup_email')} placeholder="backup@gmail.com" icon={Mail} hint="For password resets" />
            <InputField label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" icon={Lock} required />
            <InputField label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" icon={Lock} required />
            {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><Spinner />&nbsp;Creating account…</> : 'Create Account'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text3)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); }
    catch {}
    finally { setSent(true); setLoading(false); }
  };

  return (
    <div className="auth-root">
      <BrandPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="fm-logo-mark lg" />
            <div className="auth-logo-text-block">
              <div className="auth-logo-name">Filmelo Media</div>
              <div className="auth-logo-sub">Agency Management System</div>
            </div>
          </div>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 56, height: 56, background: 'rgba(5,150,105,0.1)', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 1rem', color: '#059669' }}>
                <Mail size={24} />
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Check your email</h2>
              <p style={{ marginBottom: '1.5rem' }}>If <strong>{email}</strong> is registered, a reset link has been sent — including to any backup email on file.</p>
              <Link to="/login" className="btn btn-secondary" style={{ display: 'inline-flex' }}><ArrowLeft size={13}/> Back to login</Link>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: '0.25rem' }}>Reset password</h2>
              <p style={{ marginBottom: '1.75rem' }}>Enter your email and we'll send a reset link</p>
              <form onSubmit={handleSubmit}>
                <InputField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@filmelo.com" icon={Mail} required />
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <><Spinner />&nbsp;Sending…</> : 'Send Reset Link'}
                </button>
              </form>
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link to="/login" style={{ fontSize: '0.84rem', color: 'var(--teal)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={13}/> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try { await api.post('/auth/reset-password', { token, password }); setSuccess(true); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-root">
      <BrandPanel />
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="fm-logo-mark lg" />
            <div className="auth-logo-text-block">
              <div className="auth-logo-name">Filmelo Media</div>
              <div className="auth-logo-sub">Agency Management System</div>
            </div>
          </div>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>Password updated!</h2>
              <p style={{ marginBottom: '1.5rem' }}>Your password has been changed successfully.</p>
              <button className="btn btn-primary btn-lg" onClick={() => nav('/login')}>Sign In</button>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: '0.25rem' }}>New password</h2>
              <p style={{ marginBottom: '1.75rem' }}>Choose a strong password for your account</p>
              <form onSubmit={handleSubmit}>
                <InputField label="New Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" icon={Lock} required />
                <InputField label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" icon={Lock} required />
                {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <><Spinner />&nbsp;Saving…</> : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
