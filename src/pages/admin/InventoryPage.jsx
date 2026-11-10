import { useMemo, useState } from 'react';
import { Plus, Search, Eye, Pencil, SlidersHorizontal, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ItemForm, { emptyItem } from '../../components/common/ItemForm.jsx';
import { addItem, updateItem, adjustStock, setArchived, deleteItem } from '../../services/inventoryService.js';
import { computeAvailable, isLowStock } from '../../utils/calculations.js';
import { formatDate } from '../../utils/formatters.js';

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  available: (a, b) => computeAvailable(b) - computeAvailable(a),
  updated: (a, b) => b.lastUpdated.localeCompare(a.lastUpdated),
};

export default function InventoryPage() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [avail, setAvail] = useState('');
  const [sort, setSort] = useState('name'); const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(null); // {type, item?}
  const [errors, setErrors] = useState({});
  const [adj, setAdj] = useState({ delta: '', reason: '' }); const [adjErr, setAdjErr] = useState('');

  const catName = (id) => db.categories.find((c) => c.id === id)?.name || '—';
  const rows = useMemo(() => db.items.filter((i) => {
    if (i.archived !== showArchived) return false;
    if (cat && i.categoryId !== cat) return false;
    const a = computeAvailable(i);
    if (avail === 'in' && a <= 0) return false;
    if (avail === 'out' && a > 0) return false;
    if (avail === 'low' && !isLowStock(i)) return false;
    const s = q.trim().toLowerCase();
    return !s || [i.name, i.id, i.description, catName(i.categoryId)].some((v) => String(v).toLowerCase().includes(s));
  }).sort(SORTS[sort]), [db, q, cat, avail, sort, showArchived]); // eslint-disable-line
  const paged = usePaged(rows, 8);

  const close = () => { setModal(null); setErrors({}); setAdj({ delta: '', reason: '' }); setAdjErr(''); };
  const run = (fn, okMsg) => {
    const res = update(fn);
    if (res.ok === false) { if (res.errors) setErrors(res.errors); else toast.error(res.error); return false; }
    toast.success(okMsg); close(); return true;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h1 className="page-title mb-0">Inventory Management</h1>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}><Plus size={16} className="me-1" />Add Item</button>
      </div>

      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search name, ID, description…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" /></div>
          <select className="form-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-select" value={avail} onChange={(e) => setAvail(e.target.value)} aria-label="Filter by availability">
            <option value="">All availability</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
          </select>
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="name">Sort: Name</option><option value="available">Sort: Most available</option><option value="updated">Sort: Recently updated</option>
          </select>
          <div className="form-check form-switch align-self-center"><input className="form-check-input" type="checkbox" id="arch" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /><label className="form-check-label" htmlFor="arch">Archived</label></div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>ID</th><th>Item</th><th>Category</th><th className="text-end">Total</th><th className="text-end">Available</th><th className="text-end">Borrowed</th><th className="text-end">Damaged</th><th>Unit</th><th>Condition</th><th>Updated</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {paged.pageRows.map((i) => {
                const a = computeAvailable(i);
                return (
                  <tr key={i.id}>
                    <td>{i.id}</td>
                    <td><strong>{i.name}</strong><div className="small text-muted text-truncate-2">{i.description}</div></td>
                    <td>{catName(i.categoryId)}</td>
                    <td className="text-end">{i.totalQuantity}</td>
                    <td className="text-end"><StatusBadge kind={a === 0 ? 'out' : isLowStock(i) ? 'low' : 'good'}>{a}</StatusBadge></td>
                    <td className="text-end">{i.borrowedQuantity}</td><td className="text-end">{i.damagedQuantity}</td>
                    <td>{i.unit}</td><td>{i.condition}</td><td>{formatDate(i.lastUpdated)}</td>
                    <td className="text-end text-nowrap">
                      <button className="icon-btn sm" title="View details" aria-label={`View ${i.name}`} onClick={() => setModal({ type: 'view', item: i })}><Eye size={15} /></button>{' '}
                      {!i.archived && <><button className="icon-btn sm" title="Edit" aria-label={`Edit ${i.name}`} onClick={() => setModal({ type: 'edit', item: i })}><Pencil size={15} /></button>{' '}
                      <button className="icon-btn sm" title="Adjust stock" aria-label={`Adjust stock of ${i.name}`} onClick={() => setModal({ type: 'adjust', item: i })}><SlidersHorizontal size={15} /></button>{' '}</>}
                      <button className="icon-btn sm" title={i.archived ? 'Restore' : 'Archive'} aria-label={`${i.archived ? 'Restore' : 'Archive'} ${i.name}`} onClick={() => setModal({ type: i.archived ? 'restore' : 'archive', item: i })}>{i.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>{' '}
                      <button className="icon-btn sm danger" title="Delete" aria-label={`Delete ${i.name}`} onClick={() => setModal({ type: 'delete', item: i })}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No items match your filters.</p>}
        <Pagination {...paged} />
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add Inventory Item" onClose={close} size="lg">
          <ItemForm initial={emptyItem(db.categories[0]?.id, db.settings.defaultLowStock)} categories={db.categories} errors={errors} submitLabel="Add Item" onCancel={close}
            onSubmit={(f) => run((d) => addItem(d, f, user.fullName), 'Item added.')} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title={`Edit ${modal.item.name}`} onClose={close} size="lg">
          <ItemForm initial={{ ...modal.item, totalQuantity: String(modal.item.totalQuantity), minStock: String(modal.item.minStock) }} categories={db.categories} errors={errors} submitLabel="Save Changes" onCancel={close}
            onSubmit={(f) => run((d) => updateItem(d, modal.item.id, f, user.fullName), 'Item updated.')} />
        </Modal>
      )}
      {modal?.type === 'view' && (() => { const i = db.items.find((x) => x.id === modal.item.id) || modal.item; return (
        <Modal title={i.name} onClose={close} footer={<button className="btn btn-primary" onClick={close}>Close</button>}>
          <dl className="detail-grid">
            <dt>Item ID</dt><dd>{i.id}</dd><dt>Category</dt><dd>{catName(i.categoryId)}</dd><dt>Description</dt><dd>{i.description || '—'}</dd>
            <dt>Total</dt><dd>{i.totalQuantity} {i.unit}</dd><dt>Available</dt><dd>{computeAvailable(i)}</dd><dt>Borrowed</dt><dd>{i.borrowedQuantity}</dd>
            <dt>Damaged</dt><dd>{i.damagedQuantity}</dd><dt>Lost</dt><dd>{i.lostQuantity || 0}</dd><dt>Minimum stock</dt><dd>{i.minStock}</dd>
            <dt>Condition</dt><dd>{i.condition}</dd><dt>Remarks</dt><dd>{i.remarks || '—'}</dd><dt>Date added</dt><dd>{formatDate(i.dateAdded)}</dd><dt>Last updated</dt><dd>{formatDate(i.lastUpdated)}</dd>
          </dl>
        </Modal>); })()}
      {modal?.type === 'adjust' && (
        <Modal title={`Adjust stock — ${modal.item.name}`} onClose={close} footer={<>
          <button className="btn btn-outline-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            const delta = /^-?\d+$/.test(adj.delta) ? Number(adj.delta) : NaN;
            const res = update((d) => adjustStock(d, modal.item.id, delta, adj.reason, user.fullName));
            if (res.ok === false) return setAdjErr(res.error); toast.success('Stock adjusted.'); close();
          }}>Apply Adjustment</button></>}>
          <p className="text-muted small">Current total: {modal.item.totalQuantity} {modal.item.unit}. Use a negative number to remove stock.</p>
          <label htmlFor="delta" className="form-label">Change in quantity</label>
          <input id="delta" className="form-control mb-3" type="number" step="1" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} />
          <label htmlFor="reason" className="form-label">Reason</label>
          <input id="reason" className="form-control" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
          {adjErr && <div className="alert alert-danger mt-3 mb-0">{adjErr}</div>}
        </Modal>
      )}
      {modal?.type === 'archive' && <ConfirmDialog title="Archive item" message={`Archive "${modal.item.name}"? It will be hidden from borrowing, but its history stays intact.`} confirmLabel="Archive" onCancel={close} onConfirm={() => run((d) => setArchived(d, modal.item.id, true, user.fullName), 'Item archived.') || close()} />}
      {modal?.type === 'restore' && <ConfirmDialog title="Restore item" message={`Restore "${modal.item.name}" to active inventory?`} confirmLabel="Restore" onCancel={close} onConfirm={() => run((d) => setArchived(d, modal.item.id, false, user.fullName), 'Item restored.') || close()} />}
      {modal?.type === 'delete' && <ConfirmDialog danger title="Delete item" message={`Permanently delete "${modal.item.name}"? This only works for items with no request or borrowing history; otherwise archive it.`} confirmLabel="Delete" onCancel={close} onConfirm={() => run((d) => deleteItem(d, modal.item.id, user.fullName), 'Item deleted.') || close()} />}
    </>
  );
}
