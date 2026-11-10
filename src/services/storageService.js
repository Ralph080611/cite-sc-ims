// The ONLY module that touches localStorage. Three keys total:
//   citesc_db      - the whole application database (single source of truth)
//   citesc_session - the active session
//   citesc_theme   - light/dark preference
import { buildSeedData } from './seedData.js';

export const KEYS = { DB: 'citesc_db', SESSION: 'citesc_session', THEME: 'citesc_theme' };

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function readKey(key, fallback = null) {
  try { return safeParse(localStorage.getItem(key), fallback); } catch { return fallback; }
}

export function writeKey(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export function removeKey(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

const COLLECTIONS = ['users', 'categories', 'items', 'requests', 'borrows', 'returns', 'damageReports', 'transactions'];

// Load the DB; repair missing collections; seed on first run.
export function loadDb() {
  const db = readKey(KEYS.DB, null);
  if (!db || typeof db !== 'object') {
    const seeded = buildSeedData();
    writeKey(KEYS.DB, seeded);
    return seeded;
  }
  let changed = false;
  for (const c of COLLECTIONS) {
    if (!Array.isArray(db[c])) { db[c] = []; changed = true; }
  }
  if (!db.settings || typeof db.settings !== 'object') { db.settings = buildSeedData().settings; changed = true; }
  if (changed) writeKey(KEYS.DB, db);
  return db;
}

export const saveDb = (db) => writeKey(KEYS.DB, db);

export function resetDb() {
  const seeded = buildSeedData();
  writeKey(KEYS.DB, seeded);
  return seeded;
}
