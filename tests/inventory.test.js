import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedData } from '../src/services/seedData.js';
import * as inv from '../src/services/inventoryService.js';
import { computeAvailable, isLowStock } from '../src/utils/calculations.js';

const form = (o = {}) => ({ name: 'Laptop', categoryId: 'CAT-001', description: 'd', totalQuantity: '5', unit: 'unit', condition: 'Good', minStock: '1', remarks: '', ...o });

test('add item: valid, logged, stock consistent', () => {
  const db = buildSeedData(); const n = db.transactions.length;
  const r = inv.addItem(db, form(), 'admin');
  assert.ok(r.ok); assert.equal(computeAvailable(r.item), 5);
  assert.equal(db.transactions.length, n + 1); assert.equal(db.transactions.at(-1).type, 'Inventory Created');
});
test('add item: negative, decimal, empty name, bad category, duplicate name rejected', () => {
  const db = buildSeedData();
  assert.ok(inv.addItem(db, form({ totalQuantity: '-1' }), 'a').errors.totalQuantity);
  assert.ok(inv.addItem(db, form({ totalQuantity: '2.5' }), 'a').errors.totalQuantity);
  assert.ok(inv.addItem(db, form({ name: ' ' }), 'a').errors.name);
  assert.ok(inv.addItem(db, form({ categoryId: 'nope' }), 'a').errors.categoryId);
  assert.ok(inv.addItem(db, form({ name: 'monobloc chair' }), 'a').errors.name);
  assert.equal(db.items.length, 9);
});
test('zero quantity allowed and counts as low stock', () => {
  const db = buildSeedData(); const r = inv.addItem(db, form({ totalQuantity: '0' }), 'a');
  assert.ok(r.ok); assert.ok(isLowStock(r.item));
});
test('adjust stock: add, remove, cannot go below committed units, reason required, zero rejected', () => {
  const db = buildSeedData(); const it = db.items[0]; // 60 chairs
  assert.ok(inv.adjustStock(db, it.id, 10, 'donation', 'a').ok); assert.equal(it.totalQuantity, 70);
  it.borrowedQuantity = 20; it.damagedQuantity = 5;
  assert.equal(inv.adjustStock(db, it.id, -50, 'x', 'a').ok, false);   // 20 < 25
  assert.ok(inv.adjustStock(db, it.id, -45, 'x', 'a').ok);              // exactly 25
  assert.equal(computeAvailable(it), 0);
  assert.equal(inv.adjustStock(db, it.id, -1, 'x', 'a').ok, false);
  assert.equal(inv.adjustStock(db, it.id, 3, '', 'a').ok, false);
  assert.equal(inv.adjustStock(db, it.id, 0, 'x', 'a').ok, false);
});
test('edit item: cannot lower total below committed; allowed edit is logged', () => {
  const db = buildSeedData(); const it = db.items[1]; it.borrowedQuantity = 8;
  assert.ok(inv.updateItem(db, it.id, form({ name: it.name, totalQuantity: '5' }), 'a').errors.totalQuantity);
  const n = db.transactions.length;
  assert.ok(inv.updateItem(db, it.id, form({ name: it.name, totalQuantity: '10' }), 'a').ok);
  assert.equal(db.transactions.length, n + 1);
});
test('delete blocked with active borrow or history; allowed for clean item; history keeps item name', () => {
  const db = buildSeedData(); const it = db.items[2];
  db.borrows.push({ id: 'B1', itemId: it.id, quantityReleased: 2, quantityReturned: 0 });
  assert.match(inv.deleteItem(db, it.id, 'a').error, /active borrowing/);
  db.borrows[0].quantityReturned = 2;
  assert.match(inv.deleteItem(db, it.id, 'a').error, /Archive it instead/);
  const clean = db.items[3];
  assert.ok(inv.deleteItem(db, clean.id, 'a').ok);
  assert.equal(db.items.some((i) => i.id === clean.id), false);
  assert.ok(db.transactions.some((t) => t.type === 'Item Deleted' && t.itemName === clean.name));
});
test('archive blocked while units outstanding; restore blocks name clash', () => {
  const db = buildSeedData(); const it = db.items[0];
  db.borrows.push({ id: 'B1', itemId: it.id, quantityReleased: 3, quantityReturned: 1 });
  assert.equal(inv.setArchived(db, it.id, true, 'a').ok, false);
  db.borrows[0].quantityReturned = 3;
  assert.ok(inv.setArchived(db, it.id, true, 'a').ok);
  inv.addItem(db, form({ name: it.name }), 'a');
  assert.equal(inv.setArchived(db, it.id, false, 'a').ok, false);
});
test('categories: duplicate blocked, delete blocked when in use, unused deletable', () => {
  const db = buildSeedData();
  assert.equal(inv.addCategory(db, { name: 'electronics' }, 'a').ok, false);
  assert.ok(inv.addCategory(db, { name: 'Sports' }, 'a').ok);
  assert.match(inv.deleteCategory(db, 'CAT-004', 'a').error, /Reassign/);
  const sports = db.categories.at(-1);
  assert.ok(inv.updateCategory(db, sports.id, { name: 'Sports Gear' }, 'a').ok);
  assert.ok(inv.deleteCategory(db, sports.id, 'a').ok);
});
test('transaction IDs are unique across many actions', () => {
  const db = buildSeedData();
  for (let i = 0; i < 200; i++) inv.adjustStock(db, db.items[0].id, 1, 'r', 'a');
  assert.equal(new Set(db.transactions.map((t) => t.id)).size, db.transactions.length);
});
