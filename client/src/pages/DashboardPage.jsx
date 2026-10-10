import { useMemo } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { STRINGS } from '../constants/strings';
import { DEFAULT_SEARCH } from '../constants/config';
import { PageHeader } from '../components/layout/PageHeader';
import { FindHouseForm } from '../components/forms/FindHouseForm';
import { Banner } from '../components/ui/Banner';
import { useLastSearch } from '../hooks/useLastSearch';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

/**
 * Home: the "Find my house" form. Submitting navigates to /recommendations
 * with the search in the URL (shareable, refresh-safe, back-button friendly).
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastSearch, restored, setLastSearch } = useLastSearch(Boolean(user));

  const initialValues = useMemo(() => ({ ...DEFAULT_SEARCH, ...(lastSearch || {}) }), [lastSearch]);

  const handleSubmit = (values) => {
    setLastSearch(values);
    const params = createSearchParams({
      plot: String(values.plotSizeM2),
      budget: String(values.budget),
      ...(values.bedrooms ? { bedrooms: String(values.bedrooms) } : {}),
      ...(values.floors ? { floors: String(values.floors) } : {}),
      ...(values.style ? { style: values.style } : {}),
    });
    navigate(`/recommendations?${params.toString()}`);
  };

  return (
    <>
      <PageHeader title={STRINGS.dashboard.title} />
      <section className="card" style={{ marginBottom: 24 }}><h2>Design a home around your life</h2><p>Start an architectural consultation, save your requirements, and explore a personalised schematic concept.</p><Button to="/projects">Start your house project</Button></section>
      <div className="hero">
        <div className="hero__intro">
          <h1 style={{ marginTop: 0 }}>{STRINGS.dashboard.heading}</h1>
          <p>{STRINGS.dashboard.intro}</p>
          <ol className="hero__steps">
            {STRINGS.dashboard.steps.map((step, i) => (
              <li key={i}>
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          {restored && (
            <div className="mb-4">
              <Banner type="info">{STRINGS.dashboard.lastSearchRestored}</Banner>
            </div>
          )}
          <FindHouseForm initialValues={initialValues} onSubmit={handleSubmit} />
        </div>
      </div>
    </>
  );
}
