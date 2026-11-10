import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

export default function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <img src={logo} alt="CITE-SC seal" className="brand-logo" width="38" height="38" />
      <span className="brand-text">CITE-SC <small>Inventory</small></span>
    </Link>
  );
}
