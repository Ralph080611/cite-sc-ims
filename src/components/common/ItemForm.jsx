import { useState } from 'react';
import Field from './Field.jsx';

export const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair'];
export const emptyItem = (categoryId = '', minStock = 1) => ({ name: '', categoryId, description: '', totalQuantity: '0', unit: 'pcs', condition: 'Good', minStock: String(minStock), remarks: '' });

export default function ItemForm({ initial, categories, errors = {}, onSubmit, onCancel, submitLabel }) {
  const [f, setF] = useState(initial);
  const set = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} noValidate>
      <Field id="name" label="Item Name" value={f.name} onChange={set} error={errors.name} />
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="categoryId" className="form-label">Category</label>
          <select id="categoryId" name="categoryId" className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`} value={f.categoryId} onChange={set}>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
        </div>
        <div className="col-md-6 mb-3">
          <label htmlFor="condition" className="form-label">Condition</label>
          <select id="condition" name="condition" className="form-select" value={f.condition} onChange={set}>
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor="description" className="form-label">Description</label>
        <textarea id="description" name="description" rows={2} className="form-control" value={f.description} onChange={set} />
      </div>
      <div className="row">
        <div className="col-md-4"><Field id="totalQuantity" type="number" min="0" step="1" label="Total Quantity" value={f.totalQuantity} onChange={set} error={errors.totalQuantity} /></div>
        <div className="col-md-4"><Field id="unit" label="Unit" value={f.unit} onChange={set} error={errors.unit} hint="e.g. pcs, set, box" /></div>
        <div className="col-md-4"><Field id="minStock" type="number" min="0" step="1" label="Minimum Stock Level" value={f.minStock} onChange={set} error={errors.minStock} hint="Low-stock alert at or below this" /></div>
      </div>
      <div className="mb-3">
        <label htmlFor="remarks" className="form-label">Remarks</label>
        <textarea id="remarks" name="remarks" rows={2} className="form-control" value={f.remarks} onChange={set} />
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
