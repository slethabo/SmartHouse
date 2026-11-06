import { useId, useState } from 'react';
import { STRINGS, fill } from '../../constants/strings';
import { FINISH_LEVELS } from '../../constants/config';
import { formatRand } from '../../utils/format';

/**
 * Finish-level tabs with the cost breakdown for the selected level.
 * @param {{estimate:{levels:object}, budget?:number, initialLevel?:string}} props
 */
export function CostBreakdown({ estimate, budget, initialLevel = 'standard' }) {
  const [level, setLevel] = useState(initialLevel);
  const id = useId();
  const current = estimate.levels[level];
  const lines = ['structure', 'finishes', 'services', 'professional_fees', 'contingency'];

  return (
    <div>
      <div className="cost-tabs" role="tablist" aria-label="Finish level">
        {FINISH_LEVELS.map((lvl) => {
          const l = estimate.levels[lvl];
          const within = budget ? l.total <= budget : null;
          return (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={level === lvl}
              aria-controls={`${id}-panel-${lvl}`}
              id={`${id}-tab-${lvl}`}
              tabIndex={level === lvl ? 0 : -1}
              className="cost-tab"
              onClick={() => setLevel(lvl)}
              onKeyDown={(event) => {
                const index = FINISH_LEVELS.indexOf(lvl);
                const next = event.key === 'ArrowRight' ? (index + 1) % FINISH_LEVELS.length : event.key === 'ArrowLeft' ? (index + FINISH_LEVELS.length - 1) % FINISH_LEVELS.length : event.key === 'Home' ? 0 : event.key === 'End' ? FINISH_LEVELS.length - 1 : -1;
                if (next < 0) return;
                event.preventDefault(); setLevel(FINISH_LEVELS[next]); document.getElementById(`${id}-tab-${FINISH_LEVELS[next]}`)?.focus();
              }}
            >
              <span className="cost-tab__name">{STRINGS.plan.finish[lvl]}</span>
              <span className="cost-tab__total">{formatRand(l.total)}</span>
              <span className="cost-tab__rate">{fill(STRINGS.plan.ratePerM2, { rate: formatRand(l.rate_per_m2) })}</span>
              {within !== null && (
                <span className={`badge ${within ? 'badge--success' : 'badge--danger'}`}>
                  {within ? STRINGS.plan.withinBudget : STRINGS.plan.overBudget}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${id}-panel-${level}`} aria-labelledby={`${id}-tab-${level}`}>
        <p className="text-muted text-sm">{STRINGS.plan.finishDescriptions[level]}</p>
        <ul className="breakdown">
          {lines.map((key) => (
            <li key={key}>
              <span>
                {STRINGS.plan.breakdown[key]}
                <span className="pct">{Math.round((current.breakdown[key] / current.total) * 100)}%</span>
              </span>
              <span>{formatRand(current.breakdown[key])}</span>
            </li>
          ))}
          <li>
            <span>{STRINGS.plan.breakdown.total}</span>
            <span>{formatRand(current.total)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
