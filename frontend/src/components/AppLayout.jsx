import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, Sun, Moon, Trash2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { timeAgo } from './ui';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/admin':'Dashboard','/admin/clients':'Clients','/admin/projects':'Projects',
  '/admin/tasks':'Tasks','/admin/reports':'Reports','/admin/invoices':'Invoices',
  '/admin/team':'Team','/admin/activity':'Activity Log','/admin/settings':'Settings',
  '/admin/messages':'Messages','/admin/teamchat':'Team Chat','/admin/drive':'Google Drive',
  '/admin/dailyreports':'Daily Reports','/admin/deliverables':'Deliverables',
  '/admin/sales':'Sales Pipeline','/admin/accounting':'Accounting','/admin/earnings':'Pro Earnings',
  '/admin/more':'More',
  '/professional':'Dashboard','/professional/projects':'Projects',
  '/professional/tasks':'My Tasks','/professional/reports':'Reports',
  '/professional/settings':'Settings','/professional/messages':'Messages',
  '/professional/teamchat':'Team Chat','/professional/drive':'Google Drive',
  '/professional/dailyreports':'Daily Reports','/professional/deliverables':'Deliverables',
  '/professional/earnings':'My Earnings',
  '/client':'Dashboard','/client/projects':'My Projects','/client/reports':'Reports',
  '/client/invoices':'Invoices','/client/settings':'Settings','/client/messages':'Messages',
  '/client/deliverables':'Deliverables',
};

const NotifPanel = ({ onClose, onCountChange }) => {
  const [notifs, setNotifs] = useState([]);
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/notifications').then(setNotifs).catch(() => {});
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const markRead = async (n) => {
    await api.put(`/notifications/${n.id}/read`).catch(() => {});
    setNotifs(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    onCountChange?.();
    if (n.link) { navigate(n.link); onClose(); }
  };

  const clearOne = async (e, id) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`).catch(() => {});
    setNotifs(p => p.filter(x => x.id !== id));
    onCountChange?.();
  };

  const clearAll = async () => {
    await api.delete('/notifications').catch(() => {});
    setNotifs([]);
    onCountChange?.();
  };

  const markAll = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    onCountChange?.();
  };

  const typeColors = {
    task: '#3b82f6', report: '#059669', message: 'var(--teal)',
    deliverable: '#8b5cf6', remark: 'var(--pink)', info: 'var(--text3)'
  };

  return (
    <div className="notif-panel" ref={ref}>
      <div className="notif-panel-header">
        <span>Notifications ({notifs.length})</span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }} onClick={markAll}>Read all</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', color: 'var(--pink)' }} onClick={clearAll}>
            <Trash2 size={11} /> Clear
          </button>
        </div>
      </div>
      {notifs.length === 0
        ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.82rem' }}>All caught up ✓</div>
        : notifs.map(n => (
          <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}
            onClick={() => markRead(n)}
            style={{ borderLeft: `3px solid ${typeColors[n.type] || 'var(--border)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="notif-item-title">{n.title}</div>
              <button onClick={(e) => clearOne(e, n.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', padding: '0 2px', marginLeft: '0.5rem', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
            <div className="notif-item-msg">{n.message}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="notif-item-time">{timeAgo(n.created_at)}</div>
              {n.link && <span style={{ fontSize: '0.65rem', color: 'var(--teal)', fontWeight: 600 }}>Tap →</span>}
            </div>
          </div>
        ))
      }
    </div>
  );
};

export const AppLayout = ({ children }) => {
  const { theme, toggleTheme, user } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = () => {
    api.get('/notifications').then(d => setUnread(d.filter(n => !n.is_read).length)).catch(() => {});
  };

  useEffect(() => { loadUnread(); }, [loc.pathname]);

  const title = Object.entries(PAGE_TITLES)
    .find(([k]) => loc.pathname === k || loc.pathname.startsWith(k + '/'))?.[1] || 'Filmelo';

  const dashLink = user?.role === 'admin' ? '/admin'
    : user?.role === 'professional' ? '/professional' : '/client';

  return (
    <div className="app-layout">
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      <div className="main-area">
        <header className="topbar">
          {/* FM logo → dashboard */}
          <Link to={dashLink} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div className="fm-logo-mark" style={{ width: 30, height: 30 }} />
          </Link>

          <div className="topbar-title">{title}</div>

          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="topbar-icon-btn" onClick={() => setNotifOpen(o => !o)}>
                <Bell size={15} />
                {unread > 0 && <span className="notif-dot" />}
              </button>
              {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)} onCountChange={loadUnread} />}
            </div>
          </div>
        </header>

        {/* Page content — add bottom padding on mobile for nav bar */}
        <main className="page mobile-page-pad">
          {children}
        </main>

        {/* Mobile bottom nav — shown only on mobile via CSS */}
        <div className="mobile-bottom-nav">
          <MobileNav />
        </div>
      </div>
    </div>
  );
};
