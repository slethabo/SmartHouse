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
        <section><h3>Start with your story</h3><p>Create a project, then answer questions about your plot, budget, household, and daily routines.</p></section>
        <section><h3>Save and refine</h3><p>Save each step as you go. Review your answers, confirm the brief, and explore a room concept with illustrative costs.</p></section>
        <section><h3>Understand the preview</h3><p>The floor plan and house exterior use the same footprint. Show cutaway to inspect the room arrangement. These are concept previews; detailed architectural and construction checks are still to come.</p></section>
        <section><h3>Saved on your device</h3><p>No account is needed. Projects stay in this browser. No backend or database is needed. The design library contains earlier reference houses.</p></section>
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
