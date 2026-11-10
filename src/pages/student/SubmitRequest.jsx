import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Field from '../../components/common/Field.jsx';
import { submitRequest } from '../../services/requestService.js';
import { computeAvailable } from '../../utils/calculations.js';
import { todayStr } from '../../utils/formatters.js';

export default function SubmitRequest() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const items = db.items.filter((i) => !i.archived && computeAvailable(i) > 0);
  const [f, setF] = useState({ itemId: items.some((i) => i.id === params.get('item')) ? params.get('item') : '', quantity: '1', purpose: '', dateNeeded: todayStr(), expectedReturnDate: todayStr(), remarks: '' });
  const [errors, setErrors] = useState({});
  const busy = useRef(false);
  const set = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));
  const item = db.items.find((i) => i.id === f.itemId);

  const submit = (e) => {
    e.preventDefault();
    if (busy.current) return; // duplicate-click guard
    busy.current = true;
    const res = update((d) => submitRequest(d, user, f));
    if (res.ok === false) { busy.current = false; setErrors(res.errors || {}); if (res.error) toast.error(res.error); return; }
    toast.success(`Request ${res.request.id} submitted and is now Pending.`);
    nav('/student/requests');
  };

  return (
    <>
      <h1 className="page-title">Submit Item Request</h1>
      <div className="panel mt-3" style={{ maxWidth: 720 }}>
        <form onSubmit={submit} noValidate>
          <div className="mb-3">
            <label htmlFor="itemId" className="form-label">Select Item</label>
            <select id="itemId" name="itemId" className={`form-select ${errors.itemId ? 'is-invalid' : ''}`} value={f.itemId} onChange={set}>
              <option value="">Choose an item…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({computeAvailable(i)} {i.unit} available)</option>)}
            </select>
            {errors.itemId && <div className="invalid-feedback">{errors.itemId}</div>}
          </div>
          <Field id="quantity" type="number" min="1" step="1" max={item ? computeAvailable(item) : undefined} label="Requested Quantity" value={f.quantity} onChange={set} error={errors.quantity}
            hint={item ? `Available now: ${computeAvailable(item)} ${item.unit}. Submitting does not reserve stock.` : 'Pending requests do not reserve stock.'} />
          <Field id="purpose" label="Purpose" value={f.purpose} onChange={set} error={errors.purpose} />
          <div className="row">
            <div className="col-md-6"><Field id="dateNeeded" type="date" min={todayStr()} label="Date Needed" value={f.dateNeeded} onChange={set} error={errors.dateNeeded} /></div>
            <div className="col-md-6"><Field id="expectedReturnDate" type="date" min={f.dateNeeded || todayStr()} label="Expected Return Date" value={f.expectedReturnDate} onChange={set} error={errors.expectedReturnDate} /></div>
          </div>
          <div className="mb-3"><label htmlFor="remarks" className="form-label">Additional Remarks</label><textarea id="remarks" name="remarks" rows={2} className="form-control" value={f.remarks} onChange={set} /></div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => nav(-1)}>Cancel</button>
            <button className="btn btn-primary">Submit Request</button>
          </div>
        </form>
      </div>
    </>
  );
}
