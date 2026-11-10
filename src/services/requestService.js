// Request lifecycle: Pending -> Approved -> Released (or Rejected / Cancelled).
// STOCK RULES: only releaseRequest touches inventory, and only once per request.
import { generateId } from '../utils/idGenerator.js';
import { isPositiveInt } from '../utils/validation.js';
import { computeAvailable } from '../utils/calculations.js';
import { todayStr } from '../utils/formatters.js';
import { makeTransaction } from './transactionService.js';

const stamp = () => new Date().toISOString();

export function validateRequestForm(db, f, today = todayStr()) {
  const e = {};
  const item = db.items.find((i) => i.id === f.itemId);
  if (!f.itemId) e.itemId = 'Select an item.';
  else if (!item || item.archived) e.itemId = 'This item is not available for borrowing.';
  if (!isPositiveInt(f.quantity)) e.quantity = 'Quantity must be a positive whole number.';
  else if (item && Number(f.quantity) > computeAvailable(item)) e.quantity = `Only ${computeAvailable(item)} ${item.unit} available right now.`;
  if (!f.purpose?.trim()) e.purpose = 'Purpose is required.';
  if (!f.dateNeeded) e.dateNeeded = 'Date needed is required.';
  else if (f.dateNeeded < today) e.dateNeeded = 'Date needed cannot be in the past.';
  if (!f.expectedReturnDate) e.expectedReturnDate = 'Expected return date is required.';
  else if (f.expectedReturnDate < today) e.expectedReturnDate = 'Return date cannot precede the request date.';
  else if (f.dateNeeded && f.expectedReturnDate < f.dateNeeded) e.expectedReturnDate = 'Return date cannot be before the date needed.';
  return e;
}

export function submitRequest(db, user, f, today = todayStr()) {
  if (user.role !== 'student') return { ok: false, error: 'Only student/organization accounts can submit requests.' };
  const errors = validateRequestForm(db, f, today);
  if (Object.keys(errors).length) return { ok: false, errors };
  const dup = db.requests.some((r) => r.userId === user.id && r.status === 'Pending' && r.itemId === f.itemId && r.quantity === Number(f.quantity)
    && r.purpose === f.purpose.trim() && r.dateNeeded === f.dateNeeded && r.expectedReturnDate === f.expectedReturnDate);
  if (dup) return { ok: false, error: 'An identical pending request already exists.' };
  const item = db.items.find((i) => i.id === f.itemId);
  const t = stamp();
  const req = {
    id: generateId('REQ'), userId: user.id, requesterName: user.fullName, idNumber: user.idNumber, organization: user.organization,
    itemId: item.id, itemName: item.name, unit: item.unit, quantity: Number(f.quantity), purpose: f.purpose.trim(),
    dateRequested: today, dateNeeded: f.dateNeeded, expectedReturnDate: f.expectedReturnDate, remarks: f.remarks?.trim() || '',
    status: 'Pending', adminRemarks: '', createdAt: t, updatedAt: t, borrowId: null,
  };
  db.requests.push(req);
  db.transactions.push(makeTransaction({ type: 'Item Request', referenceId: req.id, itemName: item.name, quantity: req.quantity, performedBy: user.fullName, description: `Requested ${req.quantity} ${item.unit} of ${item.name}.` }));
  return { ok: true, request: req };
}

export function cancelRequest(db, id, user) {
  const r = db.requests.find((x) => x.id === id);
  if (!r) return { ok: false, error: 'Request not found.' };
  if (r.userId !== user.id) return { ok: false, error: 'You can only cancel your own requests.' };
  if (r.status !== 'Pending') return { ok: false, error: `Only pending requests can be cancelled (this one is ${r.status}).` };
  r.status = 'Cancelled'; r.updatedAt = stamp();
  db.transactions.push(makeTransaction({ type: 'Request Cancelled', referenceId: r.id, itemName: r.itemName, quantity: r.quantity, performedBy: user.fullName, description: 'Pending request cancelled by requester.' }));
  return { ok: true };
}

const adminGuard = (admin) => (admin.role === 'admin' ? null : { ok: false, error: 'Administrator access required.' });

export function approveRequest(db, id, remarks, admin) {
  const g = adminGuard(admin); if (g) return g;
  const r = db.requests.find((x) => x.id === id);
  if (!r) return { ok: false, error: 'Request not found.' };
  if (r.status !== 'Pending') return { ok: false, error: `Request already processed (${r.status}).` };
  r.status = 'Approved'; r.adminRemarks = remarks?.trim() || ''; r.approvedBy = admin.fullName; r.approvedAt = stamp(); r.updatedAt = r.approvedAt;
  db.transactions.push(makeTransaction({ type: 'Request Approved', referenceId: r.id, itemName: r.itemName, quantity: r.quantity, performedBy: admin.fullName, description: `Approved request from ${r.requesterName}. Stock is not deducted until release.` }));
  return { ok: true };
}

export function rejectRequest(db, id, reason, admin) {
  const g = adminGuard(admin); if (g) return g;
  const r = db.requests.find((x) => x.id === id);
  if (!r) return { ok: false, error: 'Request not found.' };
  if (!reason?.trim()) return { ok: false, error: 'A rejection reason is required.' };
  if (r.status !== 'Pending') return { ok: false, error: `Request already processed (${r.status}).` };
  r.status = 'Rejected'; r.adminRemarks = reason.trim(); r.rejectedBy = admin.fullName; r.updatedAt = stamp();
  db.transactions.push(makeTransaction({ type: 'Request Rejected', referenceId: r.id, itemName: r.itemName, quantity: r.quantity, performedBy: admin.fullName, description: `Rejected request from ${r.requesterName}. Reason: ${r.adminRemarks}` }));
  return { ok: true };
}

// Deducts stock exactly once. Re-validates everything at release time.
export function releaseRequest(db, id, admin) {
  const g = adminGuard(admin); if (g) return g;
  const r = db.requests.find((x) => x.id === id);
  if (!r) return { ok: false, error: 'Request not found.' };
  if (r.status === 'Released' || r.borrowId || db.borrows.some((b) => b.requestId === r.id)) return { ok: false, error: 'This request has already been released.' };
  if (r.status !== 'Approved') return { ok: false, error: `Only approved requests can be released (this one is ${r.status}).` };
  const item = db.items.find((i) => i.id === r.itemId);
  if (!item || item.archived) return { ok: false, error: 'The item is no longer available.' };
  const avail = computeAvailable(item);
  if (r.quantity > avail) return { ok: false, error: `Insufficient stock: ${avail} ${item.unit} available, ${r.quantity} requested.` };
  const t = stamp();
  item.borrowedQuantity += r.quantity;
  item.lastUpdated = t;
  const borrow = {
    id: generateId('BRW'), requestId: r.id, userId: r.userId, borrowerName: r.requesterName, idNumber: r.idNumber, organization: r.organization,
    itemId: item.id, itemName: item.name, unit: item.unit, quantityReleased: r.quantity, quantityReturned: 0, quantityDamaged: 0, quantityLost: 0,
    releaseDate: t, releaseDay: todayStr(), expectedReturnDate: r.expectedReturnDate, releasedBy: admin.fullName,
  };
  db.borrows.push(borrow);
  r.status = 'Released'; r.borrowId = borrow.id; r.releasedAt = t; r.releasedBy = admin.fullName; r.updatedAt = t;
  db.transactions.push(makeTransaction({ type: 'Item Released', referenceId: borrow.id, itemName: item.name, quantity: r.quantity, performedBy: admin.fullName, description: `Released ${r.quantity} ${item.unit} to ${r.requesterName} (request ${r.id}).` }));
  return { ok: true, borrow };
}
