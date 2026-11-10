import { makeTransaction } from './transactionService.js';
import { isEmail } from '../utils/validation.js';
import { outstanding } from '../utils/calculations.js';

export function setUserActive(db, userId, active, admin) {
  if (admin.role !== 'admin') return { ok: false, error: 'Administrator access required.' };
  const u = db.users.find((x) => x.id === userId);
  if (!u) return { ok: false, error: 'User not found.' };
  if (u.role === 'admin') return { ok: false, error: 'Administrator accounts cannot be changed here.' };
  if (u.id === admin.id) return { ok: false, error: 'You cannot change your own account.' };
  if (u.active === active) return { ok: false, error: `Account is already ${active ? 'active' : 'deactivated'}.` };
  u.active = active;
  const out = db.borrows.filter((b) => b.userId === u.id).reduce((s, b) => s + outstanding(b), 0);
  db.transactions.push(makeTransaction({ type: active ? 'User Activated' : 'User Deactivated', referenceId: u.id, performedBy: admin.fullName,
    description: `Account ${u.idNumber} (${u.fullName}) ${active ? 'activated' : 'deactivated'}.${!active && out ? ` They still hold ${out} unreturned unit(s).` : ''}` }));
  return { ok: true, outstanding: out };
}

// Role, ID number and password hash are never editable from the profile form.
export function updateProfile(db, userId, f) {
  const u = db.users.find((x) => x.id === userId);
  if (!u) return { ok: false, error: 'User not found.' };
  const errors = {};
  if (!f.fullName?.trim()) errors.fullName = 'Full name is required.';
  if (!f.organization?.trim()) errors.organization = 'Organization or department is required.';
  if (!f.email?.trim()) errors.email = 'Email address is required.';
  else if (!isEmail(f.email)) errors.email = 'Enter a valid email address.';
  else if (db.users.some((x) => x.id !== userId && x.email.toLowerCase() === f.email.trim().toLowerCase())) errors.email = 'This email address is already registered.';
  if (Object.keys(errors).length) return { ok: false, errors };
  Object.assign(u, { fullName: f.fullName.trim(), organization: f.organization.trim(), email: f.email.trim().toLowerCase() });
  // keep historical display names in sync for the user's open records
  db.requests.filter((r) => r.userId === userId).forEach((r) => { r.requesterName = u.fullName; r.organization = u.organization; });
  db.transactions.push(makeTransaction({ type: 'Profile Updated', referenceId: u.id, performedBy: u.fullName, description: 'Profile details updated.' }));
  return { ok: true, user: u };
}

export function setPassword(db, userId, newHash) {
  const u = db.users.find((x) => x.id === userId);
  if (!u) return { ok: false, error: 'User not found.' };
  u.passwordHash = newHash;
  db.transactions.push(makeTransaction({ type: 'Password Changed', referenceId: u.id, performedBy: u.fullName, description: 'Password changed.' }));
  return { ok: true };
}
