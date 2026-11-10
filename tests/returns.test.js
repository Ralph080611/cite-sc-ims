import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedData } from '../src/services/seedData.js';
import * as rq from '../src/services/requestService.js';
import { processReturn } from '../src/services/returnService.js';
import { updateDamageReport } from '../src/services/damageService.js';
import { computeAvailable, outstanding } from '../src/utils/calculations.js';
import { todayStr } from '../src/utils/formatters.js';

const TODAY = todayStr();
const student = { id: 'USR-DEMO-001', role: 'student', fullName: 'Demo Student', idNumber: '2024-0001', organization: 'BSIT' };
const admin = { id: 'USR-ADMIN-001', role: 'admin', fullName: 'System Administrator' };
const ret = (db, id, q, condition = 'Good', o = {}) => processReturn(db, id, { quantity: String(q), condition, returnDate: TODAY, remarks: '', ...o }, admin, TODAY);

function released(db, qty = 10, itemId = 'ITM-001') {
  const r = rq.submitRequest(db, student, { itemId, quantity: String(qty), purpose: 'x' + Math.random(), dateNeeded: TODAY, expectedReturnDate: TODAY }, TODAY);
  assert.ok(r.ok, JSON.stringify(r)); rq.approveRequest(db, r.request.id, '', admin);
  return rq.releaseRequest(db, r.request.id, admin).borrow;
}
const it = (db, id = 'ITM-001') => db.items.find((i) => i.id === id);
const state = (db) => { const i = it(db); return { total: i.totalQuantity, avail: computeAvailable(i), borrowed: i.borrowedQuantity, damaged: i.damagedQuantity, lost: i.lostQuantity }; };

test('partial good return: 10 released, 6 returned -> 4 outstanding, stock correct', () => {
  const db = buildSeedData(); const b = released(db);
  assert.ok(ret(db, b.id, 6).ok);
  assert.equal(outstanding(b), 4); assert.equal(b.quantityReturned, 6);
  assert.deepEqual(state(db), { total: 60, avail: 56, borrowed: 4, damaged: 0, lost: 0 });
  assert.equal(db.requests[0].status, 'Partially Returned');
  assert.equal(db.returns[0].returnStatus, 'Partial'); assert.equal(db.transactions.at(-1).type, 'Partial Return');
  assert.ok(ret(db, b.id, 4).ok);
  assert.deepEqual(state(db), { total: 60, avail: 60, borrowed: 0, damaged: 0, lost: 0 });
  assert.equal(db.requests[0].status, 'Returned'); assert.equal(db.transactions.at(-1).type, 'Item Returned');
});
test('excess, zero, negative, decimal, repeat-after-complete returns are rejected without changes', () => {
  const db = buildSeedData(); const b = released(db, 5);
  for (const q of ['6', '0', '-1', '1.5', 'x', '']) { assert.ok(ret(db, b.id, q).errors.quantity, q); }
  assert.deepEqual(state(db), { total: 60, avail: 55, borrowed: 5, damaged: 0, lost: 0 });
  assert.ok(ret(db, b.id, 5).ok);
  assert.equal(ret(db, b.id, 5).ok, false); assert.equal(db.returns.length, 1);
  assert.deepEqual(state(db), { total: 60, avail: 60, borrowed: 0, damaged: 0, lost: 0 });
});
test('damaged return: leaves borrowed, enters damaged, NOT available; creates damage report', () => {
  const db = buildSeedData(); const b = released(db);
  assert.ok(ret(db, b.id, 3, 'Damaged').errors.remarks);
  assert.ok(ret(db, b.id, 3, 'Damaged', { remarks: 'Broken legs' }).ok);
  assert.deepEqual(state(db), { total: 60, avail: 50, borrowed: 7, damaged: 3, lost: 0 });
  assert.equal(db.damageReports.length, 1); assert.equal(db.damageReports[0].quantity, 3); assert.equal(db.damageReports[0].status, 'Reported');
  assert.equal(db.transactions.at(-1).type, 'Damage Report');
});
test('lost return: never increases available; recorded', () => {
  const db = buildSeedData(); const b = released(db);
  assert.ok(ret(db, b.id, 2, 'Lost').errors.remarks);
  assert.ok(ret(db, b.id, 2, 'Lost', { remarks: 'Misplaced at event' }).ok);
  assert.deepEqual(state(db), { total: 60, avail: 50, borrowed: 8, damaged: 0, lost: 2 });
  assert.equal(db.transactions.at(-1).type, 'Item Lost');
});
test('mixed outcome closes the borrow: good + damaged + lost', () => {
  const db = buildSeedData(); const b = released(db);
  ret(db, b.id, 5); ret(db, b.id, 3, 'Damaged', { remarks: 'cracked' }); ret(db, b.id, 2, 'Lost', { remarks: 'gone' });
  assert.equal(outstanding(b), 0); assert.equal(db.requests[0].status, 'Returned');
  assert.deepEqual(state(db), { total: 60, avail: 55, borrowed: 0, damaged: 3, lost: 2 });
});
test('date validation and admin-only', () => {
  const db = buildSeedData(); const b = released(db);
  assert.ok(ret(db, b.id, 1, 'Good', { returnDate: '' }).errors.returnDate);
  assert.ok(ret(db, b.id, 1, 'Good', { returnDate: '2999-01-01' }).errors.returnDate);
  assert.ok(ret(db, b.id, 1, 'Good', { returnDate: '2000-01-01' }).errors.returnDate);
  assert.ok(ret(db, b.id, 1, 'Weird').errors.condition);
  assert.equal(processReturn(db, b.id, { quantity: '1', condition: 'Good', returnDate: TODAY }, student, TODAY).ok, false);
  assert.equal(ret(db, 'nope', 1).ok, false);
});
test('repair restores to available exactly once (no double count); disposal reduces total', () => {
  const db = buildSeedData(); const b = released(db);
  ret(db, b.id, 4, 'Damaged', { remarks: 'tears' }); ret(db, b.id, 6);
  const rep = db.damageReports[0];
  assert.ok(updateDamageReport(db, rep.id, { status: 'Under Repair', remarks: '' }, admin).ok);
  assert.deepEqual(state(db), { total: 60, avail: 56, borrowed: 0, damaged: 4, lost: 0 }); // still excluded
  assert.match(updateDamageReport(db, rep.id, { status: 'Repaired', remarks: '' }, admin).error, /Record the repair/);
  assert.ok(updateDamageReport(db, rep.id, { status: 'Repaired', remarks: 'Fixed by workshop' }, admin).ok);
  assert.deepEqual(state(db), { total: 60, avail: 60, borrowed: 0, damaged: 0, lost: 0 });
  assert.match(updateDamageReport(db, rep.id, { status: 'Repaired', remarks: 'again' }, admin).error, /already closed/);
  assert.deepEqual(state(db), { total: 60, avail: 60, borrowed: 0, damaged: 0, lost: 0 });
  const b2 = released(db, 5); ret(db, b2.id, 5, 'Damaged', { remarks: 'water damage' });
  assert.ok(updateDamageReport(db, db.damageReports[1].id, { status: 'Disposed', remarks: 'Beyond repair' }, admin).ok);
  assert.deepEqual(state(db), { total: 55, avail: 55, borrowed: 0, damaged: 0, lost: 0 });
  assert.equal(updateDamageReport(db, db.damageReports[1].id, { status: 'Repaired', remarks: 'x' }, student).ok, false);
});
test('history survives: transactions keep names, unique ids, every step logged', () => {
  const db = buildSeedData(); const b = released(db);
  ret(db, b.id, 2, 'Damaged', { remarks: 'x' }); ret(db, b.id, 8);
  assert.equal(new Set(db.transactions.map((t) => t.id)).size, db.transactions.length);
  const types = db.transactions.map((t) => t.type);
  for (const x of ['Item Request', 'Request Approved', 'Item Released', 'Damage Report', 'Item Returned']) assert.ok(types.includes(x), x);
});

test('RANDOMIZED: invariants hold across 400 random operation sequences', () => {
  let seed = 12345; const rnd = (n) => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; };
  const db = buildSeedData();
  for (let step = 0; step < 400; step++) {
    const op = rnd(6); const itemId = db.items[rnd(db.items.length)].id;
    if (op === 0) { const r = rq.submitRequest(db, student, { itemId, quantity: String(1 + rnd(8)), purpose: `p${step}`, dateNeeded: TODAY, expectedReturnDate: TODAY }, TODAY); if (r.ok && rnd(2)) rq.approveRequest(db, r.request.id, '', admin); }
    else if (op === 1) { const a = db.requests.filter((r) => r.status === 'Approved'); if (a.length) rq.releaseRequest(db, a[rnd(a.length)].id, admin); }
    else if (op === 2) { const a = db.borrows.filter((b) => outstanding(b) > 0); if (a.length) { const b = a[rnd(a.length)]; const c = ['Good', 'Good', 'Damaged', 'Lost'][rnd(4)]; ret(db, b.id, 1 + rnd(outstanding(b) + 1), c, { remarks: 'r' }); } }
    else if (op === 3) { const a = db.damageReports.filter((r) => r.status === 'Reported' || r.status === 'Under Repair'); if (a.length) updateDamageReport(db, a[rnd(a.length)].id, { status: ['Under Repair', 'Repaired', 'Disposed'][rnd(3)], remarks: 'd' }, admin); }
    else if (op === 4) { const a = db.requests.filter((r) => r.status === 'Pending'); if (a.length) rq.cancelRequest(db, a[rnd(a.length)].id, student); }
    else { const a = db.requests.filter((r) => r.status === 'Approved' || r.status === 'Pending'); if (a.length) rq.rejectRequest(db, a[rnd(a.length)].id, 'no', admin); }
    for (const i of db.items) {
      const outSum = db.borrows.filter((b) => b.itemId === i.id).reduce((s, b) => s + outstanding(b), 0);
      const dmg = db.damageReports.filter((r) => r.itemId === i.id && (r.status === 'Reported' || r.status === 'Under Repair')).reduce((s, r) => s + r.quantity, 0);
      const lost = db.borrows.filter((b) => b.itemId === i.id).reduce((s, b) => s + (b.quantityLost || 0), 0);
      assert.equal(i.borrowedQuantity, outSum, `borrowed ${i.id} @${step}`);
      assert.equal(i.damagedQuantity, dmg, `damaged ${i.id} @${step}`);
      assert.equal(i.lostQuantity, lost, `lost ${i.id} @${step}`);
      assert.ok(computeAvailable(i) >= 0 && i.totalQuantity - i.borrowedQuantity - i.damagedQuantity - i.lostQuantity >= 0, `available>=0 ${i.id} @${step}`);
    }
  }
  assert.ok(db.borrows.length > 10 && db.returns.length > 10, 'sequence actually exercised the workflow');
});
