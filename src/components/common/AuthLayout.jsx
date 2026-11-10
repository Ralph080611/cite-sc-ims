import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import logo from '../../assets/logo.png';
import ThemeToggle from './ThemeToggle.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-top"><Brand /><ThemeToggle /></div>
      <div className="auth-card">
        <img src={logo} alt="CITE-SC seal" className="auth-logo" width="72" height="72" />
        <h1 className="h3 fw-bold mb-1">{title}</h1>
        <p className="text-muted mb-4">{subtitle}</p>
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
      <Link to="/" className="back-link">← Back to home</Link>
    </div>
  );
}
