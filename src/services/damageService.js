// Damage report lifecycle: Reported -> Under Repair -> Repaired | Disposed.
// Damaged units stay out of available stock until formally Repaired (restored)
// or Disposed (written off the total). Repaired/Disposed are final.
import { makeTransaction } from './transactionService.js';

export const DAMAGE_STATUSES = ['Reported', 'Under Repair', 'Repaired', 'Disposed'];
export const isOpenDamage = (r) => r.status === 'Reported' || r.status === 'Under Repair';

export function updateDamageReport(db, id, { status, remarks }, admin) {
  if (admin.role !== 'admin') return { ok: false, error: 'Administrator access required.' };
  const r = db.damageReports.find((x) => x.id === id);
  if (!r) return { ok: false, error: 'Damage report not found.' };
  if (!isOpenDamage(r)) return { ok: false, error: `This report is already closed (${r.status}).` };
  if (!DAMAGE_STATUSES.includes(status)) return { ok: false, error: 'Select a valid status.' };
  const item = db.items.find((i) => i.id === r.itemId);
  const note = remarks?.trim() || '';
  const t = new Date().toISOString();

  if (status === 'Repaired' || status === 'Disposed') {
    if (!note) return { ok: false, error: `Record the ${status === 'Repaired' ? 'repair' : 'disposal'} decision in remarks.` };
    if (!item) return { ok: false, error: 'Inventory item no longer exists.' };
    if (item.damagedQuantity < r.quantity) return { ok: false, error: 'Damaged stock count is inconsistent; cannot apply.' };
    item.damagedQuantity -= r.quantity;            // leaves the damaged pool
    if (status === 'Disposed') item.totalQuantity -= r.quantity; // written off; Repaired simply becomes available again
    item.lastUpdated = t;
  } else if (status === r.status && !note) {
    return { ok: false, error: 'Add remarks or choose a new status.' };
  }
  const prev = r.status;
  r.status = status; if (note) r.remarks = r.remarks ? `${r.remarks}\n${note}` : note; r.updatedAt = t;
  const type = status === 'Repaired' ? 'Item Repaired' : status === 'Disposed' ? 'Item Disposed' : 'Damage Update';
  db.transactions.push(makeTransaction({ type, referenceId: r.id, itemName: r.itemName, quantity: r.quantity, performedBy: admin.fullName,
    description: `Damage report ${r.id}: ${prev === status ? `remark added (${status})` : `${prev} → ${status}`}.${note ? ` ${note}` : ''}${status === 'Repaired' ? ' Units restored to available stock.' : ''}` }));
  return { ok: true };
}
