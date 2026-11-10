import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, XCircle } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { cancelRequest } from '../../services/requestService.js';
import { formatDate, formatDateTime } from '../../utils/formatters.js';

export const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'Released', 'Partially Returned', 'Returned', 'Cancelled'];

export default function MyRequests() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [view, setView] = useState(null); const [cancel, setCancel] = useState(null);
  const mine = useMemo(() => db.requests.filter((r) => r.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, user.id]);
  const rows = mine.filter((r) => (!status || r.status === status) && (!q.trim() || [r.id, r.itemName, r.purpose].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))));
  const paged = usePaged(rows, 8);

  const doCancel = () => {
    const res = update((d) => cancelRequest(d, cancel.id, user));
    if (res.ok === false) toast.error(res.error); else toast.success('Request cancelled.');
    setCancel(null);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h1 className="page-title mb-0">My Requests</h1>
        <Link to="/student/request/new" className="btn btn-primary"><Plus size={16} className="me-1" />New Request</Link>
      </div>
      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search request ID, item, purpose…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requests" /></div>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>Request ID</th><th>Item</th><th className="text-end">Qty</th><th>Requested</th><th>Needed</th><th>Return by</th><th>Status</th><th>Admin remarks</th><th className="text-end">Actions</th></tr></thead>
            <tbody>{paged.pageRows.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td><strong>{r.itemName}</strong><div className="small text-muted text-truncate-2">{r.purpose}</div></td><td className="text-end">{r.quantity}</td>
                <td>{formatDate(r.dateRequested)}</td><td>{formatDate(r.dateNeeded)}</td><td>{formatDate(r.expectedReturnDate)}</td><td><RequestStatus status={r.status} /></td>
                <td className="small">{r.adminRemarks || '—'}</td>
                <td className="text-end text-nowrap">
                  <button className="icon-btn sm" title="View details" aria-label={`View ${r.id}`} onClick={() => setView(r.id)}><Eye size={15} /></button>{' '}
                  {r.status === 'Pending' && <button className="icon-btn sm danger" title="Cancel request" aria-label={`Cancel ${r.id}`} onClick={() => setCancel(r)}><XCircle size={15} /></button>}
                </td></tr>))}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">{mine.length === 0 ? 'You have not submitted any requests yet.' : 'No requests match your filters.'}</p>}
        <Pagination {...paged} />
      </div>
      {view && (() => { const r = db.requests.find((x) => x.id === view); if (!r) return null; return (
        <Modal title={`Request ${r.id}`} onClose={() => setView(null)} footer={<button className="btn btn-primary" onClick={() => setView(null)}>Close</button>}>
          <dl className="detail-grid"><dt>Item</dt><dd>{r.itemName}</dd><dt>Quantity</dt><dd>{r.quantity} {r.unit}</dd><dt>Purpose</dt><dd>{r.purpose}</dd>
            <dt>Date needed</dt><dd>{formatDate(r.dateNeeded)}</dd><dt>Return by</dt><dd>{formatDate(r.expectedReturnDate)}</dd><dt>Status</dt><dd><RequestStatus status={r.status} /></dd>
            <dt>Your remarks</dt><dd>{r.remarks || '—'}</dd><dt>Admin remarks</dt><dd>{r.adminRemarks || '—'}</dd><dt>Last update</dt><dd>{formatDateTime(r.updatedAt)}</dd></dl>
        </Modal>); })()}
      {cancel && <ConfirmDialog danger title="Cancel request" message={`Cancel request ${cancel.id} for ${cancel.quantity} × ${cancel.itemName}? This cannot be undone.`} confirmLabel="Cancel Request" onCancel={() => setCancel(null)} onConfirm={doCancel} />}
    </>
  );
}
