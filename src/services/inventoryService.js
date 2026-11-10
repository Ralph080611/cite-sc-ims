// Pure business logic over a (draft) db. Each function returns { ok, error? } and never saves;
// DataContext.update() persists only when ok !== false.
import { generateId } from '../utils/idGenerator.js';
import { isNonNegativeInt } from '../utils/validation.js';
import { computeAvailable, outstanding } from '../utils/calculations.js';
import { makeTransaction } from './transactionService.js';

const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const nextItemId = (db) => {
  const max = db.items.reduce((m, i) => Math.max(m, Number(i.id.replace('ITM-', '')) || 0), 0);
  return `ITM-${String(max + 1).padStart(3, '0')}`;
};
const committed = (i) => i.borrowedQuantity + i.damagedQuantity + (i.lostQuantity || 0);
export { outstanding };

export function validateItemForm(db, f, editingId = null) {
  const e = {};
  if (!f.name?.trim()) e.name = 'Item name is required.';
  else if (db.items.some((i) => i.id !== editingId && !i.archived && same(i.name, f.name)))
    e.name = 'An active item with this name already exists. Edit it or adjust its stock instead.';
  if (!f.categoryId || !db.categories.some((c) => c.id === f.categoryId)) e.categoryId = 'Select a valid category.';
  if (!isNonNegativeInt(f.totalQuantity)) e.totalQuantity = 'Quantity must be a whole number, 0 or more.';
  if (!f.unit?.trim()) e.unit = 'Unit of measurement is required.';
  if (!isNonNegativeInt(f.minStock)) e.minStock = 'Minimum stock must be a whole number, 0 or more.';
  if (!f.condition) e.condition = 'Select a condition.';
  if (editingId && !e.totalQuantity) {
    const item = db.items.find((i) => i.id === editingId);
    if (item && Number(f.totalQuantity) < committed(item))
      e.totalQuantity = `Total cannot be below ${committed(item)} (borrowed + damaged + lost units).`;
  }
  return e;
}

export function addItem(db, f, actor) {
  const errors = validateItemForm(db, f);
  if (Object.keys(errors).length) return { ok: false, errors };
  const t = new Date().toISOString();
  const item = {
    id: nextItemId(db), name: f.name.trim(), categoryId: f.categoryId, description: f.description?.trim() || '',
    totalQuantity: Number(f.totalQuantity), borrowedQuantity: 0, damagedQuantity: 0, lostQuantity: 0,
    unit: f.unit.trim(), condition: f.condition, minStock: Number(f.minStock), remarks: f.remarks?.trim() || '',
    archived: false, dateAdded: t, lastUpdated: t,
  };
  db.items.push(item);
  db.transactions.push(makeTransaction({ type: 'Inventory Created', referenceId: item.id, itemName: item.name, quantity: item.totalQuantity, performedBy: actor, description: `Added ${item.totalQuantity} ${item.unit} of ${item.name}.` }));
  return { ok: true, item };
}

export function updateItem(db, id, f, actor) {
  const item = db.items.find((i) => i.id === id);
  if (!item) return { ok: false, error: 'Item not found.' };
  const errors = validateItemForm(db, f, id);
  if (Object.keys(errors).length) return { ok: false, errors };
  const oldTotal = item.totalQuantity;
  Object.assign(item, {
    name: f.name.trim(), categoryId: f.categoryId, description: f.description?.trim() || '', totalQuantity: Number(f.totalQuantity),
    unit: f.unit.trim(), condition: f.condition, minStock: Number(f.minStock), remarks: f.remarks?.trim() || '', lastUpdated: new Date().toISOString(),
  });
  const qty = item.totalQuantity !== oldTotal ? ` Total quantity ${oldTotal} → ${item.totalQuantity}.` : '';
  db.transactions.push(makeTransaction({ type: 'Inventory Updated', referenceId: item.id, itemName: item.name, quantity: item.totalQuantity, performedBy: actor, description: `Updated item details.${qty}` }));
  return { ok: true, item };
}

// delta may be negative. Total can never drop below units already borrowed/damaged/lost.
export function adjustStock(db, id, delta, reason, actor) {
  const item = db.items.find((i) => i.id === id);
  if (!item) return { ok: false, error: 'Item not found.' };
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: 'Enter a non-zero whole number.' };
  if (!reason?.trim()) return { ok: false, error: 'A reason is required for stock adjustments.' };
  const next = item.totalQuantity + delta;
  if (next < committed(item)) return { ok: false, error: `Cannot go below ${committed(item)} (units currently borrowed, damaged or lost). Available now: ${computeAvailable(item)}.` };
  item.totalQuantity = next;
  item.lastUpdated = new Date().toISOString();
  db.transactions.push(makeTransaction({ type: 'Stock Adjustment', referenceId: item.id, itemName: item.name, quantity: delta, performedBy: actor, description: `${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} ${item.unit}. Reason: ${reason.trim()}` }));
  return { ok: true, item };
}

export function setArchived(db, id, archived, actor) {
  const item = db.items.find((i) => i.id === id);
  if (!item) return { ok: false, error: 'Item not found.' };
  if (archived && db.borrows.some((b) => b.itemId === id && outstanding(b) > 0)) return { ok: false, error: 'Cannot archive an item that still has borrowed units outstanding.' };
  if (!archived && db.items.some((i) => i.id !== id && !i.archived && same(i.name, item.name))) return { ok: false, error: 'An active item with the same name exists; rename it first.' };
  item.archived = archived;
  item.lastUpdated = new Date().toISOString();
  db.transactions.push(makeTransaction({ type: archived ? 'Item Archived' : 'Item Restored', referenceId: item.id, itemName: item.name, performedBy: actor, description: archived ? 'Item archived (hidden from borrowing, history kept).' : 'Item restored to active inventory.' }));
  return { ok: true };
}

// Deletion is only for items with NO borrowing/request history. Otherwise archive instead.
export function deleteItem(db, id, actor) {
  const item = db.items.find((i) => i.id === id);
  if (!item) return { ok: false, error: 'Item not found.' };
  if (db.borrows.some((b) => b.itemId === id && outstanding(b) > 0)) return { ok: false, error: 'This item has active borrowing transactions and cannot be deleted.' };
  if (db.borrows.some((b) => b.itemId === id) || db.requests.some((r) => r.itemId === id) || db.damageReports.some((d) => d.itemId === id))
    return { ok: false, error: 'This item has request/borrowing history. Archive it instead so records stay intact.' };
  db.items = db.items.filter((i) => i.id !== id);
  db.transactions.push(makeTransaction({ type: 'Item Deleted', referenceId: item.id, itemName: item.name, performedBy: actor, description: 'Item permanently deleted (no history attached).' }));
  return { ok: true };
}

// ---- Categories ----
export function validateCategory(db, name, editingId = null) {
  if (!name?.trim()) return 'Category name is required.';
  if (db.categories.some((c) => c.id !== editingId && same(c.name, name))) return 'A category with this name already exists.';
  return null;
}
export function addCategory(db, { name, description }, actor) {
  const error = validateCategory(db, name);
  if (error) return { ok: false, error };
  const max = db.categories.reduce((m, c) => Math.max(m, Number(c.id.replace('CAT-', '')) || 0), 0);
  const cat = { id: `CAT-${String(max + 1).padStart(3, '0')}`, name: name.trim(), description: description?.trim() || '', createdAt: new Date().toISOString() };
  db.categories.push(cat);
  db.transactions.push(makeTransaction({ type: 'Category Created', referenceId: cat.id, performedBy: actor, description: `Category "${cat.name}" created.` }));
  return { ok: true, category: cat };
}
export function updateCategory(db, id, { name, description }, actor) {
  const cat = db.categories.find((c) => c.id === id);
  if (!cat) return { ok: false, error: 'Category not found.' };
  const error = validateCategory(db, name, id);
  if (error) return { ok: false, error };
  const old = cat.name;
  cat.name = name.trim(); cat.description = description?.trim() || '';
  db.transactions.push(makeTransaction({ type: 'Category Updated', referenceId: id, performedBy: actor, description: `Category "${old}" updated${old !== cat.name ? ` → "${cat.name}"` : ''}.` }));
  return { ok: true };
}
export function deleteCategory(db, id, actor) {
  const cat = db.categories.find((c) => c.id === id);
  if (!cat) return { ok: false, error: 'Category not found.' };
  const n = db.items.filter((i) => i.categoryId === id).length;
  if (n > 0) return { ok: false, error: `${n} item(s) use this category. Reassign them first.` };
  db.categories = db.categories.filter((c) => c.id !== id);
  db.transactions.push(makeTransaction({ type: 'Category Deleted', referenceId: id, performedBy: actor, description: `Category "${cat.name}" deleted.` }));
  return { ok: true };
}
export { generateId };
