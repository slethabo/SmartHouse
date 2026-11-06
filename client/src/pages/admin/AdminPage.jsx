import { useSearchParams } from 'react-router-dom';
import { STRINGS } from '../../constants/strings';
import { PageHeader } from '../../components/layout/PageHeader';
import { useFetch } from '../../hooks/useFetch';
import { adminService } from '../../services/admin.service';
import { AdminPlans } from './AdminPlans';
import { AdminUsers } from './AdminUsers';
import { AdminRates } from './AdminRates';
import { useAuth } from '../../context/AuthContext';
import { Banner } from '../../components/ui/Banner';

const TABS = ['plans', 'users', 'rates'];

export function AdminPage() {
  const { cloudMode } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'plans';
  const { data: stats, reload: reloadStats } = useFetch(({ signal }) => adminService.stats({ signal }), []);

  return (
    <>
      <PageHeader title={STRINGS.admin.title} intro={STRINGS.admin.intro} eyebrow="WORKSPACE MANAGEMENT" />
      {cloudMode && <Banner>These demo controls manage the reference design library and rates stored in this browser.</Banner>}

      {stats && (
        <div className="admin-stats" aria-label="Overview">
          {Object.entries(STRINGS.admin.stats).map(([key, label]) => (
            <div className="stat" key={key}>
              <div className="stat__label">{label}</div>
              <div className="stat__value">{stats[key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" id={`tab-${t}`} tabIndex={tab === t ? 0 : -1} aria-selected={tab === t} aria-controls={`panel-${t}`} onKeyDown={(event) => {
            const index = TABS.indexOf(t);
            const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); setParams({ tab: TABS[next] }); document.getElementById(`tab-${TABS[next]}`)?.focus();
          }} onClick={() => setParams({ tab: t })}>
            {STRINGS.admin.tabs[t]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'plans' && <AdminPlans onChanged={reloadStats} />}
        {tab === 'users' && <AdminUsers onChanged={reloadStats} />}
        {tab === 'rates' && <AdminRates onChanged={reloadStats} />}
      </div>
    </>
  );
}
