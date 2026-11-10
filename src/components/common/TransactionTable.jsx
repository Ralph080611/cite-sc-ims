import { useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import Modal from './Modal.jsx';
import Pagination, { usePaged } from './Pagination.jsx';
import { filterTransactions } from '../../services/transactionService.js';
import { formatDateTime } from '../../utils/formatters.js';

// Shared by admin and student Transaction History. `rows` already scoped to who may see them.
export default function TransactionTable({ rows, emptyText = 'No transactions found.' }) {
  const [f, setF] = useState({ q: '', type: '', from: '', to: '', sort: 'newest' });
  const [view, setView] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const types = useMemo(() => [...new Set(rows.map((t) => t.type))].sort(), [rows]);
  const list = useMemo(() => filterTransactions(rows, f), [rows, f]);
  const paged = usePaged(list, 10);
  const t = view && rows.find((x) => x.id === view);
  return (
    <div className="panel mt-3">
      <div className="filters">
        <div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search ID, item, reference, description…" value={f.q} onChange={set('q')} aria-label="Search transactions" /></div>
        <select className="form-select" value={f.type} onChange={set('type')} aria-label="Filter by type"><option value="">All types</option>{types.map((x) => <option key={x}>{x}</option>)}</select>
        <input type="date" className="form-control w-auto" value={f.from} onChange={set('from')} aria-label="From date" />
        <input type="date" className="form-control w-auto" value={f.to} onChange={set('to')} aria-label="To date" />
        <select className="form-select" value={f.sort} onChange={set('sort')} aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="type">By type</option></select>
      </div>
      <div className="table-responsive"><table className="table align-middle data-table">
        <thead><tr><th>Transaction ID</th><th>Type</th><th>Reference</th><th>Item</th><th className="text-end">Qty</th><th>Performed by</th><th>Date and time</th><th>Description</th><th className="text-end">View</th></tr></thead>
        <tbody>{paged.pageRows.map((x) => (
          <tr key={x.id}><td>{x.id}</td><td><span className="status-badge muted">{x.type}</span></td><td>{x.referenceId}</td><td>{x.itemName}</td><td className="text-end">{x.quantity ?? '—'}</td><td>{x.performedBy}</td><td className="text-nowrap">{formatDateTime(x.timestamp)}</td>
            <td className="small text-truncate-2">{x.description}</td>
            <td className="text-end"><button className="icon-btn sm" title="View details" aria-label={`View ${x.id}`} onClick={() => setView(x.id)}><Eye size={15} /></button></td></tr>))}</tbody>
      </table></div>
      {list.length === 0 && <p className="empty-state text-center py-4">{emptyText}</p>}
      <Pagination {...paged} />
      {t && (
        <Modal title={`Transaction ${t.id}`} onClose={() => setView(null)} footer={<button className="btn btn-primary" onClick={() => setView(null)}>Close</button>}>
          <dl className="detail-grid"><dt>Type</dt><dd>{t.type}</dd><dt>Reference</dt><dd>{t.referenceId}</dd><dt>Item</dt><dd>{t.itemName}</dd><dt>Quantity</dt><dd>{t.quantity ?? '—'}</dd>
            <dt>Performed by</dt><dd>{t.performedBy}</dd><dt>Date and time</dt><dd>{formatDateTime(t.timestamp)}</dd><dt>Description</dt><dd>{t.description}</dd></dl>
        </Modal>)}
    </div>
  );
}
