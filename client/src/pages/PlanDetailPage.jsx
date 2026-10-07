import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { STRINGS } from '../constants/strings';
import { STORAGE_KEYS } from '../constants/config';
import { PageHeader } from '../components/layout/PageHeader';
import { PlanImage } from '../components/plans/PlanImage';
import { CostBreakdown } from '../components/plans/CostBreakdown';
import { MatchBadge } from '../components/plans/MatchBadge';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingBlock, ProgressBar } from '../components/ui/Spinner';
import { useFetch } from '../hooks/useFetch';
import { useSavePlan } from '../hooks/useSavePlan';
import { plansService } from '../services/plans.service';
import { formatArea, formatRand } from '../utils/format';

/** Find recommendation context for this plan: router state first, then the cached last results. */
function findContext(planId, state) {
  if (state?.match) return { match: state.match, search: state.search, from: state.from };
  try {
    const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.lastResults) || 'null');
    const match = cached?.matches?.find((m) => m.plan.id === planId);
    if (match) return { match, search: cached.search, from: `/recommendations?${cached.key}` };
  } catch {
    /* ignore */
  }
  return null;
}

export function PlanDetailPage() {
  const { id } = useParams();
  const planId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const context = useMemo(() => findContext(planId, location.state), [planId, location.state]);

  const { data: plan, loading, error, reload, setData } = useFetch(({ signal }) => plansService.detail(planId, { signal }), [planId]);
  const [saved, setSaved] = useState(null);
  const isSaved = saved ?? plan?.is_saved ?? false;
  const { toggle, pendingId } = useSavePlan({ onChange: (_id, s) => { setSaved(s); setData((p) => (p ? { ...p, is_saved: s } : p)); } });

  const backTo = location.state?.from || context?.from || '/browse';
  const backLabel = backTo.startsWith('/recommendations') ? STRINGS.plan.backToResults : STRINGS.app.back;
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate(backTo));

  const breadcrumbs = backTo.startsWith('/recommendations')
    ? [{ label: STRINGS.recommendations.title, to: backTo }]
    : backTo.startsWith('/saved')
      ? [{ label: STRINGS.saved.title, to: '/saved' }]
      : [{ label: STRINGS.browse.title, to: '/browse' }];

  if (loading) {
    return (
      <>
        <ProgressBar active />
        <PageHeader title={STRINGS.plan.title} breadcrumbs={breadcrumbs} />
        <LoadingBlock />
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <PageHeader title={STRINGS.plan.title} breadcrumbs={breadcrumbs} />
        {error?.status === 404 ? (
          <EmptyState icon="alert" title={STRINGS.plan.notFound}>
            <Button variant="secondary" icon="arrowLeft" onClick={goBack}>
              {STRINGS.app.back}
            </Button>
            <Button to="/browse" icon="grid">
              {STRINGS.browse.title}
            </Button>
          </EmptyState>
        ) : (
          <Banner type="error" onRetry={reload}>
            {error?.message || STRINGS.app.genericError}
          </Banner>
        )}
      </>
    );
  }

  const match = context?.match;
  const budget = context?.search?.budget;
  const specs = [
    [STRINGS.plan.bedrooms, plan.bedrooms],
    [STRINGS.plan.bathrooms, plan.bathrooms],
    [STRINGS.plan.floors, plan.floors],
    [STRINGS.plan.floorArea, formatArea(plan.floor_area_m2)],
    [STRINGS.plan.footprint, formatArea(plan.footprint_m2)],
    [STRINGS.plan.minPlot, formatArea(plan.min_plot_size_m2)],
  ];

  return (
    <>
      <PageHeader
        title={plan.name}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button variant="secondary" icon="arrowLeft" onClick={goBack}>
              {backLabel}
            </Button>
            <Button
              variant={isSaved ? 'secondary' : 'primary'}
              icon={isSaved ? 'heartFilled' : 'heart'}
              loading={pendingId === plan.id}
              onClick={() => toggle(plan, isSaved)}
              aria-pressed={isSaved}
              title={isSaved ? STRINGS.plan.savedTooltip : STRINGS.plan.saveTooltip}
            >
              {isSaved ? STRINGS.app.saved : STRINGS.app.save}
            </Button>
          </>
        }
      />

      <div className="detail-hero">
        <div className="detail-hero__media">
          <PlanImage src={plan.image_url} alt={`${plan.name} – ${plan.style} house design`} />
        </div>
        <div className="card">
          <div className="flex flex--between">
            <span className="badge badge--muted">{plan.style}</span>
            {match && <MatchBadge percent={match.match_percent} />}
          </div>
          <div className="spec-grid">
            {specs.map(([label, value]) => (
              <div className="spec" key={label}>
                <div className="spec__label">{label}</div>
                <div className="spec__value">{value}</div>
              </div>
            ))}
          </div>
          <h2 className="card__title" style={{ fontSize: 'var(--text-md)' }}>
            {STRINGS.plan.about}
          </h2>
          <p className="text-muted">{plan.description}</p>
        </div>
      </div>

      <div className="grid grid--sidebar">
        <section className="card" aria-labelledby="cost-title">
          <h2 id="cost-title" className="card__title">
            {STRINGS.plan.costTitle}
          </h2>
          <p className="text-muted text-sm">{STRINGS.plan.costIntro}</p>
          <CostBreakdown estimate={plan.estimate} budget={budget} initialLevel={match?.best_finish_level || 'standard'} />
        </section>

        <section className="card why-panel" aria-labelledby="why-title">
          <h2 id="why-title" className="card__title">
            {STRINGS.plan.whyTitle}
          </h2>
          {match ? (
            <>
              <p>{match.reason}</p>
              <ul className="breakdown">
                <li>
                  <span>{STRINGS.plan.bestFinish}</span>
                  <span style={{ textTransform: 'capitalize' }}>{match.best_finish_level}</span>
                </li>
                <li>
                  <span>{STRINGS.plan.budgetLeft}</span>
                  <span>{formatRand(match.budget_remaining)}</span>
                </li>
                <li>
                  <span>{STRINGS.plan.plotCoverage}</span>
                  <span>{match.plot_coverage_percent}%</span>
                </li>
              </ul>
              <div className="why-panel__scores">
                {Object.entries(match.scores).map(([k, v]) => (
                  <div className="score-bar" key={k}>
                    <div className="flex flex--between">
                      <span>{STRINGS.plan.scores[k]}</span>
                      <span>{Math.round(v * 100)}%</span>
                    </div>
                    <div className="score-bar__track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={STRINGS.plan.scores[k]}>
                      <div className="score-bar__fill" style={{ width: `${Math.round(v * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted text-sm mt-4" style={{ margin: 0 }}>
                {STRINGS.plan.scoreWeights}
              </p>
            </>
          ) : (
            <>
              <p className="text-muted">{STRINGS.plan.whyNoContext}</p>
              <Button variant="secondary" to="/" icon="search">
                {STRINGS.dashboard.submit}
              </Button>
            </>
          )}
        </section>
      </div>
    </>
  );
}
