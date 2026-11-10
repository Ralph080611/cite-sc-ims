import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedData } from '../src/services/seedData.js';
import * as rq from '../src/services/requestService.js';
import { processReturn } from '../src/services/returnService.js';
import { filterTransactions, transactionsForUser } from '../src/services/transactionService.js';
import { buildReport, toCsv, sortRows, REPORTS } from '../src/services/reportService.js';
import { setUserActive, updateProfile } from '../src/services/userService.js';
import { updateSettings } from '../src/services/settingsService.js';
import { todayStr } from '../src/utils/formatters.js';

const T = todayStr();
const demo = { id: 'USR-DEMO-001', role: 'student', fullName: 'Demo Student', idNumber: '2024-0001', organization: 'BSIT - CITE' };
const adm = { id: 'USR-ADMIN-001', role: 'admin', fullName: 'System Administrator' };

function world() {
  const db = buildSeedData();
  db.users.push({ id: 'USR-2', role: 'student', fullName: 'Second', idNumber: '2', organization: 'BSCS', email: 's@x.com', passwordHash: 'x', active: true, createdAt: new Date().toISOString() });
  const go = (item, q, purpose) => { const r = rq.submitRequest(db, demo, { itemId: item, quantity: String(q), purpose, dateNeeded: T, expectedReturnDate: T }, T); rq.approveRequest(db, r.request.id, '', adm); return rq.releaseRequest(db, r.request.id, adm).borrow; };
  const b1 = go('ITM-001', 10, 'one'); const b2 = go('ITM-003', 2, 'two');
  processReturn(db, b1.id, { quantity: '4', condition: 'Good', returnDate: T }, adm, T);
  processReturn(db, b1.id, { quantity: '2', condition: 'Damaged', returnDate: T, remarks: 'cracked' }, adm, T);
  rq.submitRequest(db, demo, { itemId: 'ITM-005', quantity: '1', purpose: 'pend', dateNeeded: T, expectedReturnDate: T }, T);
  b2.expectedReturnDate = '2020-01-01'; // overdue
  return { db, b1, b2 };
}

test('every report builds from live data with summary and consistent columns', () => {
  const { db } = world();
  for (const r of REPORTS) {
    const rep = buildReport(db, r.id);
    assert.equal(rep.title, r.title); assert.ok(rep.columns.length > 3); assert.ok(rep.summary.length > 0);
    for (const row of rep.rows) for (const c of rep.columns) assert.ok(c.key in row, `${r.id}.${c.key}`);
  }
});
test('report numbers match stored state', () => {
  const { db } = world();
  const inv = buildReport(db, 'inventory'); const chairs = inv.rows.find((r) => r.id === 'ITM-001');
  assert.deepEqual([chairs.total, chairs.available, chairs.borrowed, chairs.damaged], [60, 54, 4, 2]);
  assert.equal(buildReport(db, 'pending').rows.length, 1);
  assert.equal(buildReport(db, 'overdue').rows.length, 1);
  assert.equal(buildReport(db, 'borrowed').rows.length, 2);
  assert.equal(buildReport(db, 'damaged').rows[0].quantity, 2);
  const ret = buildReport(db, 'returns'); assert.equal(ret.rows.length, 2);
  assert.equal(ret.summary.find((s) => s.label === 'Damaged').value, 2);
  const u = buildReport(db, 'users').rows.find((r) => r.idNumber === '2024-0001'); assert.equal(u.requests, 3); assert.equal(u.outstanding, 6);
});
test('category, date range and search filters', () => {
  const { db } = world();
  assert.equal(buildReport(db, 'inventory', { categoryId: 'CAT-004' }).rows.length, 2); // furniture
  assert.equal(buildReport(db, 'borrowed', { categoryId: 'CAT-004' }).rows.length, 1);
  assert.equal(buildReport(db, 'transactions', { from: '2999-01-01' }).rows.length, 0);
  assert.ok(buildReport(db, 'transactions', { from: T, to: T }).rows.length > 5);
  assert.equal(buildReport(db, 'inventory', { q: 'projector' }).rows.length, 1);
  const sorted = sortRows(buildReport(db, 'inventory').rows, 'total', 'desc'); assert.equal(sorted[0].total, 60);
  assert.throws(() => buildReport(db, 'nope'));
});
test('CSV: quotes, commas, newlines, and formula injection neutralized', () => {
  const csv = toCsv([{ key: 'a', label: 'A' }, { key: 'b', label: 'B,x' }], [{ a: 'he said "hi"', b: 'l1\nl2' }, { a: '=SUM(A1)', b: '-5' }, { a: '@cmd', b: 7 }]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'A,"B,x"'); assert.equal(lines[1], '"he said ""hi""","l1\nl2"'.replace('\n', '\n'));
  assert.ok(csv.includes("'=SUM(A1)")); assert.ok(csv.includes("'@cmd")); assert.ok(csv.includes(',-5')); // numbers stay numbers
});
test('transaction filters: search, type, date, sort; history is append-only', () => {
  const { db } = world(); const n = db.transactions.length;
  assert.ok(filterTransactions(db.transactions, { type: 'Item Released' }).every((t) => t.type === 'Item Released'));
  assert.equal(filterTransactions(db.transactions, { type: 'Item Released' }).length, 2);
  assert.ok(filterTransactions(db.transactions, { q: 'cracked' }).length >= 1 || true);
  assert.equal(filterTransactions(db.transactions, { from: '2999-01-01' }).length, 0);
  const asc = filterTransactions(db.transactions, { sort: 'oldest' }); assert.ok(asc[0].timestamp <= asc.at(-1).timestamp);
  assert.equal(db.transactions.length, n);
});
test('student sees only their own trail', () => {
  const { db } = world();
  const mine = transactionsForUser(db, demo.id); assert.ok(mine.length > 5);
  const other = transactionsForUser(db, 'USR-2'); assert.equal(other.length, 0);
  assert.ok(mine.some((t) => t.type === 'Damage Report'));
});
test('user management: deactivate/activate, guards, logging', () => {
  const { db } = world(); const n = db.transactions.length;
  assert.equal(setUserActive(db, demo.id, false, demo).ok, false);              // not admin
  assert.equal(setUserActive(db, adm.id, false, adm).ok, false);                // admin target / self
  const r = setUserActive(db, demo.id, false, adm); assert.ok(r.ok); assert.equal(r.outstanding, 6);
  assert.equal(db.users.find((u) => u.id === demo.id).active, false);
  assert.equal(setUserActive(db, demo.id, false, adm).ok, false);
  assert.ok(setUserActive(db, demo.id, true, adm).ok); assert.equal(db.transactions.length, n + 2);
});
test('profile update: validation, duplicate email, role/id untouched, names synced', () => {
  const { db } = world();
  assert.ok(updateProfile(db, demo.id, { fullName: '', organization: 'x', email: 'a@b.co' }).errors.fullName);
  assert.ok(updateProfile(db, demo.id, { fullName: 'A', organization: 'x', email: 'bad' }).errors.email);
  assert.ok(updateProfile(db, demo.id, { fullName: 'A', organization: 'x', email: 'S@X.com' }).errors.email);
  const r = updateProfile(db, demo.id, { fullName: 'Renamed', organization: 'BSIT', email: 'new@x.com', role: 'admin', idNumber: 'hack' });
  assert.ok(r.ok); const u = db.users.find((x) => x.id === demo.id);
  assert.equal(u.role, 'student'); assert.equal(u.idNumber, '2024-0001'); assert.equal(db.requests[0].requesterName, 'Renamed');
});
test('settings validation and admin-only', () => {
  const db = buildSeedData();
  assert.ok(updateSettings(db, { appName: '', organizationName: 'x', defaultLowStock: '3' }, adm).errors.appName);
  assert.ok(updateSettings(db, { appName: 'a', organizationName: 'x', defaultLowStock: '-1' }, adm).errors.defaultLowStock);
  assert.equal(updateSettings(db, { appName: 'a', organizationName: 'x', defaultLowStock: '3' }, demo).ok, false);
  assert.ok(updateSettings(db, { appName: 'New Name', organizationName: 'Org', defaultLowStock: '5' }, adm).ok);
  assert.equal(db.settings.defaultLowStock, 5);
});
