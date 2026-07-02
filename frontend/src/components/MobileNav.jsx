import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, CheckSquare, FileText,
  MessageSquare, Film, Receipt, Users, Settings, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_TABS = [
  { label:'Home',     icon:LayoutDashboard, to:'/admin' },
  { label:'Projects', icon:Briefcase,       to:'/admin/projects' },
  { label:'Tasks',    icon:CheckSquare,     to:'/admin/tasks' },
  { label:'Messages', icon:MessageSquare,   to:'/admin/messages' },
  { label:'More',     icon:Menu,            to:'/admin/more' },
];
const PROF_TABS = [
  { label:'Home',     icon:LayoutDashboard, to:'/professional' },
  { label:'Tasks',    icon:CheckSquare,     to:'/professional/tasks' },
  { label:'Deliver.', icon:Film,            to:'/professional/deliverables' },
  { label:'Messages', icon:MessageSquare,   to:'/professional/messages' },
  { label:'Reports',  icon:FileText,        to:'/professional/dailyreports' },
];
const CLIENT_TABS = [
  { label:'Home',     icon:LayoutDashboard, to:'/client' },
  { label:'Projects', icon:Briefcase,       to:'/client/projects' },
  { label:'Deliver.', icon:Film,            to:'/client/deliverables' },
  { label:'Reports',  icon:FileText,        to:'/client/reports' },
  { label:'Messages', icon:MessageSquare,   to:'/client/messages' },
];

export const MobileNav = () => {
  const { user } = useAuth();
  const loc = useLocation();
  const role = user?.role;

  const tabs = role === 'admin' ? ADMIN_TABS
    : role === 'professional' ? PROF_TABS
    : CLIENT_TABS;

  const isActive = (to) => {
    if (to.split('/').length === 2) return loc.pathname === to;
    return loc.pathname.startsWith(to);
  };

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--sidebar-bg)',
      borderTop: '1.5px solid var(--sidebar-border)',
      display: 'flex',
      zIndex: 300,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = isActive(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px 6px',
              gap: 3,
              color: active ? 'var(--lime)' : 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              fontSize: '0.6rem',
              fontWeight: active ? 700 : 500,
              fontFamily: 'var(--font-display)',
              transition: 'color 0.15s',
              minHeight: 52,
            }}
            end={tab.to.split('/').length === 2}
          >
            <tab.icon size={active ? 20 : 18} strokeWidth={active ? 2.5 : 1.8} />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
};
