import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, ShieldCheck, ArrowLeftRight, Wrench, History, BarChart3, Users, Menu, X } from 'lucide-react';
import { useState } from 'react';
import logo from '../../assets/logo.png';
import { useData } from '../../context/DataContext.jsx';
import Brand from '../../components/common/Brand.jsx';
import ThemeToggle from '../../components/common/ThemeToggle.jsx';

const FEATURES = [
  [Boxes, 'Inventory Monitoring', 'Track total, available, borrowed and damaged stock for every item.'],
  [ClipboardList, 'Item Borrowing Requests', 'Submit requests online with purpose, dates and quantities.'],
  [ShieldCheck, 'Request Approval and Tracking', 'Administrators approve or reject requests with recorded remarks.'],
  [ArrowLeftRight, 'Borrowing and Return Management', 'Release items, support partial returns and monitor overdue items.'],
  [Wrench, 'Damage and Maintenance Monitoring', 'Damaged and lost items stay out of available stock until restored.'],
  [History, 'Transaction History', 'An append-only audit trail of every important action.'],
  [BarChart3, 'Inventory Reports', 'Printable reports with CSV export from live data.'],
  [Users, 'User and Organization Management', 'Manage registered students and organizations.'],
];

export default function Landing() {
  const { db } = useData();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="landing">
      <header className="lp-nav">
        <Brand />
        <nav className={`lp-links ${open ? 'open' : ''}`} aria-label="Primary">
          <a href="#home" onClick={close}>Home</a><a href="#about" onClick={close}>About</a>
          <a href="#features" onClick={close}>Features</a><a href="#contact" onClick={close}>Contact</a>
          <Link to="/login" onClick={close}>Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Get Started</Link>
        </nav>
        <div className="lp-actions"><ThemeToggle />
          <button className="icon-btn lp-burger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </header>

      <section id="home" className="hero">
        <div className="hero-copy">
          <span className="eyebrow">College of Information Technology Education Student Council</span>
          <h1>Smart Inventory. Organized Resources. Efficient Management.</h1>
          <p>A centralized inventory management platform designed to help the College of Information Technology Education Student Council efficiently monitor organizational assets, manage borrowing requests, track returns, and maintain accurate inventory records.</p>
          <div className="hero-btns">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
            <Link to="/login" className="btn btn-outline-primary btn-lg">Student / Teacher Sign In</Link>
            <Link to="/admin/login" className="btn btn-dark btn-lg">Administrator Login</Link>
          </div>
        </div>
        <div className="hero-visual">
          <img src={logo} alt="College of Information Technology Education Student Council official seal" className="hero-seal" width="260" height="260" />
          <div className="hv-row" aria-hidden="true">
            <div className="hv-card"><Boxes size={22} /><b>Inventory</b><span>{db.items.filter((i) => !i.archived).length} item types tracked</span></div>
          <div className="hv-card"><ClipboardList size={22} /><b>Requests</b><span>Pending → Approved → Released</span></div>
          <div className="hv-card"><ArrowLeftRight size={22} /><b>Returns</b><span>Good · Damaged · Lost</span></div>
          </div>
        </div>
      </section>

      <section id="features" className="lp-section">
        <h2>Features</h2>
        <div className="feature-grid">
          {FEATURES.map(([Icon, t, d]) => (
            <div className="feature" key={t}><div className="stat-icon"><Icon size={20} /></div><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section id="about" className="lp-section alt">
        <h2>About the System</h2>
        <p className="lead-text">This system replaces paper logbooks and scattered spreadsheets with one organized record of CITE-SC equipment, supplies and organizational resources. Officers and member organizations request items online; administrators approve, release and receive them back, and every step updates the same inventory so stock counts stay accurate and every action is traceable.</p>
      </section>

      <section id="contact" className="lp-section">
        <h2>Contact</h2>
        <p className="lead-text">College of Information Technology Education Student Council — visit the CITE-SC office or send an inquiry to <a href="mailto:citesc.nvsubayombong@gmail.com">citesc.nvsubayombong@gmail.com</a>.</p>
      </section>

      <footer className="lp-footer">
        <div><Brand /><p>Web-Based Inventory Management System of the College of Information Technology Education Student Council.</p><p className="small">A Software Engineering Project Protoype.</p></div>
        <div className="foot-links"><a href="#home">Home</a><a href="#about">About</a><a href="#features">Features</a><a href="#contact">Contact</a><Link to="/login">Sign In</Link><Link to="/admin/login">Administrator</Link></div>
        <div className="small">© {new Date().getFullYear()} CITE-SC · College of Information Technology Education</div>
      </footer>
    </div>
  );
}
