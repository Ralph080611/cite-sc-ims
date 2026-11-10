import { useMemo, useState } from 'react';
import { Search, Eye, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { borrowStatus, outstanding } from '../../utils/calculations.js';
import { formatDate, formatDateTime, todayStr } from '../../utils/formatters.js';

const FILTERS = ['Active', 'Overdue', 'Partially Returned', 'Completed'];

export default function BorrowingPage() {
  const { db } = useData();
  const today = todayStr();
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [view, setView] = useState(null);
  const all = useMemo(() => [...db.borrows].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).map((b) => ({ ...b, status: borrowStatus(b, today) })), [db, today]);
  const rows = all.filter((b) => (!status || b.status === status) && (!q.trim() || [b.id, b.requestId, b.borrowerName, b.itemName, b.idNumber].some((v) => String(v).toLowerCase().includes(q.trim().toLowerCase()))));
  const paged = usePaged(rows, 8);
  const overdue = all.filter((b) => b.status === 'Overdue').length;

  return (
    <>
      <h1 className="page-title">Borrowing Management</h1>
      {overdue > 0 && <div className="alert alert-warning d-flex align-items-center gap-2 mt-3 mb-0" role="alert"><AlertTriangle size={18} />{overdue} borrowing transaction{overdue > 1 ? 's are' : ' is'} overdue.</div>}
      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search borrower, item, ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search borrowings" /></div>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{FILTERS.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>Borrow ID</th><th>Request</th><th>Borrower</th><th>Item</th><th className="text-end">Released</th><th>Release date</th><th>Return by</th><th className="text-end">Outstanding</th><th>Status</th><th className="text-end">Details</th></tr></thead>
            <tbody>{paged.pageRows.map((b) => (
              <tr key={b.id}><td>{b.id}</td><td>{b.requestId}</td><td><strong>{b.borrowerName}</strong><div className="small text-muted">{b.organization}</div></td><td>{b.itemName}</td>
                <td className="text-end">{b.quantityReleased}</td><td>{formatDate(b.releaseDate)}</td><td>{formatDate(b.expectedReturnDate)}</td><td className="text-end"><strong>{outstanding(b)}</strong></td>
                <td><RequestStatus status={b.status} /></td>
                <td className="text-end"><button className="icon-btn sm" title="View details" aria-label={`View ${b.id}`} onClick={() => setView(b.id)}><Eye size={15} /></button></td></tr>))}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No borrowing transactions found.</p>}
        <Pagination {...paged} />
      </div>
      {view && (() => { const b = db.borrows.find((x) => x.id === view); if (!b) return null; const rets = db.returns.filter((r) => r.borrowId === b.id); return (
        <Modal title={`Borrow ${b.id}`} size="lg" onClose={() => setView(null)} footer={<button className="btn btn-primary" onClick={() => setView(null)}>Close</button>}>
          <dl className="detail-grid"><dt>Borrower</dt><dd>{b.borrowerName} ({b.idNumber}) · {b.organization}</dd><dt>Item</dt><dd>{b.itemName}</dd><dt>Request</dt><dd>{b.requestId}</dd>
            <dt>Released</dt><dd>{b.quantityReleased} {b.unit} on {formatDateTime(b.releaseDate)} by {b.releasedBy}</dd><dt>Return by</dt><dd>{formatDate(b.expectedReturnDate)}</dd>
            <dt>Returned (good)</dt><dd>{b.quantityReturned}</dd><dt>Damaged</dt><dd>{b.quantityDamaged || 0}</dd><dt>Lost</dt><dd>{b.quantityLost || 0}</dd><dt>Outstanding</dt><dd><strong>{outstanding(b)}</strong></dd>
            <dt>Status</dt><dd><RequestStatus status={borrowStatus(b, today)} /></dd></dl>
          <h3 className="h6 fw-bold mt-3">Return records</h3>
          {rets.length === 0 ? <p className="empty-state">No returns recorded yet.</p> : <ul className="list-clean">{rets.map((r) => <li key={r.id}>{r.quantity} × {r.condition} <small>{r.id} · {formatDate(r.returnDate)} · {r.processedBy}{r.remarks ? ` · ${r.remarks}` : ''}</small></li>)}</ul>}
        </Modal>); })()}
    </>
  );
}
