import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants/strings';
import { formatArea, formatRand } from '../../utils/format';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { PlanImage } from './PlanImage';
import { MatchBadge } from './MatchBadge';

/**
 * Plan card used on Recommendations, Browse and Saved pages (consistent look).
 * @param {{plan:object, cost:{low:number,high:number}, match?:object, saved:boolean, onToggleSave:Function, saving?:boolean, detailState?:object}} props
 */
export function PlanCard({ plan, cost, match, saved, onToggleSave, saving = false, detailState, canSave = true }) {
  const detailTo = `/plans/${plan.id}`;
  return (
    <article className="plan-card" aria-labelledby={`plan-${plan.id}-title`}>
      <div className="plan-card__media">
        <Link to={detailTo} state={detailState} tabIndex={-1} aria-hidden="true">
          <PlanImage src={plan.image_url} alt={`${plan.name} – ${plan.style} house design`} />
        </Link>
        {match && (
          <div className="plan-card__badge">
            <MatchBadge percent={match.match_percent} />
          </div>
        )}
      </div>
      <div className="plan-card__body">
        <h3 className="plan-card__title" id={`plan-${plan.id}-title`}>
          <Link to={detailTo} state={detailState}>
            {plan.name}
          </Link>
        </h3>
        <ul className="plan-card__specs" aria-label="Specifications">
          <li>
            <Icon name="bed" size={16} /> {plan.bedrooms} {plan.bedrooms === 1 ? 'bed' : 'beds'}
          </li>
          <li>
            <Icon name="bath" size={16} /> {plan.bathrooms} {plan.bathrooms === 1 ? 'bath' : 'baths'}
          </li>
          <li>
            <Icon name="layers" size={16} /> {plan.floors} {plan.floors === 1 ? 'floor' : 'floors'}
          </li>
          <li>
            <Icon name="ruler" size={16} /> {formatArea(plan.floor_area_m2)}
          </li>
          <li>
            <Icon name="tag" size={16} /> {plan.style}
          </li>
        </ul>
        {cost && (
          <div className="plan-card__cost">
            {STRINGS.recommendations.estimated}: <strong>{formatRand(cost.low)}</strong> {STRINGS.recommendations.to}{' '}
            <strong>{formatRand(cost.high)}</strong>
          </div>
        )}
        {match?.reason && <div className="plan-card__reason">{match.reason}</div>}
      </div>
      <div className="plan-card__actions">
        <Button variant="primary" size="sm" to={detailTo} state={detailState} icon="arrowRight">
          {STRINGS.recommendations.viewDetails}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={saved ? 'heartFilled' : 'heart'}
          onClick={() => onToggleSave(plan)}
          loading={saving}
          disabled={!canSave}
          disabledReason={STRINGS.plan.loginToSave}
          aria-pressed={saved}
          title={saved ? STRINGS.plan.savedTooltip : STRINGS.plan.saveTooltip}
        >
          {saved ? STRINGS.app.saved : STRINGS.app.save}
        </Button>
      </div>
    </article>
  );
}
