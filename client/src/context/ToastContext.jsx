/**
 * Global toast notifications (communication principle: every action reports
 * its outcome). Toasts are announced to screen readers via aria-live.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { TOAST_DURATION } from '../constants/config';
import { STRINGS } from '../constants/strings';
import { Icon } from '../components/ui/Icon';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, { type = 'info', action, duration = TOAST_DURATION } = {}) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, message, type, action }]);
      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (m, o) => show(m, { ...o, type: 'success' }),
      error: (m, o) => show(m, { ...o, type: 'error', duration: 7000 }),
      info: (m, o) => show(m, { ...o, type: 'info' }),
      warning: (m, o) => show(m, { ...o, type: 'warning' }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'alert' : 'info'} />
            <div className="toast__body">
              {t.message}
              {t.action && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                </>
              )}
            </div>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label={STRINGS.app.close}>
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
