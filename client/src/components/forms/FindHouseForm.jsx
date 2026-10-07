import { useEffect, useState } from 'react';
import { STRINGS } from '../../constants/strings';
import { BUDGET_PRESETS } from '../../constants/config';
import { validateSearch } from '../../utils/validation';
import { formatRandCompact, parseNumberInput } from '../../utils/format';
import { FormField } from '../ui/FormField';
import { Button } from '../ui/Button';
import { useFetch } from '../../hooks/useFetch';
import { plansService } from '../../services/plans.service';

/**
 * "Find my house" form. Prefilled from `initialValues` (last search or defaults).
 * Calls `onSubmit({ plotSizeM2, budget, bedrooms, floors, style })`.
 */
export function FindHouseForm({ initialValues, onSubmit, submitting = false }) {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const { data: browseData } = useFetch(() => plansService.browse({}), []);
  const styles = browseData?.styles || [];

  // Re-sync when the restored last search arrives after mount.
  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const plotNum = parseNumberInput(form.plotSizeM2);
  const budgetNum = parseNumberInput(form.budget);
  const canSubmit = Number.isFinite(plotNum) && plotNum > 0 && Number.isFinite(budgetNum) && budgetNum > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateSearch(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({
      plotSizeM2: plotNum,
      budget: budgetNum,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : '',
      floors: form.floors ? Number(form.floors) : '',
      style: form.style || '',
    });
  };

  return (
    <form className="form find-form" onSubmit={handleSubmit} noValidate aria-describedby="find-form-desc">
      <p id="find-form-desc" className="visually-hidden">
        {STRINGS.dashboard.intro}
      </p>
      <FormField
        label={STRINGS.dashboard.plotSize}
        hint={STRINGS.dashboard.plotSizeHint}
        tooltip={STRINGS.dashboard.tooltips.plot}
        suffix={STRINGS.app.units.area}
        type="number"
        inputMode="decimal"
        min="1"
        step="1"
        placeholder={STRINGS.dashboard.plotPlaceholder}
        value={form.plotSizeM2}
        onChange={update('plotSizeM2')}
        error={errors.plotSizeM2}
        required
      />
      <div className="field">
        <FormField
          label={STRINGS.dashboard.budget}
          hint={STRINGS.dashboard.budgetHint}
          tooltip={STRINGS.dashboard.tooltips.budget}
          prefix={STRINGS.app.units.currency}
          type="number"
          inputMode="numeric"
          min="1"
          step="1000"
          placeholder={STRINGS.dashboard.budgetPlaceholder}
          value={form.budget}
          onChange={update('budget')}
          error={errors.budget}
          required
        />
        <div className="chips mt-2" role="group" aria-label={STRINGS.dashboard.budgetPresets}>
          {BUDGET_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`chip ${Number(form.budget) === preset ? 'is-selected' : ''}`}
              aria-pressed={Number(form.budget) === preset}
              onClick={() => {
                setForm((f) => ({ ...f, budget: preset }));
                setErrors((er) => ({ ...er, budget: '' }));
              }}
            >
              {formatRandCompact(preset)}
            </button>
          ))}
        </div>
      </div>

      <details className="find-form__filters" open={Boolean(form.bedrooms || form.floors || form.style)}>
        <summary>{STRINGS.dashboard.filtersSummary}</summary>
        <div className="form-row form-row--3">
          <FormField as="select" label={STRINGS.dashboard.bedrooms} optional value={form.bedrooms} onChange={update('bedrooms')}>
            <option value="">{STRINGS.dashboard.any}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </FormField>
          <FormField as="select" label={STRINGS.dashboard.floors} optional value={form.floors} onChange={update('floors')}>
            <option value="">{STRINGS.dashboard.any}</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </FormField>
          <FormField as="select" label={STRINGS.dashboard.style} optional value={form.style} onChange={update('style')}>
            <option value="">{STRINGS.dashboard.any}</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FormField>
        </div>
      </details>

      <Button type="submit" block icon="search" loading={submitting} disabled={!canSubmit} disabledReason={STRINGS.dashboard.disabledReason}>
        {submitting ? STRINGS.dashboard.submitting : STRINGS.dashboard.submit}
      </Button>
      {!canSubmit && (
        <p className="text-sm text-muted" style={{ textAlign: 'center', margin: 0 }}>
          {STRINGS.dashboard.disabledReason}
        </p>
      )}
    </form>
  );
}
