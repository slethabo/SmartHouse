import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { STRINGS } from '../../constants/strings';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { useState } from 'react';

export const NAV_ITEMS = [
  { to: '/', label: 'My projects', shortLabel: 'Projects', icon: 'house', end: true },
  { to: '/browse', label: 'Design library', shortLabel: 'Library', icon: 'grid' },
  { to: '/saved', label: 'Saved designs', shortLabel: 'Saved', icon: 'heart' },
  { to: '/admin', label: 'Manage demo', shortLabel: 'Manage', icon: 'sliders', adminOnly: true },
];

/** Persistent desktop navigation ("Where can I go?"). */
export function TopNav({ onOpenHelp }) {
  const { user, isAdmin, cloudMode, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const location = useLocation();
  const adminView = isAdmin && (location.pathname === '/admin' || location.pathname.startsWith('/admin/'));
  const items = NAV_ITEMS.filter((i) => i.adminOnly ? adminView : !adminView);
  async function signOut() {
    setLoggingOut(true); setLogoutError('');
    try { await logout(); }
    catch (e) { setLogoutError(e.message); }
    finally { setLoggingOut(false); }
  }

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <Link to="/" className="topnav__brand" aria-label={`${STRINGS.app.name} home`}>
          <span className="topnav__brand-mark"><Icon name="house" size={25} /></span>
          <span>{STRINGS.app.name}</span>
        </Link>

        {user && (
          <nav className="topnav__links" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `topnav__link ${isActive || (item.to === '/' && location.pathname.startsWith('/projects')) || (item.to === '/browse' && location.pathname.startsWith('/plans/')) ? 'is-active' : ''}`}>
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
          {user && <span className="topnav__identity" title={user.full_name || 'Your workspace'}><span className="topnav__avatar" aria-hidden="true">{(user.full_name || 'Your workspace').trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join('')}</span><span>{cloudMode ? (user.full_name?.split(' ')[0] || 'My account') : 'Demo workspace'}</span></span>}
          <span className="badge badge--info">{isAdmin ? adminView ? 'Admin view' : 'User view' : cloudMode ? 'Cloud projects' : 'Local prototype'}</span>
          {user && isAdmin && <Button to={adminView ? '/' : '/admin'} variant="secondary" size="sm" icon={adminView ? 'house' : 'sliders'}>{adminView ? 'Switch to User' : 'Switch to Admin'}</Button>}
          {cloudMode && (user ? <Button variant="secondary" size="sm" loading={loggingOut} onClick={signOut}>{STRINGS.app.logout}</Button> : <>{location.pathname !== '/login' && <Button to="/login" variant="ghost" size="sm">Log in</Button>}{location.pathname !== '/register' && <Button to="/register" size="sm">Create account</Button>}</>)}
        </div>
      </div>
      {logoutError && <div className="topnav__error" role="alert">{logoutError}</div>}
    </header>
  );
}
