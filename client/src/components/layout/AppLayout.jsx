import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomTabs } from './BottomTabs';
import { HelpDrawer } from './HelpDrawer';
import { STRINGS } from '../../constants/strings';

/** Shell shared by every page: nav on top, content, tab bar on mobile. */
export function AppLayout() {
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {STRINGS.app.skipToContent}
      </a>
      <TopNav onOpenHelp={openHelp} />
      <main id="main" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
      <BottomTabs />
      <HelpDrawer open={helpOpen} onClose={closeHelp} />
    </div>
  );
}
