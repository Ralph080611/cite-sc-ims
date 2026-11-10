import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import Field from '../../components/common/Field.jsx';
import PasswordField from '../../components/common/PasswordField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function StudentLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ idNumber: '', password: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(loc.state?.registered ? { type: 'success', text: 'Registration successful. Please sign in.' } : null);
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (!form.idNumber.trim()) er.idNumber = 'ID number is required.';
    if (!form.password) er.password = 'Password is required.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true); setMsg(null);
    const res = await login(form.idNumber, form.password, 'student');
    setBusy(false);
    if (!res.ok) return setMsg({ type: 'danger', text: res.error });
    nav(loc.state?.from?.startsWith('/student') ? loc.state.from : '/student', { replace: true });
  };

  return (
    <AuthLayout title="Student / Teacher Sign In" subtitle="Use your registered ID number to continue."
      footer={<><span>No account? <Link to="/register">Create one</Link></span><span><Link to="/admin/login">Administrator login</Link></span></>}>
      {msg && <div className={`alert alert-${msg.type}`} role="alert">{msg.text}</div>}
      <form onSubmit={submit} noValidate>
        <Field id="idNumber" label="ID Number" value={form.idNumber} onChange={set} error={errors.idNumber} autoComplete="username" />
        <PasswordField id="password" label="Password" value={form.password} onChange={set} error={errors.password} autoComplete="current-password" />
        <button className="btn btn-primary w-100" disabled={busy}>
          {busy ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  );
}
