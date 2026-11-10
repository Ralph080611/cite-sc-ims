import { useMemo, useState } from 'react';
import { Download, Printer, ArrowUpDown } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Pagination, { usePaged } from '../../components/common/Pagination.jsx';
import { REPORTS, buildReport, sortRows, toCsv } from '../../services/reportService.js';
import { formatDateTime } from '../../utils/formatters.js';

export default function ReportsPage() {
  const { db } = useData();
  const toast = useToast();
  const [id, setId] = useState('inventory');
  const [f, setF] = useState({ from: '', to: '', categoryId: '', q: '' });
  const [sort, setSort] = useState({ key: '', dir: 'asc' });
  const rep = useMemo(() => buildReport(db, id, f), [db, id, f]);
  const rows = useMemo(() => (sort.key ? sortRows(rep.rows, sort.key, sort.dir) : rep.rows), [rep, sort]);
  const paged = usePaged(rows, 12);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const exportCsv = () => {
    const blob = new Blob(['﻿' + toCsv(rep.columns, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${id}-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Exported ${rows.length} row(s) to CSV.`);
  };

  return (
    <>
      <h1 className="page-title no-print">Reports and Analytics</h1>
      <div className="panel mt-3 no-print">
        <div className="filters">
          <select className="form-select" value={id} onChange={(e) => { setId(e.target.value); setSort({ key: '', dir: 'asc' }); }} aria-label="Report type">{REPORTS.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
          <input type="date" className="form-control w-auto" value={f.from} onChange={set('from')} aria-label="From date" />
          <input type="date" className="form-control w-auto" value={f.to} onChange={set('to')} aria-label="To date" />
          <select className="form-select" value={f.categoryId} onChange={set('categoryId')} aria-label="Category"><option value="">All categories</option>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="form-control w-auto" placeholder="Search within report…" value={f.q} onChange={set('q')} aria-label="Search report" />
          <button className="btn btn-outline-secondary" onClick={() => window.print()}><Printer size={16} className="me-1" />Print</button>
          <button className="btn btn-primary" onClick={exportCsv}><Download size={16} className="me-1" />Export CSV</button>
        </div>
        {['transactions', 'users'].includes(id) && f.categoryId && <small className="text-muted">The category filter does not apply to this report.</small>}
      </div>
      <div className="panel mt-3 report-sheet">
        <h2 className="h5 fw-bold mb-0">{rep.title}</h2>
        <p className="text-muted small">{db.settings.organizationName} · Generated {formatDateTime(new Date().toISOString())}{f.from || f.to ? ` · ${f.from || '…'} to ${f.to || '…'}` : ''}</p>
        <div className="stat-grid sm mb-3">{rep.summary.map((s) => <div key={s.label} className="mini-stat"><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>)}</div>
        <div className="table-responsive"><table className="table align-middle data-table">
          <thead><tr>{rep.columns.map((c) => <th key={c.key}><button className="th-sort" onClick={() => toggle(c.key)}>{c.label}<ArrowUpDown size={12} /></button></th>)}</tr></thead>
          <tbody>{paged.pageRows.map((r, i) => <tr key={i}>{rep.columns.map((c) => <td key={c.key}>{String(r[c.key] ?? '')}</td>)}</tr>)}</tbody>
        </table></div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No records match these filters.</p>}
        <div className="no-print"><Pagination {...paged} /></div>
      </div>
    </>
  );
}
