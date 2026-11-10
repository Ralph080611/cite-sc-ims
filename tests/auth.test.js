import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedData } from '../src/services/seedData.js';
import { verifyCredentials, buildRegistration } from '../src/services/authService.js';
import { computeAvailable } from '../src/utils/calculations.js';

const good = { fullName: 'Ana Cruz', idNumber: '2025-1001', organization: 'BSIT', email: 'ana@x.com', password: 'Passw0rdX', confirmPassword: 'Passw0rdX' };

test('seed admin and demo student log in with documented credentials', async () => {
  const db = buildSeedData();
  assert.ok((await verifyCredentials(db, 'admin', 'Admin@12345', 'admin')).ok);
  assert.ok((await verifyCredentials(db, '2024-0001', 'Student@123', 'student')).ok);
});
test('invalid login rejected; roles are not interchangeable', async () => {
  const db = buildSeedData();
  assert.equal((await verifyCredentials(db, 'admin', 'wrong', 'admin')).ok, false);
  assert.equal((await verifyCredentials(db, 'admin', 'Admin@12345', 'student')).ok, false);
  assert.equal((await verifyCredentials(db, '2024-0001', 'Student@123', 'admin')).ok, false);
});
test('registration creates student role only, even if role is injected', async () => {
  const db = buildSeedData();
  const r = await buildRegistration(db, { ...good, role: 'admin' });
  assert.ok(r.ok); assert.equal(r.user.role, 'student');
  assert.notEqual(r.user.passwordHash, good.password);
});
test('duplicate ID and email blocked (case-insensitive)', async () => {
  const db = buildSeedData();
  const r = await buildRegistration(db, { ...good, idNumber: 'ADMIN', email: 'DEMO.STUDENT@cite-sc.local' });
  assert.equal(r.ok, false); assert.ok(r.errors.idNumber); assert.ok(r.errors.email);
});
test('validation: mismatch, weak password, bad email, empty fields', async () => {
  const db = buildSeedData();
  const r = await buildRegistration(db, { ...good, confirmPassword: 'x', password: 'weak', email: 'nope' });
  assert.ok(r.errors.password && r.errors.confirmPassword && r.errors.email);
  const e = await buildRegistration(db, {});
  assert.ok(e.errors.fullName && e.errors.idNumber && e.errors.organization);
});
test('deactivated account cannot sign in', async () => {
  const db = buildSeedData(); db.users[1].active = false;
  assert.equal((await verifyCredentials(db, '2024-0001', 'Student@123', 'student')).ok, false);
});
test('seed stock is consistent', () => {
  for (const i of buildSeedData().items) assert.equal(computeAvailable(i), i.totalQuantity);
});
