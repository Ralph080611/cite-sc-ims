import { useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import Field from '../../components/common/Field.jsx';
import Modal from '../../components/common/Modal.jsx';
import { updateSettings, logReset } from '../../services/settingsService.js';

export default function SettingsPage() {
  const { db, update, reset } = useData();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [f, setF] = useState({ ...db.settings, defaultLowStock: String(db.settings.defaultLowStock) });
  const [errors, setErrors] = useState({});
  const [dlg, setDlg] = useState(false); const [typed, setTyped] = useState('');
  const set = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));

  const save = (e) => {
    e.preventDefault();
    const res = update((d) => updateSettings(d, f, user));
    if (res.ok === false) { setErrors(res.errors || {}); return toast.error(res.error || 'Please fix the highlighted fields.'); }
    setErrors({}); toast.success('Settings saved.');
  };
  const doReset = () => {
    reset();                                   // restore seed data
    update((d) => logReset(d, user));          // record who did it, on the fresh db
    setDlg(false); setTyped('');
    toast.success('Demo data has been reset to the initial seed data.');
  };

  return (
    <>
      <h1 className="page-title">System Settings</h1>
      <div className="row g-3 mt-1">
        <div className="col-lg-7"><div className="panel h-100">
          <h2 className="h6 fw-bold">General</h2>
          <form onSubmit={save} noValidate>
            <Field id="appName" label="Application Name" value={f.appName} onChange={set} error={errors.appName} />
            <Field id="organizationName" label="Organization Name" value={f.organizationName} onChange={set} error={errors.organizationName} />
            <div className="mb-3"><label htmlFor="description" className="form-label">System Description</label><textarea id="description" name="description" rows={2} className="form-control" value={f.description} onChange={set} /></div>
            <Field id="defaultLowStock" type="number" min="0" step="1" label="Default Low-Stock Threshold" value={f.defaultLowStock} onChange={set} error={errors.defaultLowStock} hint="Pre-fills the minimum stock level when adding new items." />
            <button className="btn btn-primary">Save Settings</button>
          </form>
        </div></div>
        <div className="col-lg-5">
          <div className="panel mb-3"><h2 className="h6 fw-bold">Theme preference</h2>
            <p className="text-muted small">Current theme: <strong>{theme}</strong>. The choice is saved in this browser.</p>
            <button className="btn btn-outline-primary" onClick={toggleTheme}>Switch to {theme === 'light' ? 'dark' : 'light'} mode</button></div>
          <div className="panel danger-zone"><h2 className="h6 fw-bold">Demo data management</h2>
            <p className="text-muted small">Resets every user, item, request, borrowing, return, damage report and transaction to the original seed data. Students you registered will be removed.</p>
            <button className="btn btn-danger" onClick={() => setDlg(true)}>Reset Demo Data</button></div>
        </div>
      </div>
      {dlg && (
        <Modal title="Reset demo data?" onClose={() => { setDlg(false); setTyped(''); }} footer={<><button className="btn btn-outline-secondary" onClick={() => { setDlg(false); setTyped(''); }}>Cancel</button>
          <button className="btn btn-danger" disabled={typed !== 'RESET'} onClick={doReset}>Reset Everything</button></>}>
          <p><strong>This permanently erases all demonstration records</strong> in this browser and restores the initial seed data. This cannot be undone.</p>
          <label htmlFor="confirmReset" className="form-label">Type <code>RESET</code> to confirm</label>
          <input id="confirmReset" className="form-control" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Modal>)}
    </>
  );
}
