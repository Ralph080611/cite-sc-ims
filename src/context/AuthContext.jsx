import { createContext, useContext, useState, useCallback } from 'react';
import { useData } from './DataContext.jsx';
import { KEYS, readKey, writeKey, removeKey } from '../services/storageService.js';
import { verifyCredentials, buildRegistration, toSessionUser } from '../services/authService.js';
import { makeTransaction } from '../services/transactionService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { db, update } = useData();
  const [session, setSession] = useState(() => readKey(KEYS.SESSION, null));

  // Always resolve the live user record from the db so deactivation/profile edits apply immediately.
  const user = session ? db.users.find((u) => u.id === session.id && u.role === session.role && u.active) || null : null;

  const login = useCallback(async (identifier, password, role) => {
    const res = await verifyCredentials(db, identifier, password, role);
    if (!res.ok) return res;
    const s = toSessionUser(res.user);
    writeKey(KEYS.SESSION, s);
    setSession(s);
    return { ok: true, user: res.user };
  }, [db]);

  const register = useCallback(async (form) => {
    const res = await buildRegistration(db, form);
    if (!res.ok) return res;
    const out = update((d) => {
      // Re-check against the freshest data to block duplicates from rapid double submits.
      const dup = d.users.some((u) => u.idNumber.toLowerCase() === res.user.idNumber.toLowerCase() || u.email === res.user.email);
      if (dup) return { ok: false, errors: { idNumber: 'This ID number or email is already registered.' } };
      d.users.push(res.user);
      d.transactions.push(res.txn);
      return { ok: true };
    });
    if (!out.ok) return out;
    return { ok: true };
  }, [db, update]);

  const logout = useCallback(() => { removeKey(KEYS.SESSION); setSession(null); }, []);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export { makeTransaction };
