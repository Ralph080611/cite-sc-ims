import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import Field from '../../components/common/Field.jsx';
import PasswordField from '../../components/common/PasswordField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const empty = { fullName: '', idNumber: '', organization: '', email: '', password: '', confirmPassword: '' };

export default function StudentRegister() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const res = await register(form);
    setBusy(false);
    if (!res.ok) { setErrors(res.errors || {}); return setMsg({ type: 'danger', text: 'Please fix the highlighted fields.' }); }
    nav('/login', { replace: true, state: { registered: true } });
  };

  return (
    <AuthLayout title="Create Student / Organization Account" subtitle="Registration creates a student/organization account only."
      footer={<span>Already registered? <Link to="/login">Sign in</Link></span>}>
      {msg && <div className={`alert alert-${msg.type}`} role="alert">{msg.text}</div>}
      <form onSubmit={submit} noValidate>
        <Field id="fullName" label="Full Name" value={form.fullName} onChange={set} error={errors.fullName} autoComplete="name" />
        <div className="row">
          <div className="col-md-6"><Field id="idNumber" label="ID Number" value={form.idNumber} onChange={set} error={errors.idNumber} /></div>
          <div className="col-md-6"><Field id="organization" label="Organization / Department" value={form.organization} onChange={set} error={errors.organization} /></div>
        </div>
        <Field id="email" type="email" label="Email Address" value={form.email} onChange={set} error={errors.email} autoComplete="email" />
        <PasswordField id="password" label="Password" value={form.password} onChange={set} error={errors.password} autoComplete="new-password" />
        <PasswordField id="confirmPassword" label="Confirm Password" value={form.confirmPassword} onChange={set} error={errors.confirmPassword} autoComplete="new-password" />
        <p className="form-text mt-0">Password: 8+ characters with upper and lower case letters and a number.</p>
        <button className="btn btn-primary w-100" disabled={busy}>
          {busy ? <><span className="spinner-border spinner-border-sm me-2" />Creating account…</> : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  );
}
