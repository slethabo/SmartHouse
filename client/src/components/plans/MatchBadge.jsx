import { STRINGS, fill } from '../../constants/strings';

/** Match percentage pill; colour hints at quality but text carries the meaning. */
export function MatchBadge({ percent }) {
  const cls = percent >= 75 ? 'is-good' : percent >= 50 ? '' : 'is-ok';
  return (
    <span className={`badge badge--match ${cls}`} aria-label={fill(STRINGS.recommendations.matchLabel, { percent })}>
      {fill(STRINGS.recommendations.matchLabel, { percent })}
    </span>
  );
}
