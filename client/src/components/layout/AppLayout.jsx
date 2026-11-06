import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomTabs } from './BottomTabs';
import { HelpDrawer } from './HelpDrawer';
import { STRINGS } from '../../constants/strings';
import { useAuth } from '../../context/AuthContext';
import { LoadingBlock } from '../ui/Spinner';

/** Shell shared by every page: nav on top, content, tab bar on mobile. */
export function AppLayout() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  return (
    <div className={`app-shell ${user ? 'app-shell--signed-in' : 'app-shell--guest'}`}>
      <a href="#main" className="skip-link">
        {STRINGS.app.skipToContent}
      </a>
      <TopNav onOpenHelp={openHelp} />
      <main id="main" ref={mainRef} className="app-main" tabIndex={-1}>
        <Suspense fallback={<LoadingBlock label="Opening your workspace..." />}><Outlet /></Suspense>
      </main>
      <footer className="app-footer"><div><Link to="/" className="app-footer__brand">Smart House</Link><span>Thoughtful spaces. Your own story.</span></div><div><Link to="/browse">Explore the library</Link><button type="button" onClick={openHelp}>How it works</button><span>Concepts for planning and professional review.</span></div></footer>
      <BottomTabs />
      <HelpDrawer open={helpOpen} onClose={closeHelp} />
    </div>
  );
}
