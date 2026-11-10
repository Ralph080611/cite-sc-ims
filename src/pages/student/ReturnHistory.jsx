import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import { RETURN_CONDITIONS } from '../../services/returnService.js';
import { formatDate } from '../../utils/formatters.js';

export default function ReturnHistory() {
  const { db } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const rows = useMemo(() => db.returns.filter((r) => r.userId === user.id && (!q.trim() || [r.id, r.itemName, r.borrowId].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, user.id, q]);
  const paged = usePaged(rows, 8);
  return (
    <>
      <h1 className="page-title">Return History</h1>
      <div className="panel mt-3">
        <div className="filters"><div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search return ID or item…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search returns" /></div></div>
        <div className="table-responsive"><table className="table align-middle data-table">
          <thead><tr><th>Return ID</th><th>Item</th><th className="text-end">Qty</th><th>Condition</th><th>Date</th><th>Remarks</th><th>Status</th></tr></thead>
          <tbody>{paged.pageRows.map((r) => (<tr key={r.id}><td>{r.id}</td><td><strong>{r.itemName}</strong></td><td className="text-end">{r.quantity}</td><td>{RETURN_CONDITIONS[r.condition]}</td><td>{formatDate(r.returnDate)}</td><td className="small">{r.remarks || '—'}</td><td>{r.returnStatus === 'Partial' ? 'Partial return' : 'Completed'}</td></tr>))}</tbody>
        </table></div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No returns have been recorded for you yet.</p>}
        <Pagination {...paged} />
      </div>
    </>
  );
}
