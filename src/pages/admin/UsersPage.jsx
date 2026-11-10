import { useMemo, useState } from 'react';
import { Search, Eye, UserX, UserCheck } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { setUserActive } from '../../services/userService.js';
import { borrowStatus, outstanding } from '../../utils/calculations.js';
import { formatDate, todayStr } from '../../utils/formatters.js';

export default function UsersPage() {
  const { db, update } = useData();
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const [org, setOrg] = useState(''); const [st, setSt] = useState('');
  const [view, setView] = useState(null); const [toggle, setToggle] = useState(null);
  const students = db.users.filter((u) => u.role === 'student');
  const orgs = [...new Set(students.map((u) => u.organization))].sort();
  const rows = useMemo(() => students.filter((u) => (!org || u.organization === org) && (!st || (st === 'active') === u.active)
    && (!q.trim() || [u.fullName, u.idNumber, u.email, u.organization].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())))), [students, q, org, st]);
  const paged = usePaged(rows, 8);

  const doToggle = () => {
    const res = update((d) => setUserActive(d, toggle.id, !toggle.active, me));
    if (res.ok === false) toast.error(res.error); else toast.success(`Account ${toggle.active ? 'deactivated' : 'activated'}.`);
    setToggle(null);
  };
  const u = view && db.users.find((x) => x.id === view);
  const today = todayStr();

  return (
    <>
      <h1 className="page-title">User Management</h1>
      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search name, ID, email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></div>
          <select className="form-select" value={org} onChange={(e) => setOrg(e.target.value)} aria-label="Filter by organization"><option value="">All organizations</option>{orgs.map((o) => <option key={o}>{o}</option>)}</select>
          <select className="form-select" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Filter by status"><option value="">All accounts</option><option value="active">Active</option><option value="inactive">Deactivated</option></select>
        </div>
        <div className="table-responsive"><table className="table align-middle data-table">
          <thead><tr><th>ID Number</th><th>Name</th><th>Organization</th><th>Email</th><th>Registered</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
          <tbody>{paged.pageRows.map((x) => (
            <tr key={x.id}><td>{x.idNumber}</td><td><strong>{x.fullName}</strong></td><td>{x.organization}</td><td>{x.email}</td><td>{formatDate(x.createdAt)}</td>
              <td><StatusBadge kind={x.active ? 'good' : 'archived'}>{x.active ? 'Active' : 'Deactivated'}</StatusBadge></td>
              <td className="text-end text-nowrap">
                <button className="icon-btn sm" title="View account" aria-label={`View ${x.fullName}`} onClick={() => setView(x.id)}><Eye size={15} /></button>{' '}
                <button className={`icon-btn sm ${x.active ? 'danger' : ''}`} title={x.active ? 'Deactivate' : 'Activate'} aria-label={`${x.active ? 'Deactivate' : 'Activate'} ${x.fullName}`} onClick={() => setToggle(x)}>{x.active ? <UserX size={15} /> : <UserCheck size={15} />}</button></td></tr>))}</tbody>
        </table></div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No users found.</p>}
        <Pagination {...paged} />
        <p className="small text-muted mt-3 mb-0">Public registration only creates student/organization accounts. Administrator accounts cannot be created or modified from this screen.</p>
      </div>
      {u && (() => { const reqs = db.requests.filter((r) => r.userId === u.id); const brs = db.borrows.filter((b) => b.userId === u.id); return (
        <Modal title={u.fullName} size="lg" onClose={() => setView(null)} footer={<button className="btn btn-primary" onClick={() => setView(null)}>Close</button>}>
          <dl className="detail-grid"><dt>ID Number</dt><dd>{u.idNumber}</dd><dt>Organization</dt><dd>{u.organization}</dd><dt>Email</dt><dd>{u.email}</dd><dt>Registered</dt><dd>{formatDate(u.createdAt)}</dd><dt>Account</dt><dd>{u.active ? 'Active' : 'Deactivated'}</dd></dl>
          <h3 className="h6 fw-bold mt-3">Request history ({reqs.length})</h3>
          {reqs.length === 0 ? <p className="empty-state">No requests.</p> : <ul className="list-clean">{reqs.map((r) => <li key={r.id}>{r.quantity} × {r.itemName} <RequestStatus status={r.status} /><small>{r.id} · {formatDate(r.dateRequested)}</small></li>)}</ul>}
          <h3 className="h6 fw-bold mt-3">Borrowing history ({brs.length})</h3>
          {brs.length === 0 ? <p className="empty-state">No borrowings.</p> : <ul className="list-clean">{brs.map((b) => <li key={b.id}>{b.quantityReleased} × {b.itemName} — {outstanding(b)} outstanding <RequestStatus status={borrowStatus(b, today)} /><small>{b.id} · released {formatDate(b.releaseDate)}</small></li>)}</ul>}
        </Modal>); })()}
      {toggle && <ConfirmDialog danger={toggle.active} title={`${toggle.active ? 'Deactivate' : 'Activate'} account`} confirmLabel={toggle.active ? 'Deactivate' : 'Activate'} onCancel={() => setToggle(null)} onConfirm={doToggle}
        message={toggle.active ? `Deactivate ${toggle.fullName}? They will be signed out and unable to log in. Their records are kept.` : `Reactivate ${toggle.fullName}?`} />}
    </>
  );
}
