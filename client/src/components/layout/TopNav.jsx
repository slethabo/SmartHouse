import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { STRINGS } from '../../constants/strings';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';

export const NAV_ITEMS = [
  { to: '/', label: 'My projects', shortLabel: 'Projects', icon: 'house', end: true },
  { to: '/browse', label: 'Design library', shortLabel: 'Library', icon: 'grid' },
  { to: '/saved', label: 'Saved designs', shortLabel: 'Saved', icon: 'heart' },
  { to: '/admin', label: 'Manage demo', shortLabel: 'Manage', icon: 'sliders', adminOnly: true },
];

/** Persistent desktop navigation ("Where can I go?"). */
export function TopNav({ onOpenHelp }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <Link to="/" className="topnav__brand" aria-label={`${STRINGS.app.name} home`}>
          <Icon name="house" size={28} />
          <span>{STRINGS.app.name}</span>
        </Link>

        {user && (
          <nav className="topnav__links" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `topnav__link ${isActive || (item.to === '/' && location.pathname.startsWith('/projects')) ? 'is-active' : ''}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="topnav__spacer" />

        <div className="topnav__actions">
          <Button variant="ghost" size="sm" icon="help" onClick={onOpenHelp} aria-label={STRINGS.app.help}>
            <span className="visually-hidden">{STRINGS.app.help}</span>
            <span aria-hidden="true" className="topnav__help-text">
              {STRINGS.app.help}
            </span>
          </Button>
          <span className="badge badge--info">Local prototype</span>
        </div>
      </div>
    </header>
  );
}
