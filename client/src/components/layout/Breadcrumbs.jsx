import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants/strings';

/**
 * "Where am I?" — breadcrumb trail. `items` = [{ label, to? }], last is current.
 */
export function Breadcrumbs({ items = [] }) {
  const trail = [{ label: STRINGS.breadcrumbs.home, to: '/' }, ...items];
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${item.label}-${i}`}>
              {isLast || !item.to ? (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
