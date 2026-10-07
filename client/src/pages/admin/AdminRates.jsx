import { useEffect, useState } from 'react';
import { STRINGS } from '../../constants/strings';
import { adminService } from '../../services/admin.service';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { FormField } from '../../components/ui/FormField';
import { LoadingBlock } from '../../components/ui/Spinner';
import { formatDate, formatRand, parseNumberInput } from '../../utils/format';

export function AdminRates({ onChanged }) {
  const s = STRINGS.admin.rates;
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(({ signal }) => adminService.listRates({ signal }), []);
  const items = data?.items || [];
  const [drafts, setDrafts] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    const next = {};
    for (const r of items) next[r.finish_level] = String(r.rate_per_m2);
    setDrafts(next);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (rate) => {
    const value = parseNumberInput(drafts[rate.finish_level]);
    if (!Number.isFinite(value) || value <= 0) {
      setErrors((e) => ({ ...e, [rate.finish_level]: 'Rate per m² must be greater than R0.' }));
      return;
    }
    setBusy(rate.finish_level);
    setErrors((e) => ({ ...e, [rate.finish_level]: '' }));
    try {
      const { data: updated, message } = await adminService.updateRate(rate.finish_level, value);
      setData((d) => ({ items: d.items.map((r) => (r.finish_level === updated.finish_level ? updated : r)) }));
      toast.success(message);
      onChanged?.();
    } catch (err) {
      setErrors((e) => ({ ...e, [rate.finish_level]: err.message }));
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="admin-rates-title">
      <h2 id="admin-rates-title">{STRINGS.admin.tabs.rates}</h2>
      <p className="text-muted">{s.intro}</p>
      {error && (
        <Banner type="error" onRetry={reload}>
          {error.message}
        </Banner>
      )}
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="grid">
          {items.map((rate) => {
            const unchanged = parseNumberInput(drafts[rate.finish_level]) === Number(rate.rate_per_m2);
            return (
              <form
                key={rate.finish_level}
                className="rate-row"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  save(rate);
                }}
              >
                <div>
                  <div className="rate-row__name">{STRINGS.plan.finish[rate.finish_level]}</div>
                  <div className="rate-row__meta">
                    {formatRand(rate.rate_per_m2)} · {s.updated} {formatDate(rate.updated_at)}
                  </div>
                </div>
                <FormField
                  label={s.rate}
                  type="number"
                  min="1"
                  step="any"
                  prefix={STRINGS.app.units.currency}
                  value={drafts[rate.finish_level] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [rate.finish_level]: e.target.value }))}
                  error={errors[rate.finish_level]}
                />
                <Button type="submit" loading={busy === rate.finish_level} disabled={unchanged} disabledReason={s.unchanged} icon="check">
                  {s.save}
                </Button>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}
