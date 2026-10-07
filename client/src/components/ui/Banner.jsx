import { Icon } from './Icon';
import { Button } from './Button';
import { STRINGS } from '../../constants/strings';

/** Inline message (error / info / success / warning) with optional retry. */
export function Banner({ type = 'info', children, onRetry }) {
  const icon = type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info';
  return (
    <div className={`banner banner--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} />
      <div style={{ flex: 1 }}>{children}</div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
          {STRINGS.app.retry}
        </Button>
      )}
    </div>
  );
}
