import { Boxes, PackageOpen, PackageCheck, Clock, CheckCircle2, AlarmClock, AlertTriangle, Users } from 'lucide-react';
import { lazy, Suspense } from 'react';
import StatCard from '../../components/common/StatCard.jsx';
import { useData } from '../../context/DataContext.jsx';
import { computeAvailable, isLowStock, borrowStatus, outstanding } from '../../utils/calculations.js';
import { formatDateTime, formatDate, todayStr } from '../../utils/formatters.js';

// Recharts is large; load it only when the admin dashboard is opened.
const DashboardCharts = lazy(() => import('../../components/charts/DashboardCharts.jsx'));

export default function AdminDashboard() {
  const { db } = useData();
  const items = db.items.filter((i) => !i.archived);
  const today = todayStr();
  const overdueList = db.borrows.filter((b) => borrowStatus(b, today) === 'Overdue');
  const overdue = overdueList.length;
  const low = items.filter(isLowStock);
  const recent = [...db.transactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);

  return (
    <>
      <h1 className="page-title">Administrator Dashboard</h1>
      <div className="stat-grid">
        <StatCard label="Total Inventory Items" value={items.length} icon={Boxes} />
        <StatCard label="Total Available Stock" value={items.reduce((s, i) => s + computeAvailable(i), 0)} icon={PackageOpen} />
        <StatCard label="Total Borrowed Items" value={items.reduce((s, i) => s + i.borrowedQuantity, 0)} icon={PackageCheck} />
        <StatCard label="Pending Requests" value={db.requests.filter((r) => r.status === 'Pending').length} icon={Clock} />
        <StatCard label="Approved Requests" value={db.requests.filter((r) => r.status === 'Approved').length} icon={CheckCircle2} />
        <StatCard label="Overdue Items" value={overdue} icon={AlarmClock} />
        <StatCard label="Damaged Items" value={items.reduce((s, i) => s + i.damagedQuantity, 0)} icon={AlertTriangle} />
        <StatCard label="Registered Users" value={db.users.filter((u) => u.role === 'student').length} icon={Users} />
      </div>
      <Suspense fallback={<div className="panel mt-3 text-muted" role="status">Loading charts…</div>}><DashboardCharts db={db} /></Suspense>
      <div className="row g-3 mt-1">
        <div className="col-lg-7"><div className="panel h-100">
          <h2 className="h6 fw-bold">Recent transactions</h2>
          <ul className="list-clean">{recent.map((t) => <li key={t.id}><strong>{t.type}</strong> — {t.description}<small>{formatDateTime(t.timestamp)} · {t.performedBy}</small></li>)}</ul>
        </div></div>
        <div className="col-lg-5"><div className="panel h-100">
          <h2 className="h6 fw-bold">Low-stock alerts</h2>
          {low.length === 0 ? <p className="empty-state">No low-stock items.</p> :
            <ul className="list-clean">{low.map((i) => <li key={i.id}><strong>{i.name}</strong><small>{computeAvailable(i)} {i.unit} left (minimum {i.minStock})</small></li>)}</ul>}
        </div></div>
        <div className="col-12"><div className="panel">
          <h2 className="h6 fw-bold">Overdue borrowing alerts</h2>
          {overdueList.length === 0 ? <p className="empty-state">Nothing is overdue.</p> :
            <ul className="list-clean">{overdueList.map((b) => <li key={b.id}><strong>{b.borrowerName}</strong> — {outstanding(b)} × {b.itemName}<small>{b.id} · was due {formatDate(b.expectedReturnDate)}</small></li>)}</ul>}
        </div></div>
      </div>
    </>
  );
}
