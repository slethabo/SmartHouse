import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../ui/Icon';
import { NAV_ITEMS } from './TopNav';

/** Mobile bottom tab bar (hidden on desktop by CSS). */
export function BottomTabs() {
  const { user, isAdmin } = useAuth();
  if (!user) return null;
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  return (
    <nav className="tabbar" aria-label="Main (mobile)">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
          <Icon name={item.icon} size={22} />
          <span>{item.label.split(' ')[0] === 'Find' ? 'Find' : item.label.split(' ')[0]}</span>
        </NavLink>
      ))}
    </nav>
  );
}
