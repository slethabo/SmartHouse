import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../ui/Icon';
import { NAV_ITEMS } from './TopNav';

/** Mobile bottom tab bar (hidden on desktop by CSS). */
export function BottomTabs() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  if (!user) return null;
  const adminView = isAdmin && (location.pathname === '/admin' || location.pathname.startsWith('/admin/'));
  const items = NAV_ITEMS.filter((i) => i.adminOnly ? adminView : !adminView);
  return (
    <nav className="tabbar" aria-label="Main (mobile)">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `tabbar__item ${isActive || (item.to === '/' && location.pathname.startsWith('/projects')) || (item.to === '/browse' && location.pathname.startsWith('/plans/')) ? 'is-active' : ''}`}>
          <Icon name={item.icon} size={22} />
          <span>{item.shortLabel || item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
