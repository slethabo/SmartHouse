import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { STRINGS } from '../../constants/strings';

/**
 * Accessible modal: focus trap, Escape to close, click-outside to close,
 * focus restored on close. Never traps the user.
 */
export function Modal({ open, onClose, title, children, wide = false, labelledBy }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  // Keep the latest onClose without re-running the focus effect on every parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onClose = () => onCloseRef.current?.();
    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    const focusable = () =>
      Array.from(node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.disabled
      );
    const first = focusable()[0];
    (first || node).focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const items = focusable();
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={`dialog ${wide ? 'dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || 'modal-title'}
        tabIndex={-1}
      >
        <div className="dialog__header">
          <h2 id={labelledBy || 'modal-title'}>{title}</h2>
          <button type="button" className="toast__close" onClick={onClose} aria-label={STRINGS.app.close}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
