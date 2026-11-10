// Report builders. Every report is derived from the live db; nothing is stored.
import { computeAvailable, isLowStock, borrowStatus, outstanding } from '../utils/calculations.js';
import { toLocalDay, todayStr } from '../utils/formatters.js';

export const REPORTS = [
  { id: 'inventory', title: 'Inventory Summary Report' },
  { id: 'available', title: 'Available Stock Report' },
  { id: 'borrowed', title: 'Borrowed Items Report' },
  { id: 'pending', title: 'Pending Requests Report' },
  { id: 'overdue', title: 'Overdue Items Report' },
  { id: 'damaged', title: 'Damaged Items Report' },
  { id: 'returns', title: 'Return History Report' },
  { id: 'transactions', title: 'Transaction History Report' },
  { id: 'users', title: 'User Activity Report' },
];

const inRange = (day, from, to) => (!from || day >= from) && (!to || day <= to);

export function buildReport(db, id, { from = '', to = '', categoryId = '', q = '' } = {}) {
  const cat = (cid) => db.categories.find((c) => c.id === cid)?.name || '—';
  const itemOf = (iid) => db.items.find((i) => i.id === iid);
  const itemOk = (iid) => !categoryId || itemOf(iid)?.categoryId === categoryId;
  const today = todayStr();
  let columns; let rows; let summary;

  if (id === 'inventory' || id === 'available') {
    const items = db.items.filter((i) => !i.archived && (!categoryId || i.categoryId === categoryId));
    if (id === 'inventory') {
      columns = [['id', 'Item ID'], ['name', 'Item'], ['category', 'Category'], ['total', 'Total'], ['available', 'Available'], ['borrowed', 'Borrowed'], ['damaged', 'Damaged'], ['lost', 'Lost'], ['unit', 'Unit'], ['condition', 'Condition']];
      rows = items.map((i) => ({ id: i.id, name: i.name, category: cat(i.categoryId), total: i.totalQuantity, available: computeAvailable(i), borrowed: i.borrowedQuantity, damaged: i.damagedQuantity, lost: i.lostQuantity || 0, unit: i.unit, condition: i.condition }));
      summary = [['Item types', rows.length], ['Total units', sum(rows, 'total')], ['Available', sum(rows, 'available')], ['Borrowed', sum(rows, 'borrowed')], ['Damaged', sum(rows, 'damaged')], ['Lost', sum(rows, 'lost')]];
    } else {
      columns = [['id', 'Item ID'], ['name', 'Item'], ['category', 'Category'], ['available', 'Available'], ['unit', 'Unit'], ['minStock', 'Minimum'], ['status', 'Stock Status']];
      rows = items.map((i) => ({ id: i.id, name: i.name, category: cat(i.categoryId), available: computeAvailable(i), unit: i.unit, minStock: i.minStock, status: computeAvailable(i) === 0 ? 'Out of stock' : isLowStock(i) ? 'Low stock' : 'In stock' }));
      summary = [['Item types', rows.length], ['Available units', sum(rows, 'available')], ['Low stock', rows.filter((r) => r.status === 'Low stock').length], ['Out of stock', rows.filter((r) => r.status === 'Out of stock').length]];
    }
  } else if (id === 'borrowed' || id === 'overdue') {
    const list = db.borrows.filter((b) => outstanding(b) > 0 && itemOk(b.itemId) && inRange(toLocalDay(b.releaseDate), from, to)
      && (id === 'borrowed' || borrowStatus(b, today) === 'Overdue'));
    columns = [['id', 'Borrow ID'], ['borrower', 'Borrower'], ['organization', 'Organization'], ['item', 'Item'], ['released', 'Released'], ['outstanding', 'Outstanding'], ['releaseDate', 'Release Date'], ['dueDate', 'Return By'], ['status', 'Status']];
    rows = list.map((b) => ({ id: b.id, borrower: b.borrowerName, organization: b.organization, item: b.itemName, released: b.quantityReleased, outstanding: outstanding(b), releaseDate: toLocalDay(b.releaseDate), dueDate: b.expectedReturnDate, status: borrowStatus(b, today) }));
    summary = [['Transactions', rows.length], ['Units outstanding', sum(rows, 'outstanding')], ['Overdue', rows.filter((r) => r.status === 'Overdue').length]];
  } else if (id === 'pending') {
    columns = [['id', 'Request ID'], ['requester', 'Requester'], ['organization', 'Organization'], ['item', 'Item'], ['quantity', 'Quantity'], ['purpose', 'Purpose'], ['requested', 'Date Requested'], ['dueDate', 'Return By']];
    rows = db.requests.filter((r) => r.status === 'Pending' && itemOk(r.itemId) && inRange(r.dateRequested, from, to))
      .map((r) => ({ id: r.id, requester: r.requesterName, organization: r.organization, item: r.itemName, quantity: r.quantity, purpose: r.purpose, requested: r.dateRequested, dueDate: r.expectedReturnDate }));
    summary = [['Pending requests', rows.length], ['Units requested', sum(rows, 'quantity')]];
  } else if (id === 'damaged') {
    columns = [['id', 'Report ID'], ['item', 'Item'], ['borrower', 'Borrower'], ['borrowId', 'Borrow ID'], ['quantity', 'Quantity'], ['reported', 'Date Reported'], ['description', 'Description'], ['status', 'Status']];
    rows = db.damageReports.filter((d) => itemOk(d.itemId) && inRange(d.dateReported, from, to))
      .map((d) => ({ id: d.id, item: d.itemName, borrower: d.borrowerName, borrowId: d.borrowId, quantity: d.quantity, reported: d.dateReported, description: d.description, status: d.status }));
    summary = [['Reports', rows.length], ['Units damaged', sum(rows, 'quantity')], ['Still open', rows.filter((r) => r.status === 'Reported' || r.status === 'Under Repair').length]];
  } else if (id === 'returns') {
    columns = [['id', 'Return ID'], ['borrowId', 'Borrow ID'], ['borrower', 'Borrower'], ['item', 'Item'], ['quantity', 'Quantity'], ['condition', 'Condition'], ['date', 'Return Date'], ['status', 'Status']];
    rows = db.returns.filter((r) => itemOk(r.itemId) && inRange(r.returnDate, from, to))
      .map((r) => ({ id: r.id, borrowId: r.borrowId, borrower: r.borrowerName, item: r.itemName, quantity: r.quantity, condition: r.condition, date: r.returnDate, status: r.returnStatus }));
    summary = [['Return records', rows.length], ['Units returned', sum(rows, 'quantity')], ['Good', sumIf(rows, 'condition', 'Good')], ['Damaged', sumIf(rows, 'condition', 'Damaged')], ['Lost', sumIf(rows, 'condition', 'Lost')]];
  } else if (id === 'transactions') {
    columns = [['id', 'Transaction ID'], ['type', 'Type'], ['reference', 'Reference'], ['item', 'Item'], ['quantity', 'Quantity'], ['by', 'Performed By'], ['when', 'Date'], ['description', 'Description']];
    rows = db.transactions.filter((t) => inRange(toLocalDay(t.timestamp), from, to))
      .map((t) => ({ id: t.id, type: t.type, reference: t.referenceId, item: t.itemName, quantity: t.quantity ?? '', by: t.performedBy, when: toLocalDay(t.timestamp), description: t.description }));
    summary = [['Transactions', rows.length], ['Types', new Set(rows.map((r) => r.type)).size]];
  } else if (id === 'users') {
    columns = [['idNumber', 'ID Number'], ['name', 'Name'], ['organization', 'Organization'], ['status', 'Account'], ['requests', 'Requests'], ['borrows', 'Borrows'], ['outstanding', 'Units Outstanding'], ['returns', 'Returns'], ['last', 'Last Activity']];
    rows = db.users.filter((u) => u.role === 'student').map((u) => {
      const reqs = db.requests.filter((r) => r.userId === u.id); const brs = db.borrows.filter((b) => b.userId === u.id);
      const times = [...reqs.map((r) => r.updatedAt), ...db.returns.filter((r) => r.userId === u.id).map((r) => r.createdAt)].sort();
      return { idNumber: u.idNumber, name: u.fullName, organization: u.organization, status: u.active ? 'Active' : 'Deactivated', requests: reqs.length, borrows: brs.length, outstanding: brs.reduce((s, b) => s + outstanding(b), 0), returns: db.returns.filter((r) => r.userId === u.id).length, last: times.length ? toLocalDay(times.at(-1)) : '—' };
    }).filter((r) => inRange(r.last === '—' ? '' : r.last, from, to) || (!from && !to));
    summary = [['Users', rows.length], ['Active', rows.filter((r) => r.status === 'Active').length], ['Total requests', sum(rows, 'requests')], ['Units outstanding', sum(rows, 'outstanding')]];
  } else {
    throw new Error(`Unknown report: ${id}`);
  }

  const s = q.trim().toLowerCase();
  if (s) rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(s)));
  return { id, title: REPORTS.find((r) => r.id === id).title, columns: columns.map(([key, label]) => ({ key, label })), rows, summary: summary.map(([label, value]) => ({ label, value })) };
}

const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
const sumIf = (rows, k, v) => rows.filter((r) => r[k] === v).reduce((s, r) => s + Number(r.quantity || 0), 0);

export function sortRows(rows, key, dir = 'asc') {
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key]; const y = b[key];
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * m;
  });
}

// CSV with quote escaping and spreadsheet-formula neutralization (=, +, -, @).
export function toCsv(columns, rows) {
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(','))].join('\r\n');
}
