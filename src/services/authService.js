// Pure auth logic over a db snapshot. Returns results; DataContext persists the changes.
import { hashPassword } from '../utils/crypto.js';
import { validateRegistration } from '../utils/validation.js';
import { generateId } from '../utils/idGenerator.js';
import { makeTransaction } from './transactionService.js';

const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export async function verifyCredentials(db, identifier, password, role) {
  const user = db.users.find((u) => u.role === role && same(u.idNumber, identifier));
  if (!user) return { ok: false, error: 'Invalid ID or password.' };
  if (user.passwordHash !== (await hashPassword(password))) return { ok: false, error: 'Invalid ID or password.' };
  if (!user.active) return { ok: false, error: 'This account has been deactivated. Contact the administrator.' };
  return { ok: true, user };
}

// Public registration ALWAYS creates a 'student' role; no role field is accepted from the form.
export async function buildRegistration(db, form) {
  const errors = validateRegistration(form);
  if (!errors.idNumber && db.users.some((u) => same(u.idNumber, form.idNumber))) errors.idNumber = 'This ID number is already registered.';
  if (!errors.email && db.users.some((u) => same(u.email, form.email))) errors.email = 'This email address is already registered.';
  if (Object.keys(errors).length) return { ok: false, errors };
  const user = {
    id: generateId('USR'), role: 'student', fullName: form.fullName.trim(), idNumber: form.idNumber.trim(),
    organization: form.organization.trim(), email: form.email.trim().toLowerCase(),
    passwordHash: await hashPassword(form.password), active: true, createdAt: new Date().toISOString(),
  };
  const txn = makeTransaction({ type: 'User Registration', referenceId: user.id, performedBy: user.fullName, description: `New account registered (${user.idNumber}, ${user.organization}).` });
  return { ok: true, user, txn };
}

export const toSessionUser = (u) => ({ id: u.id, role: u.role, fullName: u.fullName, idNumber: u.idNumber });
