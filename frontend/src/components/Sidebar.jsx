import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, CheckSquare,
  FileText, Receipt, Activity, Settings, LogOut,
  Building2, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

const ADMIN_MAIN = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  { label: 'Clients',   icon: Building2,       to: '/admin/clients' },
  { label: 'Projects',  icon: Briefcase,        to: '/admin/projects' },
  { label: 'Tasks',     icon: CheckSquare,      to: '/admin/tasks' },
  { label: 'Reports',   icon: FileText,         to: '/admin/reports' },
  { label: 'Invoices',  icon: Receipt,          to: '/admin/invoices' },
  { label: 'Messages',  icon: MessageSquare,    to: '/admin/messages' },
];
const ADMIN_MANAGE = [
  { label: 'Team',      icon: Users,            to: '/admin/team' },
  { label: 'Activity',  icon: Activity,         to: '/admin/activity' },
  { label: 'Settings',  icon: Settings,         to: '/admin/settings' },
];
const PROF_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard,  to: '/professional' },
  { label: 'Projects',  icon: Briefcase,        to: '/professional/projects' },
  { label: 'My Tasks',  icon: CheckSquare,      to: '/professional/tasks' },
  { label: 'Reports',   icon: FileText,         to: '/professional/reports' },
  { label: 'Messages',  icon: MessageSquare,    to: '/professional/messages' },
  { label: 'Settings',  icon: Settings,         to: '/professional/settings' },
];
const CLIENT_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard,  to: '/client' },
  { label: 'Projects',  icon: Briefcase,        to: '/client/projects' },
  { label: 'Reports',   icon: FileText,         to: '/client/reports' },
  { label: 'Invoices',  icon: Receipt,          to: '/client/invoices' },
  { label: 'Messages',  icon: MessageSquare,    to: '/client/messages' },
  { label: 'Settings',  icon: Settings,         to: '/client/settings' },
];

const roleLabels = { admin: 'Admin Portal', professional: 'Professional', client: 'Client Portal' };

export const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const role = user?.role;

  const sections =
    role === 'admin'        ? [{ label: 'Main',       items: ADMIN_MAIN }, { label: 'Management', items: ADMIN_MANAGE }] :
    role === 'professional' ? [{ label: 'Navigation', items: PROF_NAV }] :
                              [{ label: 'Navigation', items: CLIENT_NAV }];

  const isActive = (to) => {
    if (to.split('/').length === 2) return loc.pathname === to;
    return loc.pathname.startsWith(to);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="fm-logo-mark" />
        <div>
          <div className="sidebar-logo-text">Filmelo</div>
          <span className={`sidebar-logo-role role-${role}`}>{roleLabels[role]}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(sec => (
          <div key={sec.label}>
            <div className="sidebar-section-label">{sec.label}</div>
            {sec.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                onClick={onClose}
                end={item.to.split('/').length === 2}
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <Avatar initials={user?.avatar_initials || user?.name?.[0] || '?'} size="sm" />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">{role}</div>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Sign out">
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
};
