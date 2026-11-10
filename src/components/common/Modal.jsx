import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer, size = 'md' }) {
  const boxRef = useRef(null);
  // Keep the latest onClose without re-running the focus effect: parents pass a new
  // function on every render, and re-running would steal focus from inputs mid-typing.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    boxRef.current?.focus(); // once, on open
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}>
      <div className={`modal-box ${size}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={boxRef}>
        <div className="modal-head"><h2 className="h5 mb-0 fw-bold">{title}</h2><button className="icon-btn" onClick={() => closeRef.current()} aria-label="Close"><X size={16} /></button></div>
        <div className="modal-body-x">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
