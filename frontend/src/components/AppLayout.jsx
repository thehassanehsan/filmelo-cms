import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { timeAgo } from './ui';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/admin': 'Dashboard', '/admin/clients': 'Clients', '/admin/projects': 'Projects',
  '/admin/tasks': 'Tasks', '/admin/reports': 'Reports', '/admin/invoices': 'Invoices',
  '/admin/team': 'Team', '/admin/activity': 'Activity Log', '/admin/settings': 'Settings',
  '/admin/messages': 'Messages',
  '/professional': 'Dashboard', '/professional/projects': 'Projects',
  '/professional/tasks': 'My Tasks', '/professional/reports': 'Reports',
  '/professional/settings': 'Settings', '/professional/messages': 'Messages',
  '/client': 'Dashboard', '/client/projects': 'My Projects', '/client/reports': 'Reports',
  '/client/invoices': 'Invoices', '/client/settings': 'Settings', '/client/messages': 'Messages',
};

const NotifPanel = ({ onClose }) => {
  const [notifs, setNotifs] = useState([]);
  const ref = useRef();

  useEffect(() => {
    api.get('/notifications').then(setNotifs).catch(() => {});
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  };
  const markAll = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="notif-panel" ref={ref}>
    <div className="notif-panel-header">
    <span>Notifications</span>
    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={markAll}>Mark all read</button>
    </div>
    {notifs.length === 0
      ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.82rem' }}>All caught up ✓</div>
      : notifs.map(n => (
        <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
        <div className="notif-item-title">{n.title}</div>
        <div className="notif-item-msg">{n.message}</div>
        <div className="notif-item-time">{timeAgo(n.created_at)}</div>
        </div>
      ))
    }
    </div>
  );
};

export const AppLayout = ({ children }) => {
  const { theme, toggleTheme } = useAuth();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/notifications').then(d => setUnread(d.filter(n => !n.is_read).length)).catch(() => {});
  }, [loc.pathname]);

  const title = Object.entries(PAGE_TITLES)
  .find(([k]) => loc.pathname === k || loc.pathname.startsWith(k + '/'))?.[1] || 'Filmelo CMS';

  return (
    <div className="app-layout">
    {/* ── MOBILE SIDEBAR OVERLAY ── */}
    {sidebarOpen && (
      <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }}
      onClick={() => setSidebarOpen(false)}
      />
    )}

    <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
    <Sidebar onClose={() => setSidebarOpen(false)} />
    </div>

    <div className="main-area">
    <header className="topbar">

    {/* ── MOBILE MENU BUTTON (Fixed!) ── */}
    <button
    className="topbar-icon-btn mobile-menu-toggle"
    onClick={() => setSidebarOpen(true)}
    >
    <Menu size={15} />
    </button>

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
    {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)} />}
    </div>
    </div>
    </header>
    <main className="page">{children}</main>
    </div>
    </div>
  );
};
