import { useId, useState } from 'react';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { STRINGS } from '../../constants/strings';

/**
 * Labelled input with units, hint, tooltip and error message wired to ARIA.
 */
export function FormField({
  label,
  hint,
  error,
  tooltip,
  prefix,
  suffix,
  optional = false,
  as = 'input',
  children,
  className = '',
  ...inputProps
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const controlClass = [
    as === 'select' ? 'select' : as === 'textarea' ? 'textarea' : 'input',
    prefix ? 'input--prefixed' : '',
    suffix ? 'input--suffixed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shared = {
    id,
    className: controlClass,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    ...inputProps,
  };

  let control;
  if (as === 'select') control = <select {...shared}>{children}</select>;
  else if (as === 'textarea') control = <textarea {...shared} />;
  else control = <input {...shared} />;

  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="text-muted" style={{ fontWeight: 400 }}>({STRINGS.app.optional})</span>}
        {tooltip && <Tooltip text={tooltip} label={`${label}: more information`} />}
      </label>
      <div className="field__control">
        {prefix && <span className="field__prefix" aria-hidden="true">{prefix}</span>}
        {control}
        {suffix && <span className="field__suffix" aria-hidden="true">{suffix}</span>}
      </div>
      {hint && !error && (
        <div className="field__hint" id={hintId}>
          {hint}
        </div>
      )}
      {error && (
        <div className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={14} /> {error}
        </div>
      )}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label, error, hint, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="input input--suffixed"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          autoComplete={inputProps.autoComplete || 'current-password'}
          {...inputProps}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? STRINGS.auth.hidePassword : STRINGS.auth.showPassword}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      {hint && !error && (
        <div className="field__hint" id={hintId}>
          {hint}
        </div>
      )}
      {error && (
        <div className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={14} /> {error}
        </div>
      )}
    </div>
  );
}
