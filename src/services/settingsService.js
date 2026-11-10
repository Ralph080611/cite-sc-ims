import { isNonNegativeInt } from '../utils/validation.js';
import { makeTransaction } from './transactionService.js';

export function updateSettings(db, f, admin) {
  if (admin.role !== 'admin') return { ok: false, error: 'Administrator access required.' };
  const errors = {};
  if (!f.appName?.trim()) errors.appName = 'Application name is required.';
  if (!f.organizationName?.trim()) errors.organizationName = 'Organization name is required.';
  if (!isNonNegativeInt(f.defaultLowStock)) errors.defaultLowStock = 'Must be a whole number, 0 or more.';
  if (Object.keys(errors).length) return { ok: false, errors };
  db.settings = { appName: f.appName.trim(), organizationName: f.organizationName.trim(), description: f.description?.trim() || '', defaultLowStock: Number(f.defaultLowStock) };
  db.transactions.push(makeTransaction({ type: 'Settings Updated', performedBy: admin.fullName, description: 'System settings updated.' }));
  return { ok: true };
}

// Written AFTER a reset so the fresh db records who reset it.
export function logReset(db, admin) {
  db.transactions.push(makeTransaction({ type: 'Demo Data Reset', performedBy: admin.fullName, description: 'All demonstration records were reset to the initial seed data.' }));
  return { ok: true };
}
