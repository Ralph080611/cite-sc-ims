import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { computeAvailable } from '../../utils/calculations.js';
import { toLocalDay } from '../../utils/formatters.js';

const AMBER = '#EBA832'; const INK = '#6b6b6b'; const SOFT = '#bdbdbd';
const STATUS_COLORS = { Pending: '#EBA832', Approved: '#2f7d5b', Released: '#3b6ea8', Rejected: '#c0392b', Cancelled: '#9a9a9a', 'Partially Returned': '#8e6bbf', Returned: '#1f1f1f' };
const axis = { fill: 'var(--text-muted)', fontSize: 12 };
const tip = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' };

// All chart data is derived from the live db on every render.
export default function DashboardCharts({ db }) {
  const byCategory = useMemo(() => db.categories.map((c) => {
    const items = db.items.filter((i) => !i.archived && i.categoryId === c.id);
    return { name: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name, Available: items.reduce((s, i) => s + computeAvailable(i), 0), Borrowed: items.reduce((s, i) => s + i.borrowedQuantity, 0), Damaged: items.reduce((s, i) => s + i.damagedQuantity, 0) };
  }).filter((r) => r.Available + r.Borrowed + r.Damaged > 0), [db]);

  const statuses = useMemo(() => {
    const counts = {}; db.requests.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [db]);

  const activity = useMemo(() => {
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return toLocalDay(d.toISOString()); });
    return days.map((day) => ({ day: day.slice(5), Released: db.borrows.filter((b) => toLocalDay(b.releaseDate) === day).reduce((s, b) => s + b.quantityReleased, 0), Returned: db.returns.filter((r) => toLocalDay(r.createdAt) === day).reduce((s, r) => s + r.quantity, 0) }));
  }, [db]);

  return (
    <div className="row g-3 mt-1">
      <div className="col-lg-7"><div className="panel h-100"><h2 className="h6 fw-bold">Inventory overview by category</h2>
        <div className="chart-box" role="img" aria-label="Stacked bar chart of available, borrowed and damaged units by category">
          <ResponsiveContainer width="100%" height={260}><BarChart data={byCategory} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={axis} interval={0} angle={-20} textAnchor="end" height={55} /><YAxis tick={axis} allowDecimals={false} /><Tooltip contentStyle={tip} /><Legend />
            <Bar dataKey="Available" stackId="a" fill={AMBER} /><Bar dataKey="Borrowed" stackId="a" fill={INK} /><Bar dataKey="Damaged" stackId="a" fill="#c0392b" /></BarChart></ResponsiveContainer></div></div></div>
      <div className="col-lg-5"><div className="panel h-100"><h2 className="h6 fw-bold">Request status distribution</h2>
        {statuses.length === 0 ? <p className="empty-state">No requests yet.</p> :
          <div className="chart-box" role="img" aria-label="Pie chart of request statuses"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={statuses} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{statuses.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name] || SOFT} stroke="var(--surface)" />)}</Pie><Tooltip contentStyle={tip} /><Legend /></PieChart></ResponsiveContainer></div>}</div></div>
      <div className="col-12"><div className="panel"><h2 className="h6 fw-bold">Borrowing activity, last 7 days (units)</h2>
        <div className="chart-box" role="img" aria-label="Bar chart of units released and returned per day"><ResponsiveContainer width="100%" height={220}><BarChart data={activity} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" tick={axis} /><YAxis tick={axis} allowDecimals={false} /><Tooltip contentStyle={tip} /><Legend />
          <Bar dataKey="Released" fill={AMBER} radius={[4, 4, 0, 0]} /><Bar dataKey="Returned" fill={INK} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div></div>
    </div>
  );
}
