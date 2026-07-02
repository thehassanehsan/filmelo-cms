import { Link } from 'react-router-dom';
import {
  Building2, Briefcase, FileText, Receipt, Users, Activity,
  Settings, MessageSquare, HardDrive, ClipboardList, Film,
  Users2, TrendingUp, DollarSign, BarChart2, LogOut, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { label:'Clients',       icon:Building2,    to:'/admin/clients' },
      { label:'Projects',      icon:Briefcase,    to:'/admin/projects' },
      { label:'Deliverables',  icon:Film,         to:'/admin/deliverables' },
    ]
  },
  {
    label: 'Reports & Finance',
    items: [
      { label:'Reports',       icon:FileText,     to:'/admin/reports' },
      { label:'Daily Reports', icon:ClipboardList,to:'/admin/dailyreports' },
      { label:'Invoices',      icon:Receipt,      to:'/admin/invoices' },
      { label:'Accounting',    icon:BarChart2,    to:'/admin/accounting' },
      { label:'Pro Earnings',  icon:DollarSign,   to:'/admin/earnings' },
      { label:'Sales Pipeline',icon:TrendingUp,   to:'/admin/sales' },
    ]
  },
  {
    label: 'Communication',
    items: [
      { label:'Team Chat',     icon:Users2,       to:'/admin/teamchat' },
      { label:'Google Drive',  icon:HardDrive,    to:'/admin/drive' },
    ]
  },
  {
    label: 'Management',
    items: [
      { label:'Team',          icon:Users,        to:'/admin/team' },
      { label:'Activity Log',  icon:Activity,     to:'/admin/activity' },
      { label:'Monthly Export',icon:Download,     to:'/admin/export' },
      { label:'Settings',      icon:Settings,     to:'/admin/settings' },
    ]
  },
];

export const MorePage = () => {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>More</h1>
          <p className="text-sm text-muted">All admin tools</p>
        </div>
      </div>

      {/* User card */}
      <div className="card" style={{ display:'flex', alignItems:'center', gap:'0.85rem', marginBottom:'1.25rem', padding:'1rem 1.1rem' }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--teal)', display:'grid', placeItems:'center', fontFamily:'var(--font-display)', fontWeight:700, color:'var(--lime)', fontSize:'1rem', flexShrink:0 }}>
          {user?.avatar_initials || user?.name?.[0] || '?'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, color:'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize:'0.75rem', color:'var(--text3)' }}>{user?.email}</div>
        </div>
      </div>

      {SECTIONS.map(sec => (
        <div key={sec.label} style={{ marginBottom:'1.1rem' }}>
          <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text3)', marginBottom:'0.5rem', paddingLeft:'0.1rem' }}>
            {sec.label}
          </div>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {sec.items.map((item, i) => (
              <Link key={item.to} to={item.to}
                style={{ display:'flex', alignItems:'center', gap:'0.85rem', padding:'0.85rem 1rem', color:'var(--text)', textDecoration:'none', borderBottom: i < sec.items.length - 1 ? '1px solid var(--border)' : 'none', transition:'background 0.15s' }}
                onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
                onTouchEnd={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width:36, height:36, borderRadius:'var(--radius)', background:'var(--surface2)', display:'grid', placeItems:'center', color:'var(--teal)', flexShrink:0 }}>
                  <item.icon size={16} />
                </div>
                <span style={{ fontWeight:500, fontSize:'0.875rem' }}>{item.label}</span>
                <span style={{ marginLeft:'auto', color:'var(--text3)', fontSize:'1rem' }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Sign out */}
      <button onClick={logout}
        style={{ width:'100%', marginTop:'0.5rem', display:'flex', alignItems:'center', gap:'0.85rem', padding:'0.9rem 1rem', background:'rgba(232,0,138,0.08)', border:'1.5px solid rgba(232,0,138,0.2)', borderRadius:'var(--radius-lg)', color:'var(--pink)', fontWeight:600, cursor:'pointer', fontSize:'0.875rem' }}>
        <LogOut size={16} /> Sign Out
      </button>
    </>
  );
};
