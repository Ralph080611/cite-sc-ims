import { useMemo, useState } from 'react';
import { Search, Eye, Check, X, PackageCheck } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { approveRequest, rejectRequest, releaseRequest } from '../../services/requestService.js';
import { computeAvailable } from '../../utils/calculations.js';
import { formatDate, formatDateTime } from '../../utils/formatters.js';
import { REQUEST_STATUSES } from '../student/MyRequests.jsx';

export default function RequestsPage() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null); const [text, setText] = useState(''); const [err, setErr] = useState('');

  const rows = useMemo(() => db.requests.filter((r) => (!status || r.status === status)
    && (!q.trim() || [r.id, r.requesterName, r.idNumber, r.itemName, r.organization].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, q, status]);
  const paged = usePaged(rows, 8);

  const close = () => { setModal(null); setText(''); setErr(''); };
  const act = (fn, msg) => {
    const res = update(fn);
    if (res.ok === false) { setErr(res.error); toast.error(res.error); return; }
    toast.success(msg); close();
  };
  const stockOf = (r) => { const i = db.items.find((x) => x.id === r.itemId); return i ? `${computeAvailable(i)} ${i.unit} available` : 'Item missing'; };

  return (
    <>
      <h1 className="page-title">Item Requests</h1>
      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search requester, ID, item…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requests" /></div>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>Request ID</th><th>Requester</th><th>Organization</th><th>Item</th><th className="text-end">Qty</th><th>Requested</th><th>Return by</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>{paged.pageRows.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td><strong>{r.requesterName}</strong><div className="small text-muted">{r.idNumber}</div></td><td>{r.organization}</td>
                <td>{r.itemName}<div className="small text-muted text-truncate-2">{r.purpose}</div></td><td className="text-end">{r.quantity}</td>
                <td>{formatDate(r.dateRequested)}</td><td>{formatDate(r.expectedReturnDate)}</td><td><RequestStatus status={r.status} /></td>
                <td className="text-end text-nowrap">
                  <button className="icon-btn sm" title="View details" aria-label={`View ${r.id}`} onClick={() => setModal({ type: 'view', id: r.id })}><Eye size={15} /></button>{' '}
                  {r.status === 'Pending' && <>
                    <button className="icon-btn sm" title="Approve" aria-label={`Approve ${r.id}`} onClick={() => setModal({ type: 'approve', id: r.id })}><Check size={15} /></button>{' '}
                    <button className="icon-btn sm danger" title="Reject" aria-label={`Reject ${r.id}`} onClick={() => setModal({ type: 'reject', id: r.id })}><X size={15} /></button></>}
                  {r.status === 'Approved' && <button className="icon-btn sm" title="Release items" aria-label={`Release ${r.id}`} onClick={() => setModal({ type: 'release', id: r.id })}><PackageCheck size={15} /></button>}
                </td></tr>))}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No requests found.</p>}
        <Pagination {...paged} />
      </div>

      {modal && (() => {
        const r = db.requests.find((x) => x.id === modal.id); if (!r) return null;
        if (modal.type === 'view') return (
          <Modal title={`Request ${r.id}`} onClose={close} footer={<button className="btn btn-primary" onClick={close}>Close</button>}>
            <dl className="detail-grid"><dt>Requester</dt><dd>{r.requesterName} ({r.idNumber})</dd><dt>Organization</dt><dd>{r.organization}</dd><dt>Item</dt><dd>{r.itemName} — {stockOf(r)}</dd>
              <dt>Quantity</dt><dd>{r.quantity} {r.unit}</dd><dt>Purpose</dt><dd>{r.purpose}</dd><dt>Date needed</dt><dd>{formatDate(r.dateNeeded)}</dd><dt>Return by</dt><dd>{formatDate(r.expectedReturnDate)}</dd>
              <dt>Status</dt><dd><RequestStatus status={r.status} /></dd><dt>Requester remarks</dt><dd>{r.remarks || '—'}</dd><dt>Admin remarks</dt><dd>{r.adminRemarks || '—'}</dd>
              {r.approvedBy && <><dt>Approved by</dt><dd>{r.approvedBy} · {formatDateTime(r.approvedAt)}</dd></>}
              {r.releasedBy && <><dt>Released by</dt><dd>{r.releasedBy} · {formatDateTime(r.releasedAt)}</dd></>}
              {r.borrowId && <><dt>Borrow ID</dt><dd>{r.borrowId}</dd></>}</dl>
          </Modal>);
        if (modal.type === 'approve') return (
          <Modal title={`Approve ${r.id}`} onClose={close} footer={<><button className="btn btn-outline-secondary" onClick={close}>Cancel</button>
            <button className="btn btn-primary" onClick={() => act((d) => approveRequest(d, r.id, text, user), 'Request approved. Stock will be deducted on release.')}>Approve</button></>}>
            <p>Approve <strong>{r.quantity} × {r.itemName}</strong> for {r.requesterName}? ({stockOf(r)}). Approval does not deduct stock.</p>
            <label htmlFor="rem" className="form-label">Remarks (optional)</label><input id="rem" className="form-control" value={text} onChange={(e) => setText(e.target.value)} />
            {err && <div className="alert alert-danger mt-3 mb-0">{err}</div>}
          </Modal>);
        if (modal.type === 'reject') return (
          <Modal title={`Reject ${r.id}`} onClose={close} footer={<><button className="btn btn-outline-secondary" onClick={close}>Cancel</button>
            <button className="btn btn-danger" onClick={() => act((d) => rejectRequest(d, r.id, text, user), 'Request rejected.')}>Reject</button></>}>
            <label htmlFor="reason" className="form-label">Rejection reason (required)</label><input id="reason" className="form-control" value={text} onChange={(e) => setText(e.target.value)} />
            {err && <div className="alert alert-danger mt-3 mb-0">{err}</div>}
          </Modal>);
        return <ConfirmDialog title="Release items" message={`Release ${r.quantity} × ${r.itemName} to ${r.requesterName}? This deducts stock (${stockOf(r)}) and cannot be repeated.`} confirmLabel="Release"
          onCancel={close} onConfirm={() => act((d) => releaseRequest(d, r.id, user), 'Items released and stock updated.')} />;
      })()}
    </>
  );
}
