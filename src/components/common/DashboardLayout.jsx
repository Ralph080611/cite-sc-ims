import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import Brand from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useData } from '../../context/DataContext.jsx';

// `links` is [{ to, label, icon, end? }]. Each module adds its entry to the role's nav config.
export default function DashboardLayout({ links, roleLabel, home }) {
  const { user, logout } = useAuth();
  const { db } = useData();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const doLogout = () => { logout(); nav(home === '/admin' ? '/admin/login' : '/login', { replace: true }); };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-head"><Brand to={home} /><button className="icon-btn d-lg-none" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <nav className="sidebar-nav">
          {links.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} /><span>{label}</span>
              {badge && badge(db) > 0 && <span className="nav-badge" aria-label={`${badge(db)} pending`}>{badge(db)}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="side-link logout" onClick={doLogout}><LogOut size={18} /><span>Logout</span></button>
      </aside>
      {open && <div className="scrim d-lg-none" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn d-lg-none" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="topbar-spacer" />
          <ThemeToggle />
          <div className="user-chip"><strong>{user.fullName}</strong><small>{roleLabel}</small></div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
