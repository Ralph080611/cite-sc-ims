// Append-only audit log. Records are never edited or removed by normal operations.
import { generateId } from '../utils/idGenerator.js';

export function makeTransaction({ type, referenceId = '—', itemName = '—', quantity = null, performedBy, description }) {
  return { id: generateId('TXN'), type, referenceId, itemName, quantity, performedBy, timestamp: new Date().toISOString(), description };
}

import { toLocalDay } from '../utils/formatters.js';

// Pure filter/sort used by every transaction view (admin, student, reports).
export function filterTransactions(list, { q = '', type = '', from = '', to = '', sort = 'newest' } = {}) {
  const s = q.trim().toLowerCase();
  const rows = list.filter((t) => {
    if (type && t.type !== type) return false;
    const day = toLocalDay(t.timestamp);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return !s || [t.id, t.type, t.referenceId, t.itemName, t.performedBy, t.description].some((v) => String(v ?? '').toLowerCase().includes(s));
  });
  const by = {
    newest: (a, b) => b.timestamp.localeCompare(a.timestamp),
    oldest: (a, b) => a.timestamp.localeCompare(b.timestamp),
    type: (a, b) => a.type.localeCompare(b.type) || b.timestamp.localeCompare(a.timestamp),
  }[sort] || (() => 0);
  return rows.sort(by);
}

// A student's own trail: events that reference their requests, borrows, returns, damage reports, or account.
export function transactionsForUser(db, userId) {
  const ids = new Set([userId]);
  db.requests.filter((r) => r.userId === userId).forEach((r) => ids.add(r.id));
  db.borrows.filter((b) => b.userId === userId).forEach((b) => ids.add(b.id));
  db.returns.filter((r) => r.userId === userId).forEach((r) => ids.add(r.id));
  const mine = new Set(db.borrows.filter((b) => b.userId === userId).map((b) => b.id));
  db.damageReports.filter((d) => mine.has(d.borrowId)).forEach((d) => ids.add(d.id));
  return db.transactions.filter((t) => ids.has(t.referenceId));
}
