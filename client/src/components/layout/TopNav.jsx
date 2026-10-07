import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STRINGS } from '../../constants/strings';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';

export const NAV_ITEMS = [
  { to: '/', label: STRINGS.nav.home, icon: 'home', end: true },
  { to: '/recommendations', label: STRINGS.nav.recommendations, icon: 'sliders' },
  { to: '/browse', label: STRINGS.nav.browse, icon: 'grid' },
  { to: '/saved', label: STRINGS.nav.saved, icon: 'heart' },
  { to: '/admin', label: STRINGS.nav.admin, icon: 'shield', adminOnly: true },
];

/** Persistent desktop navigation ("Where can I go?"). */
export function TopNav({ onOpenHelp }) {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  const handleLogout = async () => {
    await logout();
    toast.info(STRINGS.auth.loggedOut);
    navigate('/login');
  };

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
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `topnav__link ${isActive ? 'is-active' : ''}`}>
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
          {user ? (
            <>
              <span className="topnav__user">
                <Icon name="user" size={18} />
                <span>
                  {user.full_name.split(' ')[0]}
                  {isAdmin && <span className="badge badge--info" style={{ marginLeft: 6 }}>admin</span>}
                </span>
              </span>
              <Button variant="secondary" size="sm" icon="logout" onClick={handleLogout}>
                {STRINGS.app.logout}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" to="/login">
                {STRINGS.nav.login}
              </Button>
              <Button variant="primary" size="sm" to="/register">
                {STRINGS.nav.register}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
