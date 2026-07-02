import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, CheckSquare, FileText, Receipt,
  Activity, Settings, LogOut, Building2, MessageSquare, HardDrive,
  ClipboardList, Film, Users2, TrendingUp, DollarSign, BarChart2, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

const ADMIN_MAIN = [
  { label:'Dashboard',     icon:LayoutDashboard, to:'/admin' },
  { label:'Clients',       icon:Building2,       to:'/admin/clients' },
  { label:'Projects',      icon:Briefcase,       to:'/admin/projects' },
  { label:'Tasks',         icon:CheckSquare,     to:'/admin/tasks' },
  { label:'Deliverables',  icon:Film,            to:'/admin/deliverables' },
];
const ADMIN_REPORTS = [
  { label:'Reports',       icon:FileText,        to:'/admin/reports' },
  { label:'Daily Reports', icon:ClipboardList,   to:'/admin/dailyreports' },
  { label:'Invoices',      icon:Receipt,         to:'/admin/invoices' },
];
const ADMIN_COMMS = [
  { label:'Messages',      icon:MessageSquare,   to:'/admin/messages' },
  { label:'Team Chat',     icon:Users2,          to:'/admin/teamchat' },
  { label:'Google Drive',  icon:HardDrive,       to:'/admin/drive' },
];
const ADMIN_BUSINESS = [
  { label:'Sales Pipeline',icon:TrendingUp,      to:'/admin/sales' },
  { label:'Accounting',    icon:BarChart2,       to:'/admin/accounting' },
  { label:'Pro Earnings',  icon:DollarSign,      to:'/admin/earnings' },
];
const ADMIN_MANAGE = [
  { label:'Team',          icon:Users,           to:'/admin/team' },
  { label:'Activity',      icon:Activity,        to:'/admin/activity' },
  { label:'Monthly Export',icon:Download,        to:'/admin/export' },
  { label:'Settings',      icon:Settings,        to:'/admin/settings' },
];

const PROF_NAV = [
  { label:'Dashboard',     icon:LayoutDashboard, to:'/professional' },
  { label:'Projects',      icon:Briefcase,       to:'/professional/projects' },
  { label:'My Tasks',      icon:CheckSquare,     to:'/professional/tasks' },
  { label:'Deliverables',  icon:Film,            to:'/professional/deliverables' },
  { label:'Reports',       icon:FileText,        to:'/professional/reports' },
  { label:'Daily Reports', icon:ClipboardList,   to:'/professional/dailyreports' },
  { label:'My Earnings',   icon:DollarSign,      to:'/professional/earnings' },
  { label:'Messages',      icon:MessageSquare,   to:'/professional/messages' },
  { label:'Team Chat',     icon:Users2,          to:'/professional/teamchat' },
  { label:'Google Drive',  icon:HardDrive,       to:'/professional/drive' },
  { label:'Settings',      icon:Settings,        to:'/professional/settings' },
];

const CLIENT_NAV = [
  { label:'Dashboard',     icon:LayoutDashboard, to:'/client' },
  { label:'Projects',      icon:Briefcase,       to:'/client/projects' },
  { label:'Deliverables',  icon:Film,            to:'/client/deliverables' },
  { label:'Reports',       icon:FileText,        to:'/client/reports' },
  { label:'Invoices',      icon:Receipt,         to:'/client/invoices' },
  { label:'Messages',      icon:MessageSquare,   to:'/client/messages' },
  { label:'Settings',      icon:Settings,        to:'/client/settings' },
];

const roleLabels = { admin:'Admin Portal', professional:'Professional', client:'Client Portal' };

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const role = user?.role;

  const sections =
    role === 'admin' ? [
      { label:'Main',          items:ADMIN_MAIN },
      { label:'Reports',       items:ADMIN_REPORTS },
      { label:'Communication', items:ADMIN_COMMS },
      { label:'Business',      items:ADMIN_BUSINESS },
      { label:'Management',    items:ADMIN_MANAGE },
    ] :
    role === 'professional' ? [{ label:'Navigation', items:PROF_NAV }] :
    [{ label:'Navigation', items:CLIENT_NAV }];

  const isActive = (to) => {
    if (to.split('/').length === 2) return loc.pathname === to;
    return loc.pathname.startsWith(to);
  };

  const dashLink = role === 'admin' ? '/admin'
    : role === 'professional' ? '/professional' : '/client';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor:'pointer' }} onClick={() => navigate(dashLink)}>
        <div className="fm-logo-mark" />
        <div>
          <div className="sidebar-logo-text">Filmelo</div>
          <span className={`sidebar-logo-role role-${role}`}>{roleLabels[role]}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex:1 }}>
        {sections.map(sec => (
          <div key={sec.label}>
            <div className="sidebar-section-label">{sec.label}</div>
            {sec.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                end={item.to.split('/').length === 2}
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
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
    </div>
  );
};
