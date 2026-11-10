import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import Field from '../../components/common/Field.jsx';
import PasswordField from '../../components/common/PasswordField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (!form.username.trim()) er.username = 'Username is required.';
    if (!form.password) er.password = 'Password is required.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true); setMsg(null);
    const res = await login(form.username, form.password, 'admin');
    setBusy(false);
    if (!res.ok) return setMsg({ type: 'danger', text: res.error });
    nav('/admin', { replace: true });
  };

  return (
    <AuthLayout title="Administrator Login" subtitle="Restricted to CITE-SC inventory administrators."
      footer={<span><Link to="/login">Student / Teacher sign in</Link></span>}>
      {msg && <div className="alert alert-danger" role="alert">{msg.text}</div>}
      <form onSubmit={submit} noValidate>
        <Field id="username" label="Username / Administrator ID" value={form.username} onChange={set} error={errors.username} autoComplete="username" />
        <PasswordField id="password" label="Password" value={form.password} onChange={set} error={errors.password} autoComplete="current-password" />
        <button className="btn btn-primary w-100" disabled={busy}>
          {busy ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : 'Sign In as Administrator'}
        </button>
      </form>
    </AuthLayout>
  );
}
