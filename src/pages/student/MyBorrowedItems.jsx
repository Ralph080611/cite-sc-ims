import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { borrowStatus, outstanding } from '../../utils/calculations.js';
import { formatDate, todayStr } from '../../utils/formatters.js';

export default function MyBorrowedItems() {
  const { db } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const today = todayStr();
  const rows = useMemo(() => db.borrows.filter((b) => b.userId === user.id && (!q.trim() || [b.id, b.itemName].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)), [db, user.id, q]);
  const paged = usePaged(rows, 8);
  return (
    <>
      <h1 className="page-title">My Borrowed Items</h1>
      <div className="panel mt-3">
        <div className="filters"><div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search transaction ID or item…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search borrowed items" /></div></div>
        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>Borrow ID</th><th>Item</th><th className="text-end">Released</th><th>Release date</th><th>Return by</th><th className="text-end">Returned</th><th className="text-end">Outstanding</th><th>Status</th></tr></thead>
            <tbody>{paged.pageRows.map((b) => (
              <tr key={b.id}><td>{b.id}</td><td><strong>{b.itemName}</strong></td><td className="text-end">{b.quantityReleased}</td><td>{formatDate(b.releaseDate)}</td><td>{formatDate(b.expectedReturnDate)}</td>
                <td className="text-end">{b.quantityReturned}</td><td className="text-end"><strong>{outstanding(b)}</strong></td><td><RequestStatus status={borrowStatus(b, today)} /></td></tr>))}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No items have been released to you yet.</p>}
        <Pagination {...paged} />
      </div>
    </>
  );
}
