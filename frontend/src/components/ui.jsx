import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// ── TOAST SYSTEM ──
let toastHandlers = [];
export const toast = {
  success: (msg) => toastHandlers.forEach(h => h({ type: 'success', msg, id: Date.now() })),
  error:   (msg) => toastHandlers.forEach(h => h({ type: 'error',   msg, id: Date.now() })),
  info:    (msg) => toastHandlers.forEach(h => h({ type: 'info',    msg, id: Date.now() })),
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500);
    };
    toastHandlers.push(handler);
    return () => { toastHandlers = toastHandlers.filter(h => h !== handler); };
  }, []);

  const icons = { success: <CheckCircle size={15}/>, error: <AlertCircle size={15}/>, info: <Info size={15}/> };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {icons[t.type]}
          {t.msg}
        </div>
      ))}
    </div>
  );
};

// ── MODAL ──
export const Modal = ({ open, onClose, title, children, size = '', footer }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={14}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ── AVATAR ──
export const Avatar = ({ initials = '?', size = 'md', style = {} }) => (
  <div className={`avatar avatar-${size}`} style={style}>{initials}</div>
);

// ── BADGE ──
export const Badge = ({ status }) => {
  const label = (status || '').replace(/_/g, ' ');
  return <span className={`badge badge-${status}`}>{label}</span>;
};

// ── PRIORITY BADGE ──
export const PriorityBadge = ({ priority }) => (
  <span className={`priority-${priority}`}>{priority}</span>
);

// ── EMPTY STATE ──
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    {icon}
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
  </div>
);

// ── SPINNER ──
export const Spinner = ({ size = '' }) => <div className={`spinner ${size}`} />;

// ── CONFIRM DIALOG ──
export const Confirm = ({ open, onClose, onConfirm, title, message, danger }) => (
  <Modal open={open} onClose={onClose} title={title}
    footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>
          Confirm
        </button>
      </>
    }>
    <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{message}</p>
  </Modal>
);

// ── PROGRESS BAR ──
export const ProgressBar = ({ value, max = 100, color }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
};

// ── DATE FORMAT ──
export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtCurrency = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
};

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};
