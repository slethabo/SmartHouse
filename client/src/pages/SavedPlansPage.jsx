import { useCallback } from 'react';
import { STRINGS } from '../constants/strings';
import { PageHeader } from '../components/layout/PageHeader';
import { PlanCard } from '../components/plans/PlanCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { SkeletonCards, ProgressBar } from '../components/ui/Spinner';
import { useFetch } from '../hooks/useFetch';
import { useSavePlan } from '../hooks/useSavePlan';
import { plansService } from '../services/plans.service';

export function SavedPlansPage() {
  const { data, loading, error, reload, setData } = useFetch(({ signal }) => plansService.listSaved({ signal }), []);
  const items = data?.items || [];

  const onSavedChange = useCallback(
    (planId, isSaved) => {
      if (!isSaved) setData((d) => (d ? { ...d, items: d.items.filter((p) => p.id !== planId) } : d));
      else reload(); // undo: re-fetch to restore ordering and data
    },
    [setData, reload]
  );
  const { toggle, pendingId } = useSavePlan({ onChange: onSavedChange });

  return (
    <>
      <ProgressBar active={loading} />
      <PageHeader title={STRINGS.saved.title} intro={STRINGS.saved.intro} />

      {error && (
        <div className="mb-4">
          <Banner type="error" onRetry={reload}>
            {error.message}
          </Banner>
        </div>
      )}

      {loading ? (
        <SkeletonCards count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon="heart" title={STRINGS.saved.emptyTitle} body={STRINGS.saved.emptyBody}>
          <Button to="/" icon="search">
            {STRINGS.saved.findDesigns}
          </Button>
          <Button variant="secondary" to="/browse" icon="grid">
            {STRINGS.browse.title}
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid--cards">
          {items.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cost={plan.cost}
              saved
              saving={pendingId === plan.id}
              onToggleSave={(p) => toggle(p, true)}
              detailState={{ from: '/saved' }}
            />
          ))}
        </div>
      )}
    </>
  );
}
