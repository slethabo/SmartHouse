import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STRINGS, fill } from '../constants/strings';
import { STORAGE_KEYS } from '../constants/config';
import { PageHeader } from '../components/layout/PageHeader';
import { PlanCard } from '../components/plans/PlanCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { SkeletonCards, ProgressBar } from '../components/ui/Spinner';
import { useFetch } from '../hooks/useFetch';
import { useSavePlan } from '../hooks/useSavePlan';
import { recommendationService } from '../services/recommendation.service';
import { plansService } from '../services/plans.service';
import { formatArea, formatRand } from '../utils/format';

const SORTS = {
  match: (a, b) => b.score - a.score,
  costAsc: (a, b) => a.cost.low - b.cost.low,
  costDesc: (a, b) => b.cost.low - a.cost.low,
  areaDesc: (a, b) => b.plan.floor_area_m2 - a.plan.floor_area_m2,
};

/** Read the search from the URL. Returns null when incomplete. */
function readSearch(params) {
  const plot = Number(params.get('plot'));
  const budget = Number(params.get('budget'));
  if (!(plot > 0) || !(budget > 0)) return null;
  return {
    plotSizeM2: plot,
    budget,
    filters: {
      ...(params.get('bedrooms') ? { bedrooms: Number(params.get('bedrooms')) } : {}),
      ...(params.get('floors') ? { floors: Number(params.get('floors')) } : {}),
      ...(params.get('style') ? { style: params.get('style') } : {}),
    },
  };
}

export function RecommendationsPage() {
  const [params] = useSearchParams();
  const search = useMemo(() => readSearch(params), [params]);
  const key = params.toString();

  const { data, loading, error, reload } = useFetch(
    ({ signal }) => recommendationService.recommend({ ...search, limit: 50 }, { signal }),
    [key],
    { enabled: Boolean(search) }
  );
  const { data: savedData, setData: setSavedData } = useFetch(() => plansService.listSaved(), []);
  const savedIds = useMemo(() => new Set((savedData?.items || []).map((p) => p.id)), [savedData]);

  // Cache results so the detail page can show "why this was recommended".
  useEffect(() => {
    if (data && search) {
      try {
        sessionStorage.setItem(STORAGE_KEYS.lastResults, JSON.stringify({ key, search, matches: data.matches }));
      } catch {
        /* ignore */
      }
    }
  }, [data, key, search]);

  const [sort, setSort] = useState('match');
  const [filter, setFilter] = useState({ bedrooms: '', floors: '', style: '' });
  const hasFilter = Boolean(filter.bedrooms || filter.floors || filter.style);

  const matches = useMemo(() => data?.matches || [], [data]);
  const styles = useMemo(() => Array.from(new Set(matches.map((m) => m.plan.style))).sort(), [matches]);
  const visible = useMemo(() => {
    return matches
      .filter((m) => !filter.bedrooms || m.plan.bedrooms >= Number(filter.bedrooms))
      .filter((m) => !filter.floors || m.plan.floors === Number(filter.floors))
      .filter((m) => !filter.style || m.plan.style === filter.style)
      .sort(SORTS[sort]);
  }, [matches, filter, sort]);

  const onSavedChange = useCallback(
    (planId, isSaved) => {
      setSavedData((d) => {
        const items = d?.items || [];
        if (isSaved) {
          const m = matches.find((x) => x.plan.id === planId);
          return { items: items.some((p) => p.id === planId) ? items : [...items, m ? m.plan : { id: planId }] };
        }
        return { items: items.filter((p) => p.id !== planId) };
      });
    },
    [matches, setSavedData]
  );
  const { toggle, pendingId } = useSavePlan({ onChange: onSavedChange });

  const header = (
    <PageHeader
      title={STRINGS.recommendations.title}
      intro={STRINGS.recommendations.intro}
      actions={
        <Button variant="secondary" icon="arrowLeft" to="/">
          {STRINGS.recommendations.changeSearch}
        </Button>
      }
    />
  );

  if (!search) {
    return (
      <>
        {header}
        <EmptyState icon="search" title={STRINGS.recommendations.noResultsTitle} body={STRINGS.recommendations.nothingYet}>
          <Button to="/" icon="search">
            {STRINGS.dashboard.submit}
          </Button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <ProgressBar active={loading} />
      {header}

      <div className="search-summary">
        <span>
          {fill(STRINGS.recommendations.searchSummary, {
            plot: formatArea(search.plotSizeM2),
            budget: formatRand(search.budget),
          })}
        </span>
        {search.filters.bedrooms && <span className="badge badge--muted">{search.filters.bedrooms}+ bedrooms</span>}
        {search.filters.floors && <span className="badge badge--muted">{search.filters.floors} floor(s)</span>}
        {search.filters.style && <span className="badge badge--muted">{search.filters.style}</span>}
      </div>

      {error && (
        <div className="mb-4">
          <Banner type="error" onRetry={reload}>
            {error.message}
          </Banner>
        </div>
      )}

      {loading && <SkeletonCards count={6} />}

      {!loading && data && matches.length === 0 && (
        <EmptyState icon="alert" title={STRINGS.recommendations.noResultsTitle} body={data.noMatch?.message} suggestions={data.noMatch?.suggestions}>
          <Button to="/" icon="arrowLeft">
            {STRINGS.recommendations.tryNewSearch}
          </Button>
          <Button variant="secondary" to="/browse" icon="grid">
            {STRINGS.recommendations.browseAll}
          </Button>
        </EmptyState>
      )}

      {!loading && matches.length > 0 && (
        <>
          <div className="toolbar" role="group" aria-label="Sort and filter results">
            <FormField as="select" label={STRINGS.recommendations.sortBy} value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(STRINGS.recommendations.sortOptions).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </FormField>
            <FormField as="select" label={STRINGS.recommendations.filterBedrooms} value={filter.bedrooms} onChange={(e) => setFilter((f) => ({ ...f, bedrooms: e.target.value }))}>
              <option value="">{STRINGS.dashboard.any}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </FormField>
            <FormField as="select" label={STRINGS.recommendations.filterFloors} value={filter.floors} onChange={(e) => setFilter((f) => ({ ...f, floors: e.target.value }))}>
              <option value="">{STRINGS.dashboard.any}</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </FormField>
            <FormField as="select" label={STRINGS.recommendations.filterStyle} value={filter.style} onChange={(e) => setFilter((f) => ({ ...f, style: e.target.value }))}>
              <option value="">{STRINGS.dashboard.any}</option>
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FormField>
            {hasFilter && (
              <Button variant="ghost" icon="x" onClick={() => setFilter({ bedrooms: '', floors: '', style: '' })}>
                {STRINGS.recommendations.clearFilters}
              </Button>
            )}
          </div>

          <p className="text-muted text-sm" aria-live="polite">
            {visible.length === 1 ? STRINGS.recommendations.resultCountOne : fill(STRINGS.recommendations.resultCount, { count: visible.length })}
          </p>

          {visible.length === 0 ? (
            <EmptyState icon="sliders" title={STRINGS.recommendations.noResultsFilteredTitle} body={STRINGS.recommendations.noResultsFilteredBody}>
              <Button onClick={() => setFilter({ bedrooms: '', floors: '', style: '' })} icon="x">
                {STRINGS.recommendations.clearFilters}
              </Button>
            </EmptyState>
          ) : (
            <div className="grid grid--cards">
              {visible.map((m) => (
                <PlanCard
                  key={m.plan.id}
                  plan={m.plan}
                  cost={m.cost}
                  match={m}
                  saved={savedIds.has(m.plan.id)}
                  saving={pendingId === m.plan.id}
                  onToggleSave={(plan) => toggle(plan, savedIds.has(plan.id))}
                  detailState={{ match: m, search, from: `/recommendations?${key}` }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
