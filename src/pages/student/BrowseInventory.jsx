import { useMemo, useState } from 'react';
import { Search, Eye, ClipboardPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { computeAvailable, isLowStock } from '../../utils/calculations.js';

export default function BrowseInventory() {
  const { db } = useData();
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [avail, setAvail] = useState(''); const [sort, setSort] = useState('name');
  const [view, setView] = useState(null);
  const catName = (id) => db.categories.find((c) => c.id === id)?.name || '—';

  const rows = useMemo(() => db.items.filter((i) => {
    if (i.archived) return false;
    if (cat && i.categoryId !== cat) return false;
    const a = computeAvailable(i);
    if (avail === 'in' && a <= 0) return false;
    if (avail === 'out' && a > 0) return false;
    const s = q.trim().toLowerCase();
    return !s || [i.name, i.id, i.description, catName(i.categoryId)].some((v) => String(v).toLowerCase().includes(s));
  }).sort((a, b) => (sort === 'available' ? computeAvailable(b) - computeAvailable(a) : a.name.localeCompare(b.name))), [db, q, cat, avail, sort]); // eslint-disable-line
  const paged = usePaged(rows, 8);
  const status = (i) => { const a = computeAvailable(i); return a === 0 ? <StatusBadge kind="out">Unavailable</StatusBadge> : isLowStock(i) ? <StatusBadge kind="low">Limited</StatusBadge> : <StatusBadge kind="good">Available</StatusBadge>; };

  return (
    <>
      <h1 className="page-title">Browse Inventory</h1>
      <div className="panel mt-3">
        <div className="filters">
          <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" /></div>
          <select className="form-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="form-select" value={avail} onChange={(e) => setAvail(e.target.value)} aria-label="Filter by availability"><option value="">All availability</option><option value="in">Available</option><option value="out">Unavailable</option></select>
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="name">Sort: Name</option><option value="available">Sort: Most available</option></select>
        </div>
        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>ID</th><th>Item</th><th>Category</th><th className="text-end">Available</th><th>Unit</th><th>Condition</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>{paged.pageRows.map((i) => (
              <tr key={i.id}><td>{i.id}</td><td><strong>{i.name}</strong><div className="small text-muted text-truncate-2">{i.description}</div></td><td>{catName(i.categoryId)}</td>
                <td className="text-end">{computeAvailable(i)}</td><td>{i.unit}</td><td>{i.condition}</td><td>{status(i)}</td>
                <td className="text-end text-nowrap"><button className="icon-btn sm" title="View details" aria-label={`View ${i.name}`} onClick={() => setView(i.id)}><Eye size={15} /></button>{' '}
                  {computeAvailable(i) > 0 ? <Link className="btn btn-primary btn-sm" to={`/student/request/new?item=${i.id}`}><ClipboardPlus size={14} className="me-1" />Request</Link> : <span className="small text-muted">Unavailable</span>}</td></tr>))}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No items match your search.</p>}
        <Pagination {...paged} />
      </div>
      {view && (() => { const i = db.items.find((x) => x.id === view); if (!i) return null; return (
        <Modal title={i.name} onClose={() => setView(null)} footer={<button className="btn btn-primary" onClick={() => setView(null)}>Close</button>}>
          <dl className="detail-grid"><dt>Item ID</dt><dd>{i.id}</dd><dt>Category</dt><dd>{catName(i.categoryId)}</dd><dt>Description</dt><dd>{i.description || '—'}</dd>
            <dt>Available</dt><dd>{computeAvailable(i)} {i.unit}</dd><dt>Condition</dt><dd>{i.condition}</dd><dt>Status</dt><dd>{status(i)}</dd></dl>
        </Modal>); })()}
    </>
  );
}
