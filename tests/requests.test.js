import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedData } from '../src/services/seedData.js';
import * as rq from '../src/services/requestService.js';
import { computeAvailable, borrowStatus } from '../src/utils/calculations.js';

const TODAY = '2026-11-05';
const student = { id: 'USR-DEMO-001', role: 'student', fullName: 'Demo Student', idNumber: '2024-0001', organization: 'BSIT' };
const other = { id: 'USR-X', role: 'student', fullName: 'Other', idNumber: '2', organization: 'X' };
const admin = { id: 'USR-ADMIN-001', role: 'admin', fullName: 'System Administrator' };
const form = (o = {}) => ({ itemId: 'ITM-001', quantity: '10', purpose: 'Assembly', dateNeeded: '2026-11-06', expectedReturnDate: '2026-11-08', remarks: '', ...o });
const stock = (db, id = 'ITM-001') => { const i = db.items.find((x) => x.id === id); return { avail: computeAvailable(i), borrowed: i.borrowedQuantity, total: i.totalQuantity }; };
const submit = (db, o) => rq.submitRequest(db, student, form(o), TODAY);

test('valid request is Pending, logged, and does NOT reserve or deduct stock', () => {
  const db = buildSeedData(); const before = stock(db);
  const r = submit(db); assert.ok(r.ok); assert.equal(r.request.status, 'Pending');
  assert.deepEqual(stock(db), before);
  assert.equal(db.transactions.at(-1).type, 'Item Request');
});
test('invalid quantities rejected: 0, negative, decimal, text, over available', () => {
  const db = buildSeedData();
  for (const q of ['0', '-3', '2.5', 'abc', '', '61']) assert.ok(submit(db, { quantity: q }).errors?.quantity, `qty ${q}`);
  assert.equal(db.requests.length, 0);
});
test('required fields and date rules', () => {
  const db = buildSeedData();
  assert.ok(submit(db, { purpose: '  ' }).errors.purpose);
  assert.ok(submit(db, { itemId: '' }).errors.itemId);
  assert.ok(submit(db, { dateNeeded: '2026-11-01' }).errors.dateNeeded);
  assert.ok(submit(db, { expectedReturnDate: '2026-11-05', dateNeeded: '2026-11-06' }).errors.expectedReturnDate);
  assert.ok(submit(db, { expectedReturnDate: '2026-11-04' }).errors.expectedReturnDate);
  assert.ok(submit(db, { dateNeeded: '2026-11-06', expectedReturnDate: '2026-11-06' }).ok);
});
test('archived item cannot be requested; admin accounts cannot submit', () => {
  const db = buildSeedData(); db.items[0].archived = true;
  assert.ok(submit(db).errors.itemId);
  assert.equal(rq.submitRequest(buildSeedData(), admin, form(), TODAY).ok, false);
});
test('identical pending duplicate blocked', () => {
  const db = buildSeedData(); assert.ok(submit(db).ok);
  assert.match(submit(db).error, /identical pending/);
  assert.equal(db.requests.length, 1);
});
test('cancel: only owner, only Pending, no stock effect', () => {
  const db = buildSeedData(); const id = submit(db).request.id; const before = stock(db);
  assert.equal(rq.cancelRequest(db, id, other).ok, false);
  assert.ok(rq.cancelRequest(db, id, student).ok);
  assert.deepEqual(stock(db), before);
  assert.match(rq.cancelRequest(db, id, student).error, /Only pending/);
  assert.equal(rq.approveRequest(db, id, '', admin).ok, false);
});
test('approve: once only, no stock change, students cannot approve', () => {
  const db = buildSeedData(); const id = submit(db).request.id; const before = stock(db);
  assert.equal(rq.approveRequest(db, id, '', student).ok, false);
  assert.ok(rq.approveRequest(db, id, 'ok', admin).ok);
  assert.deepEqual(stock(db), before);
  const r = db.requests[0]; assert.equal(r.approvedBy, 'System Administrator'); assert.ok(r.approvedAt);
  assert.match(rq.approveRequest(db, id, '', admin).error, /already processed/);
});
test('reject: reason required, no stock effect, cannot then release', () => {
  const db = buildSeedData(); const id = submit(db).request.id; const before = stock(db);
  assert.match(rq.rejectRequest(db, id, ' ', admin).error, /reason is required/);
  assert.ok(rq.rejectRequest(db, id, 'Not available that day', admin).ok);
  assert.deepEqual(stock(db), before); assert.equal(db.requests[0].adminRemarks, 'Not available that day');
  assert.equal(rq.releaseRequest(db, id, admin).ok, false);
});
test('release: requires approval; deducts exactly once; repeat release blocked', () => {
  const db = buildSeedData(); const id = submit(db).request.id;
  assert.match(rq.releaseRequest(db, id, admin).error, /Only approved/);
  rq.approveRequest(db, id, '', admin);
  const r1 = rq.releaseRequest(db, id, admin); assert.ok(r1.ok);
  assert.deepEqual(stock(db), { avail: 50, borrowed: 10, total: 60 });
  for (let i = 0; i < 3; i++) assert.match(rq.releaseRequest(db, id, admin).error, /already been released/);
  assert.deepEqual(stock(db), { avail: 50, borrowed: 10, total: 60 });
  assert.equal(db.borrows.length, 1); assert.equal(db.requests[0].status, 'Released');
  assert.equal(db.borrows[0].quantityReleased, 10);
});
test('release re-checks stock: two approved requests compete for the same units', () => {
  const db = buildSeedData();
  const a = submit(db, { quantity: '40' }).request.id; const b = submit(db, { quantity: '30' }).request.id;
  rq.approveRequest(db, a, '', admin); rq.approveRequest(db, b, '', admin);
  assert.ok(rq.releaseRequest(db, a, admin).ok);
  assert.match(rq.releaseRequest(db, b, admin).error, /Insufficient stock/);
  assert.deepEqual(stock(db), { avail: 20, borrowed: 40, total: 60 });
  assert.equal(db.requests.find((r) => r.id === b).status, 'Approved');
});
test('release blocked if item archived after approval; stock reduced after approval', () => {
  const db = buildSeedData(); const id = submit(db).request.id; rq.approveRequest(db, id, '', admin);
  db.items[0].totalQuantity = 5;
  assert.match(rq.releaseRequest(db, id, admin).error, /Insufficient/);
  db.items[0].totalQuantity = 60; db.items[0].archived = true;
  assert.match(rq.releaseRequest(db, id, admin).error, /no longer available/);
});
test('every step logged; transaction IDs unique; borrow status derivation', () => {
  const db = buildSeedData(); const id = submit(db).request.id;
  rq.approveRequest(db, id, '', admin); const { borrow } = rq.releaseRequest(db, id, admin);
  assert.deepEqual(db.transactions.slice(-3).map((t) => t.type), ['Item Request', 'Request Approved', 'Item Released']);
  assert.equal(new Set(db.transactions.map((t) => t.id)).size, db.transactions.length);
  assert.equal(borrowStatus(borrow, '2026-11-06'), 'Active');
  assert.equal(borrowStatus(borrow, '2026-12-01'), 'Overdue');
  borrow.quantityReturned = 4; assert.equal(borrowStatus(borrow, '2026-11-06'), 'Partially Returned');
  borrow.quantityReturned = 10; assert.equal(borrowStatus(borrow, '2026-12-01'), 'Completed');
});
