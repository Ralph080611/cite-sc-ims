// Returns: Good / Damaged / Lost, partial returns supported.
// Invariants kept for every item (checked by tests):
//   item.borrowedQuantity = sum of outstanding units across its borrows
//   available = total - borrowed - damaged - lost  (never negative)
import { generateId } from '../utils/idGenerator.js';
import { isPositiveInt } from '../utils/validation.js';
import { outstanding } from '../utils/calculations.js';
import { todayStr } from '../utils/formatters.js';
import { makeTransaction } from './transactionService.js';

export const RETURN_CONDITIONS = { Good: 'Good / Usable', Damaged: 'Damaged', Lost: 'Lost / Missing' };

export function validateReturn(db, borrowId, f, today = todayStr()) {
  const e = {};
  const b = db.borrows.find((x) => x.id === borrowId);
  if (!b) return { form: 'Borrow transaction not found.' };
  const out = outstanding(b);
  if (out <= 0) e.form = 'This borrow transaction has no outstanding units.';
  if (!isPositiveInt(f.quantity)) e.quantity = 'Quantity must be a positive whole number.';
  else if (Number(f.quantity) > out) e.quantity = `Cannot exceed the outstanding quantity (${out}).`;
  if (!RETURN_CONDITIONS[f.condition]) e.condition = 'Select the item condition.';
  if (!f.returnDate) e.returnDate = 'Return date is required.';
  else if (f.returnDate > today) e.returnDate = 'Return date cannot be in the future.';
  else if (f.returnDate < (b.releaseDay || b.releaseDate.slice(0, 10))) e.returnDate = 'Return date cannot precede the release date.';
  if ((f.condition === 'Damaged' || f.condition === 'Lost') && !f.remarks?.trim()) e.remarks = f.condition === 'Damaged' ? 'Describe the damage.' : 'Explain how the items were lost.';
  return e;
}

export function processReturn(db, borrowId, f, admin, today = todayStr()) {
  if (admin.role !== 'admin') return { ok: false, error: 'Administrator access required.' };
  const errors = validateReturn(db, borrowId, f, today);
  if (Object.keys(errors).length) return { ok: false, errors, error: errors.form };
  const b = db.borrows.find((x) => x.id === borrowId);
  const item = db.items.find((i) => i.id === b.itemId);
  if (!item) return { ok: false, error: 'Inventory item no longer exists.' };
  const q = Number(f.quantity);
  const t = new Date().toISOString();

  item.borrowedQuantity -= q;
  item.lastUpdated = t;
  if (f.condition === 'Good') b.quantityReturned += q;
  else if (f.condition === 'Damaged') { b.quantityDamaged = (b.quantityDamaged || 0) + q; item.damagedQuantity += q; }
  else { b.quantityLost = (b.quantityLost || 0) + q; item.lostQuantity = (item.lostQuantity || 0) + q; }

  const left = outstanding(b);
  const ret = {
    id: generateId('RET'), borrowId: b.id, requestId: b.requestId, userId: b.userId, borrowerName: b.borrowerName, itemId: item.id, itemName: item.name, unit: item.unit,
    quantity: q, condition: f.condition, returnDate: f.returnDate, remarks: f.remarks?.trim() || '', returnStatus: left > 0 ? 'Partial' : 'Completed', processedBy: admin.fullName, createdAt: t,
  };
  db.returns.push(ret);

  const req = db.requests.find((r) => r.id === b.requestId);
  if (req) { req.status = left > 0 ? 'Partially Returned' : 'Returned'; req.updatedAt = t; }

  const who = `${b.borrowerName} (${b.id})`;
  const tail = left > 0 ? ` ${left} still outstanding.` : ' Borrow transaction completed.';
  if (f.condition === 'Good') {
    db.transactions.push(makeTransaction({ type: left > 0 ? 'Partial Return' : 'Item Returned', referenceId: ret.id, itemName: item.name, quantity: q, performedBy: admin.fullName, description: `${q} ${item.unit} returned in good condition by ${who}.${tail}` }));
  } else if (f.condition === 'Damaged') {
    const rep = {
      id: generateId('DMG'), itemId: item.id, itemName: item.name, unit: item.unit, borrowId: b.id, returnId: ret.id, borrowerName: b.borrowerName, quantity: q,
      dateReported: f.returnDate, description: ret.remarks, remarks: '', status: 'Reported', createdAt: t, updatedAt: t,
    };
    db.damageReports.push(rep);
    db.transactions.push(makeTransaction({ type: 'Damage Report', referenceId: rep.id, itemName: item.name, quantity: q, performedBy: admin.fullName, description: `${q} ${item.unit} returned damaged by ${who}. Excluded from available stock.${tail}` }));
  } else {
    db.transactions.push(makeTransaction({ type: 'Item Lost', referenceId: ret.id, itemName: item.name, quantity: q, performedBy: admin.fullName, description: `${q} ${item.unit} reported lost/missing by ${who}. Excluded from available stock.${tail}` }));
  }
  return { ok: true, record: ret };
}
