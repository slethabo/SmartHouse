import { STRINGS } from '../../constants/strings';

export function Spinner({ size, label }) {
  return (
    <span className={`spinner ${size === 'sm' ? 'spinner--sm' : ''}`} role="status" aria-label={label || STRINGS.app.loading} />
  );
}

/** Full-width loading row for page sections. */
export function LoadingBlock({ label }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <Spinner />
      <span>{label || STRINGS.app.loading}</span>
    </div>
  );
}

/** Thin top progress bar for in-flight requests (response-time feedback). */
export function ProgressBar({ active }) {
  if (!active) return null;
  return <div className="progress" role="progressbar" aria-label={STRINGS.app.loading} aria-valuetext={STRINGS.app.loading} />;
}

/** Card-shaped skeletons for lists. */
export function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid grid--cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="plan-card">
          <div className="skeleton" style={{ aspectRatio: '16 / 10', borderRadius: 0 }} />
          <div className="plan-card__body">
            <div className="skeleton" style={{ height: 22, width: '70%' }} />
            <div className="skeleton" style={{ height: 16, width: '90%' }} />
            <div className="skeleton" style={{ height: 16, width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
