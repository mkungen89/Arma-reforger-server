import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import './ToastProvider.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = nextId.current++;
    const ttlMs = toast.ttlMs ?? 4500;
    const item = { id, type: toast.type ?? 'info', title: toast.title ?? '', message: toast.message ?? '' };
    setToasts((prev) => [item, ...prev].slice(0, 5));
    window.setTimeout(() => removeToast(id), ttlMs);
    return id;
  }, [removeToast]);

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-content">
              {t.title ? <div className="toast-title">{t.title}</div> : null}
              <div className="toast-message">{t.message}</div>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Close">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}


