import { useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Field from '../../components/common/Field.jsx';
import PasswordField from '../../components/common/PasswordField.jsx';
import { updateProfile, setPassword } from '../../services/userService.js';
import { passwordIssues } from '../../utils/validation.js';
import { hashPassword } from '../../utils/crypto.js';
import { formatDate } from '../../utils/formatters.js';

export default function MyProfile() {
  const { update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ fullName: user.fullName, organization: user.organization, email: user.email });
  const [errors, setErrors] = useState({});
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' }); const [pwErr, setPwErr] = useState({});

  const save = (e) => {
    e.preventDefault();
    const res = update((d) => updateProfile(d, user.id, f));
    if (res.ok === false) return setErrors(res.errors || {});
    setErrors({}); toast.success('Profile updated.');
  };
  const changePw = async (e) => {
    e.preventDefault();
    const er = {};
    if (!pw.current) er.current = 'Enter your current password.';
    else if ((await hashPassword(pw.current)) !== user.passwordHash) er.current = 'Current password is incorrect.';
    const issues = passwordIssues(pw.next);
    if (issues.length) er.next = `Password needs ${issues.join(', ')}.`;
    if (pw.next !== pw.confirm) er.confirm = 'Passwords do not match.';
    setPwErr(er);
    if (Object.keys(er).length) return;
    const hash = await hashPassword(pw.next);
    update((d) => setPassword(d, user.id, hash));
    setPw({ current: '', next: '', confirm: '' }); toast.success('Password changed.');
  };
  const set = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));

  return (
    <>
      <h1 className="page-title">My Profile</h1>
      <div className="row g-3 mt-1">
        <div className="col-lg-6"><div className="panel">
          <h2 className="h6 fw-bold">Account details</h2>
          <dl className="detail-grid mb-3"><dt>ID Number</dt><dd>{user.idNumber}</dd><dt>Role</dt><dd>Student / Organization</dd><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></dl>
          <form onSubmit={save} noValidate>
            <Field id="fullName" label="Full Name" value={f.fullName} onChange={set} error={errors.fullName} />
            <Field id="organization" label="Organization / Department" value={f.organization} onChange={set} error={errors.organization} />
            <Field id="email" type="email" label="Email Address" value={f.email} onChange={set} error={errors.email} />
            <button className="btn btn-primary">Save Changes</button>
          </form>
        </div></div>
        <div className="col-lg-6"><div className="panel">
          <h2 className="h6 fw-bold">Change password</h2>
          <form onSubmit={changePw} noValidate>
            <PasswordField id="current" label="Current Password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwErr.current} autoComplete="current-password" />
            <PasswordField id="next" label="New Password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwErr.next} autoComplete="new-password" />
            <PasswordField id="confirm" label="Confirm New Password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErr.confirm} autoComplete="new-password" />
            <button className="btn btn-outline-primary">Change Password</button>
          </form>
        </div></div>
      </div>
    </>
  );
}
