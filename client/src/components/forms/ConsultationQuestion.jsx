import { useId } from 'react';
import { FormField } from '../ui/FormField';
import { questionImpact } from '../../utils/consultation';

const CHOICE_HINTS = {
  spaceLevel: { Compact: 'Smaller rooms and an efficient footprint.', Balanced: 'Comfortable everyday room sizes.', Generous: 'Larger bedrooms and shared living spaces.' },
  style: { Modern: 'Clean lines and a flat roof profile.', Traditional: 'A pitched roof and a warmer exterior palette.', Minimalist: 'A restrained palette and a flat roof profile.' },
  finish: { Basic: 'The lowest illustrative area rate.', Standard: 'The middle illustrative area rate.', Premium: 'The highest illustrative area rate.' },
  kitchen: { 'Open plan': 'Cooking, dining and living share one space.', Separate: 'A kitchen room linked to the living area.' },
};

export function ConsultationQuestion({ question: q, value, error, onChange, disabled = false }) {
  const id = useId();
  const impact = questionImpact(q);
  const choices = CHOICE_HINTS[q.key];
  const describedBy = [q.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const grouped = q.type === 'multiselect' || Boolean(choices);
  return <div className={`consultation-question ${q.type === 'textarea' || grouped ? 'field-span' : ''}`}>
    {grouped ? <fieldset className="field consultation-checkbox-field" disabled={disabled} aria-describedby={describedBy} aria-required={q.required || undefined} aria-invalid={error ? 'true' : undefined}>
      <legend className="field__label">{q.label}<span className="consultation-required">{q.required ? 'Required' : 'Optional'}</span></legend>
      {q.hint && <p className="field__hint" id={`${id}-hint`}>{q.hint}</p>}
      <div className={choices ? 'consultation-choice-grid' : 'consultation-checkboxes'}>
        {q.options.map((option) => {
          const selected = q.type === 'multiselect' ? (Array.isArray(value) && value.includes(option)) : value === option;
          return <label key={option} className={choices ? `consultation-choice ${selected ? 'is-selected' : ''}` : 'checkbox'}>
            <input type={choices ? 'radio' : 'checkbox'} name={id} value={option} checked={selected} onChange={(event) => {
              if (choices) onChange(option);
              else {
                const previous = Array.isArray(value) ? value : [];
                onChange(event.target.checked ? [...previous, option] : previous.filter((item) => item !== option));
              }
            }} />
            <span>{option}{choices && <small>{choices[option]}</small>}</span>
          </label>;
        })}
      </div>
      {error && <p className="field__error" role="alert" id={`${id}-error`}>{error}</p>}
    </fieldset> : <FormField label={q.label} hint={q.hint} error={error} required={q.required} optional={!q.required}
      disabled={disabled} as={q.options ? 'select' : q.type === 'textarea' ? 'textarea' : 'input'}
      type={q.type === 'number' ? 'number' : 'text'} min={q.min} max={q.max} maxLength={q.type === 'number' ? undefined : 2000}
      rows={3} step={q.key === 'width' || q.key === 'length' ? 'any' : 1} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      {q.options && <><option value="">Choose an option</option>{q.options.map((option) => <option key={option}>{option}</option>)}</>}
    </FormField>}
    <span className={`consultation-impact consultation-impact--${impact.kind}`}>{impact.label}</span>
  </div>;
}
