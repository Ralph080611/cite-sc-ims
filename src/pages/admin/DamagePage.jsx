import { useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { updateDamageReport, DAMAGE_STATUSES, isOpenDamage } from '../../services/damageService.js';
import { formatDate } from '../../utils/formatters.js';

const kind = (s) => ({ Reported: 'out', 'Under Repair': 'low', Repaired: 'good', Disposed: 'archived' }[s]);

export default function DamagePage() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [view, setView] = useState(null); const [next, setNext] = useState(''); const [note, setNote] = useState(''); const [err, setErr] = useState('');

  const rows = useMemo(() => db.damageReports.filter((r) => (!status || r.status === status)
    && (!q.trim() || [r.id, r.itemName, r.borrowerName, r.borrowId].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, q, status]);
  const paged = usePaged(rows, 8);
  const damagedUnits = db.items.reduce((s, i) => s + i.damagedQuantity, 0);

  const open = (r) => { setView(r.id); setNext(r.status); setNote(''); setErr(''); };
  const close = () => setView(null);
  const save = () => {
    const res = update((d) => updateDamageReport(d, view, { status: next, remarks: note }, user));
    if (res.ok === false) return setErr(res.error);
    toast.success(next === 'Repaired' ? 'Marked repaired; units restored to available stock.' : 'Damage report updated.'); close();
  };
  const r = view && db.damageReports.find((x) => x.id === view);

  return (
    <>
      <h1 className="page-title">Damage Reports</h1>
      <p className="text-muted">Damaged stock currently excluded from availability: <strong>{damagedUnits}</strong> unit(s).</p>
      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search report, item, borrower…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search damage reports" /></div>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{DAMAGE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="table-responsive"><table className="table align-middle data-table">
          <thead><tr><th>Report ID</th><th>Item</th><th>Borrower</th><th>Borrow ID</th><th className="text-end">Qty</th><th>Reported</th><th>Description</th><th>Status</th><th className="text-end">Manage</th></tr></thead>
          <tbody>{paged.pageRows.map((x) => (
            <tr key={x.id}><td>{x.id}</td><td><strong>{x.itemName}</strong></td><td>{x.borrowerName}</td><td>{x.borrowId}</td><td className="text-end">{x.quantity}</td><td>{formatDate(x.dateReported)}</td>
              <td className="small text-truncate-2">{x.description}</td><td><StatusBadge kind={kind(x.status)}>{x.status}</StatusBadge></td>
              <td className="text-end"><button className="icon-btn sm" title="View / update" aria-label={`Manage ${x.id}`} onClick={() => open(x)}><Eye size={15} /></button></td></tr>))}</tbody>
        </table></div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No damage reports.</p>}
        <Pagination {...paged} />
      </div>
      {r && (
        <Modal title={`Damage report ${r.id}`} size="lg" onClose={close} footer={isOpenDamage(r) ? <><button className="btn btn-outline-secondary" onClick={close}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Update</button></> : <button className="btn btn-primary" onClick={close}>Close</button>}>
          <dl className="detail-grid"><dt>Item</dt><dd>{r.itemName}</dd><dt>Quantity</dt><dd>{r.quantity} {r.unit}</dd><dt>Borrower</dt><dd>{r.borrowerName} ({r.borrowId})</dd><dt>Reported</dt><dd>{formatDate(r.dateReported)}</dd>
            <dt>Description</dt><dd>{r.description}</dd><dt>Admin remarks</dt><dd style={{ whiteSpace: 'pre-line' }}>{r.remarks || '—'}</dd><dt>Status</dt><dd><StatusBadge kind={kind(r.status)}>{r.status}</StatusBadge></dd></dl>
          {isOpenDamage(r) ? (<>
            <hr />
            <div className="mb-3"><label htmlFor="next" className="form-label">Update status</label>
              <select id="next" className="form-select" value={next} onChange={(e) => setNext(e.target.value)}>{DAMAGE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <div className="form-text">Repaired returns the units to available stock. Disposed removes them from total inventory. Both are final.</div></div>
            <label htmlFor="note" className="form-label">Remarks / decision</label><textarea id="note" rows={2} className="form-control" value={note} onChange={(e) => setNote(e.target.value)} />
            {err && <div className="alert alert-danger mt-3 mb-0">{err}</div>}
          </>) : <p className="text-muted mb-0">This report is closed.</p>}
        </Modal>)}
    </>
  );
}
