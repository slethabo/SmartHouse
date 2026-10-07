import { Icon } from './Icon';

/**
 * Clear empty / no-results state with optional suggestions and actions.
 */
export function EmptyState({ icon = 'search', title, body, suggestions, children }) {
  return (
    <div className="empty-state" role="status">
      <Icon name={icon} size={56} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {suggestions && suggestions.length > 0 && (
        <ul>
          {suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  );
}
