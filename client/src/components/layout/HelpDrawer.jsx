import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { STRINGS } from '../../constants/strings';
import { Icon } from '../ui/Icon';
import { useFetch } from '../../hooks/useFetch';
import { plansService } from '../../services/plans.service';
import { formatRand } from '../../utils/format';

/** "How it works" help facility, available on every page. */
export function HelpDrawer({ open, onClose }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { data: rates } = useFetch(() => plansService.rates(), [], { enabled: open });

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="overlay" onMouseDown={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div className="flex flex--between">
          <h2 id="help-title">{STRINGS.help.title}</h2>
          <button ref={closeRef} type="button" className="toast__close" onClick={onClose} aria-label={STRINGS.app.close}>
            <Icon name="x" />
          </button>
        </div>
        {STRINGS.help.sections.map((section) => (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            <ul>
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        {rates?.items?.length > 0 && (
          <section>
            <h3>{STRINGS.help.currentRates}</h3>
            <ul>
              {rates.items.map((r) => (
                <li key={r.finish_level}>
                  <strong style={{ textTransform: 'capitalize' }}>{r.finish_level}</strong>: {formatRand(r.rate_per_m2)} per m²
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </>,
    document.body
  );
}
