import { Link } from 'react-router-dom';
import { Spinner } from './Spinner';
import { Icon } from './Icon';

/**
 * The one button used everywhere (consistency rule).
 * - `disabledReason` renders the reason as a tooltip/title and aria-description
 *   so disabled buttons always explain themselves.
 * - `loading` shows a spinner and blocks double submits.
 */
export function Button({
  children,
  variant = 'primary',
  size,
  block,
  icon,
  loading = false,
  disabled = false,
  disabledReason,
  to,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, size ? `btn--${size}` : '', block ? 'btn--block' : '', className]
    .filter(Boolean)
    .join(' ');
  const isDisabled = disabled || loading;
  const content = (
    <>
      {loading ? <Spinner size="sm" /> : icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </>
  );

  if (to && !isDisabled) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      title={isDisabled && disabledReason ? disabledReason : rest.title}
      aria-description={isDisabled && disabledReason ? disabledReason : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
