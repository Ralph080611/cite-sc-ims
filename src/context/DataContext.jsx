// Single source of truth. Every module reads `db` and mutates ONLY through `update`.
// update(fn): fn gets a deep copy of the latest db and returns a result object.
//   - result.ok === false  -> nothing is saved (validation failure / guard hit)
//   - otherwise            -> the mutated copy is persisted and React state refreshes
// A ref always holds the newest db, so rapid repeated clicks see up-to-date data
// (this is what prevents duplicate releases/returns).
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { loadDb, saveDb, resetDb } from '../services/storageService.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [db, setDb] = useState(() => loadDb());
  const ref = useRef(db);

  const update = useCallback((fn) => {
    const draft = structuredClone(ref.current);
    const result = fn(draft) || { ok: true };
    if (result.ok === false) return result;
    ref.current = draft;
    saveDb(draft);
    setDb(draft);
    return result;
  }, []);

  const reset = useCallback(() => { const fresh = resetDb(); ref.current = fresh; setDb(fresh); }, []);
  return <DataContext.Provider value={{ db, update, reset }}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
