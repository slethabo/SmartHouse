import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { STRINGS } from '../../constants/strings';
import { Icon } from '../ui/Icon';
import { useFetch } from '../../hooks/useFetch';
import { plansService } from '../../services/plans.service';
import { formatRand } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

/** "How it works" help facility, available on every page. */
export function HelpDrawer({ open, onClose }) {
  const { cloudMode } = useAuth();
  const closeRef = useRef(null);
  const drawerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { data: rates } = useFetch(() => plansService.rates(), [], { enabled: open });

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current?.(); }
      if (e.key !== 'Tab') return;
      const items = [...drawerRef.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="overlay" onMouseDown={onClose} aria-hidden="true" />
      <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div className="flex flex--between">
          <h2 id="help-title">{STRINGS.help.title}</h2>
          <button ref={closeRef} type="button" className="toast__close" onClick={onClose} aria-label={STRINGS.app.close}>
            <Icon name="x" />
          </button>
        </div>
        <section><h3>Start with your story</h3><p>Create a project, then answer questions about your plot, budget, household, and daily routines.</p></section>
        <section><h3>Save and refine</h3><p>Save each step as you go. Review your answers, confirm the brief, and explore a room concept with illustrative costs.</p></section>
        <section><h3>Explore your home</h3><p>Choose Floor plan to read the room arrangement, or Interactive 3D to rotate the house and remove the roof. For a multi-storey home, select a floor to inspect it. Plans and exterior views use the same design. These are concepts for professional review.</p></section>
        <section><h3>{cloudMode ? 'Your cloud workspace' : 'Saved on your device'}</h3><p>{cloudMode ? 'Projects, draft answers, and confirmed briefs are saved to your account. Log in with your email and password to continue on another device. The reference design library, its saved favourites, and demo rate controls remain in this browser. Concept previews and downloads are generated in your browser.' : 'No account is needed. Projects stay in this browser. No backend or database is needed. The design library contains earlier reference houses.'}</p></section>
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
