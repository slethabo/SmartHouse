import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STRINGS, fill } from '../constants/strings';
import { PageHeader } from '../components/layout/PageHeader';
import { PlanCard } from '../components/plans/PlanCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { SkeletonCards, ProgressBar } from '../components/ui/Spinner';
import { useFetch } from '../hooks/useFetch';
import { useSavePlan } from '../hooks/useSavePlan';
import { plansService } from '../services/plans.service';
import { useAuth } from '../context/AuthContext';

const EMPTY = { search: '', bedrooms: '', floors: '', style: '', maxArea: '' };

export function BrowsePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const applied = useMemo(() => ({ ...EMPTY, ...Object.fromEntries(params.entries()) }), [params]);
  const [draft, setDraft] = useState(applied);

  const { data, loading, error, reload, setData } = useFetch(({ signal }) => plansService.browse(applied, { signal }), [params.toString()]);
  const items = data?.items || [];
  const styles = data?.styles || [];
  const hasFilters = Object.values(applied).some(Boolean);

  const onSavedChange = useCallback(
    (planId, isSaved) => setData((d) => (d ? { ...d, items: d.items.map((p) => (p.id === planId ? { ...p, is_saved: isSaved } : p)) } : d)),
    [setData]
  );
  const { toggle, pendingId } = useSavePlan({ onChange: onSavedChange });

  const apply = (e) => {
    e.preventDefault();
    const next = {};
    for (const [k, v] of Object.entries(draft)) if (v) next[k] = v;
    setParams(next);
  };
  const clear = () => {
    setDraft(EMPTY);
    setParams({});
  };

  return (
    <>
      <ProgressBar active={loading} />
      <PageHeader title={STRINGS.browse.title} intro={STRINGS.browse.intro} />

      <form className="toolbar" onSubmit={apply} role="search" aria-label={STRINGS.browse.search}>
        <FormField
          className="field--grow"
          label={STRINGS.browse.search}
          type="search"
          placeholder={STRINGS.browse.searchPlaceholder}
          value={draft.search}
          onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
        />
        <FormField as="select" label={STRINGS.browse.bedrooms} value={draft.bedrooms} onChange={(e) => setDraft((d) => ({ ...d, bedrooms: e.target.value }))}>
          <option value="">{STRINGS.dashboard.any}</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </FormField>
        <FormField as="select" label={STRINGS.browse.floors} value={draft.floors} onChange={(e) => setDraft((d) => ({ ...d, floors: e.target.value }))}>
          <option value="">{STRINGS.dashboard.any}</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </FormField>
        <FormField as="select" label={STRINGS.browse.style} value={draft.style} onChange={(e) => setDraft((d) => ({ ...d, style: e.target.value }))}>
          <option value="">{STRINGS.dashboard.any}</option>
          {styles.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FormField>
        <FormField
          label={STRINGS.browse.maxArea}
          type="number"
          min="1"
          suffix={STRINGS.app.units.area}
          value={draft.maxArea}
          onChange={(e) => setDraft((d) => ({ ...d, maxArea: e.target.value }))}
        />
        <Button type="submit" icon="search">
          {STRINGS.browse.apply}
        </Button>
        {(hasFilters || Object.values(draft).some(Boolean)) && (
          <Button variant="ghost" icon="x" onClick={clear}>
            {STRINGS.browse.clear}
          </Button>
        )}
      </form>

      {error && (
        <div className="mb-4">
          <Banner type="error" onRetry={reload}>
            {error.message}
          </Banner>
        </div>
      )}

      {loading ? (
        <SkeletonCards count={6} />
      ) : items.length === 0 ? (
        <EmptyState icon="search" title={STRINGS.browse.noResultsTitle} body={STRINGS.browse.noResultsBody}>
          <Button onClick={clear} icon="x">
            {STRINGS.browse.clear}
          </Button>
        </EmptyState>
      ) : (
        <>
          <p className="text-muted text-sm" aria-live="polite">
            {items.length === 1 ? STRINGS.browse.resultsOne : fill(STRINGS.browse.results, { count: items.length })}
          </p>
          <div className="grid grid--cards">
            {items.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cost={plan.cost}
                saved={plan.is_saved}
                saving={pendingId === plan.id}
                canSave={Boolean(user)}
                onToggleSave={(p) => toggle(p, p.is_saved)}
                detailState={{ from: `/browse?${params.toString()}` }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
