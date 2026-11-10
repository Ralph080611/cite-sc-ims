import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);
let n = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, text) => {
    const id = ++n;
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const api = {
    success: (t) => push('success', t), error: (t) => push('danger', t), warning: (t) => push('warning', t), info: (t) => push('info', t),
  };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`alert alert-${t.type} shadow-sm mb-2`} role="status">{t.text}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
