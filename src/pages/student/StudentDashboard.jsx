import { PackageCheck, Clock, CheckCircle2, Boxes, Undo2 } from 'lucide-react';
import RequestStatus from '../../components/common/RequestStatus.jsx';
import { formatDateTime } from '../../utils/formatters.js';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { computeAvailable, outstanding as outstandingOf } from '../../utils/calculations.js';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { db } = useData();
  const mine = db.requests.filter((r) => r.userId === user.id);
  const myBorrows = db.borrows.filter((b) => b.userId === user.id);
  const availableTypes = db.items.filter((i) => !i.archived && computeAvailable(i) > 0).length;
  const outstanding = myBorrows.reduce((s, b) => s + outstandingOf(b), 0);
  const updates = [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const completed = db.returns.filter((r) => r.userId === user.id).length;

  return (
    <>
      <h1 className="page-title">Welcome, {user.fullName}</h1>
      <p className="text-muted">{user.organization}</p>
      <div className="stat-grid">
        <StatCard label="Available Item Types" value={availableTypes} icon={Boxes} />
        <StatCard label="Pending Requests" value={mine.filter((r) => r.status === 'Pending').length} icon={Clock} />
        <StatCard label="Approved Requests" value={mine.filter((r) => r.status === 'Approved').length} icon={CheckCircle2} />
        <StatCard label="Currently Borrowed" value={outstanding} icon={PackageCheck} />
        <StatCard label="Completed Returns" value={completed} icon={Undo2} />
      </div>
      <div className="panel mt-4">
        <h2 className="h6 fw-bold">Recent request updates</h2>
        {updates.length === 0 ? <p className="empty-state">No activity yet. Browse inventory to submit your first request.</p> :
          <ul className="list-clean">{updates.map((r) => <li key={r.id}><strong>{r.itemName}</strong> × {r.quantity} <RequestStatus status={r.status} /><small>{r.id} · {formatDateTime(r.updatedAt)}{r.adminRemarks ? ` · ${r.adminRemarks}` : ''}</small></li>)}</ul>}
      </div>
    </>
  );
}
