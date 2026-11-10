import { useMemo, useRef, useState } from 'react';
import { Search, Undo2 } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Field from '../../components/common/Field.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { processReturn, RETURN_CONDITIONS } from '../../services/returnService.js';
import { borrowStatus, outstanding } from '../../utils/calculations.js';
import { formatDate, todayStr } from '../../utils/formatters.js';

export default function ReturnsPage() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const today = todayStr();
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);
  const [f, setF] = useState({}); const [errors, setErrors] = useState({});
  const busy = useRef(false);

  const open = useMemo(() => db.borrows.filter((b) => outstanding(b) > 0 && (!q.trim() || [b.id, b.borrowerName, b.itemName].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())))), [db, q]);
  const recs = useMemo(() => [...db.returns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db]);
  const pOpen = usePaged(open, 6); const pRecs = usePaged(recs, 6);

  const start = (b) => { setTarget(b.id); setF({ quantity: String(outstanding(b)), returnDate: today, condition: 'Good', remarks: '' }); setErrors({}); };
  const close = () => { setTarget(null); setErrors({}); busy.current = false; };
  const set = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (busy.current) return; busy.current = true;
    const res = update((d) => processReturn(d, target, f, user));
    if (res.ok === false) { busy.current = false; setErrors(res.errors || {}); if (res.error && !res.errors?.quantity) toast.error(res.error); return; }
    toast.success(f.condition === 'Good' ? 'Return recorded; stock restored.' : f.condition === 'Damaged' ? 'Damaged return recorded; a damage report was created.' : 'Loss recorded.');
    close();
  };
  const b = target && db.borrows.find((x) => x.id === target);

  return (
    <>
      <h1 className="page-title">Return Management</h1>
      <div className="panel mt-3">
        <h2 className="h6 fw-bold">Items awaiting return</h2>
        <div className="filters"><div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search borrower, item, borrow ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search outstanding borrowings" /></div></div>
        <div className="table-responsive"><table className="table align-middle data-table">
          <thead><tr><th>Borrow ID</th><th>Borrower</th><th>Item</th><th className="text-end">Outstanding</th><th>Return by</th><th>Status</th><th className="text-end">Action</th></tr></thead>
          <tbody>{pOpen.pageRows.map((x) => (
            <tr key={x.id}><td>{x.id}</td><td><strong>{x.borrowerName}</strong></td><td>{x.itemName}</td><td className="text-end"><strong>{outstanding(x)}</strong> / {x.quantityReleased}</td><td>{formatDate(x.expectedReturnDate)}</td>
              <td><RequestStatus status={borrowStatus(x, today)} /></td>
              <td className="text-end"><button className="btn btn-primary btn-sm" aria-label={`Process return ${x.id}`} onClick={() => start(x)}><Undo2 size={14} className="me-1" />Process Return</button></td></tr>))}</tbody>
        </table></div>
        {open.length === 0 && <p className="empty-state text-center py-3">Nothing is waiting to be returned.</p>}
        <Pagination {...pOpen} />
      </div>
      <div className="panel mt-3">
        <h2 className="h6 fw-bold">Return records</h2>
        <div className="table-responsive"><table className="table align-middle data-table">
          <thead><tr><th>Return ID</th><th>Borrow ID</th><th>Borrower</th><th>Item</th><th className="text-end">Qty</th><th>Condition</th><th>Date</th><th>Remarks</th><th>Status</th></tr></thead>
          <tbody>{pRecs.pageRows.map((r) => (
            <tr key={r.id}><td>{r.id}</td><td>{r.borrowId}</td><td>{r.borrowerName}</td><td>{r.itemName}</td><td className="text-end">{r.quantity}</td><td>{RETURN_CONDITIONS[r.condition]}</td><td>{formatDate(r.returnDate)}</td><td className="small">{r.remarks || '—'}</td><td>{r.returnStatus}</td></tr>))}</tbody>
        </table></div>
        {recs.length === 0 && <p className="empty-state text-center py-3">No returns recorded yet.</p>}
        <Pagination {...pRecs} />
      </div>
      {b && (
        <Modal title={`Process return — ${b.id}`} onClose={close}>
          <form onSubmit={submit} noValidate>
            {errors.form && <div className="alert alert-danger">{errors.form}</div>}
            <dl className="detail-grid mb-3"><dt>Borrower</dt><dd>{b.borrowerName}</dd><dt>Item</dt><dd>{b.itemName}</dd><dt>Outstanding</dt><dd>{outstanding(b)} of {b.quantityReleased} {b.unit}</dd></dl>
            <Field id="quantity" type="number" min="1" step="1" max={outstanding(b)} label="Quantity Being Returned" value={f.quantity} onChange={set} error={errors.quantity} />
            <Field id="returnDate" type="date" max={today} label="Return Date" value={f.returnDate} onChange={set} error={errors.returnDate} />
            <div className="mb-3"><label htmlFor="condition" className="form-label">Item Condition</label>
              <select id="condition" name="condition" className="form-select" value={f.condition} onChange={set}>{Object.entries(RETURN_CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              {f.condition !== 'Good' && <div className="form-text">These units will <strong>not</strong> be added back to available stock.</div>}</div>
            <div className="mb-3"><label htmlFor="remarks" className="form-label">Remarks{f.condition !== 'Good' ? ' (required)' : ''}</label>
              <textarea id="remarks" name="remarks" rows={2} className={`form-control ${errors.remarks ? 'is-invalid' : ''}`} value={f.remarks} onChange={set} />{errors.remarks && <div className="invalid-feedback">{errors.remarks}</div>}</div>
            <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={close}>Cancel</button><button className="btn btn-primary">Record Return</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
