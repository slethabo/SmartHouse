import { useState } from 'react';
import { STRINGS } from '../../constants/strings';
import { validatePlanForm } from '../../utils/validation';
import { FormField } from '../ui/FormField';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';

export const EMPTY_PLAN = {
  name: '',
  description: '',
  bedrooms: 3,
  bathrooms: 2,
  floors: 1,
  floor_area_m2: '',
  footprint_m2: '',
  min_plot_size_m2: '',
  style: '',
  image_url: '',
  is_active: true,
};

/**
 * Create / edit form for a house plan (admin). Calls onSubmit(values).
 */
export function PlanForm({ initialValues = EMPTY_PLAN, onSubmit, onCancel, submitting = false, serverError = '', serverFields = {}, onDirtyChange }) {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(initialValues.id);
  const s = STRINGS.admin.plans;

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    onDirtyChange?.(true);
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validatePlanForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      style: form.style.trim(),
      image_url: form.image_url.trim(),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      floors: Number(form.floors),
      floor_area_m2: Number(form.floor_area_m2),
      footprint_m2: Number(form.footprint_m2),
      min_plot_size_m2: Number(form.min_plot_size_m2),
      is_active: Boolean(form.is_active),
    });
  };

  const err = (k) => errors[k] || serverFields[k];
  const area = STRINGS.app.units.area;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {serverError && <Banner type="error">{serverError}</Banner>}
      <div className="form-row form-row--2">
        <FormField label={s.name} value={form.name} onChange={update('name')} error={err('name')} required maxLength={120} />
        <FormField label={s.style} value={form.style} onChange={update('style')} error={err('style')} required maxLength={60} placeholder="e.g. Modern" />
      </div>
      <FormField as="textarea" label={s.description} optional value={form.description} onChange={update('description')} error={err('description')} maxLength={2000} />
      <div className="form-row form-row--3">
        <FormField label={s.bedrooms} type="number" min="0" max="20" step="1" value={form.bedrooms} onChange={update('bedrooms')} error={err('bedrooms')} required />
        <FormField label={s.bathrooms} type="number" min="0" max="20" step="0.5" value={form.bathrooms} onChange={update('bathrooms')} error={err('bathrooms')} required />
        <FormField label={s.floors} type="number" min="1" max="5" step="1" value={form.floors} onChange={update('floors')} error={err('floors')} required />
      </div>
      <div className="form-row form-row--3">
        <FormField label={s.floorArea} type="number" min="1" step="0.5" suffix={area} value={form.floor_area_m2} onChange={update('floor_area_m2')} error={err('floor_area_m2')} required />
        <FormField label={s.footprint} type="number" min="1" step="0.5" suffix={area} value={form.footprint_m2} onChange={update('footprint_m2')} error={err('footprint_m2')} required />
        <FormField label={s.minPlot} type="number" min="1" step="1" suffix={area} value={form.min_plot_size_m2} onChange={update('min_plot_size_m2')} error={err('min_plot_size_m2')} required />
      </div>
      <FormField label={s.imageUrl} optional type="url" hint={s.imageHint} value={form.image_url} onChange={update('image_url')} error={err('image_url')} placeholder="https://" />
      <div className="field">
        <label className="checkbox">
          <input type="checkbox" checked={Boolean(form.is_active)} onChange={update('is_active')} />
          <span>{s.active}</span>
        </label>
        <div className="field__hint">{s.activeHint}</div>
      </div>
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {STRINGS.app.cancel}
        </Button>
        <Button type="submit" loading={submitting} icon={isEdit ? 'check' : 'plus'}>
          {isEdit ? s.update : s.create}
        </Button>
      </div>
    </form>
  );
}
