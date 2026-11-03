import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSupabase, usesSupabase } from '../services/supabaseClient';
import { authService } from '../services/auth.service';
import { Banner } from '../components/ui/Banner';
import { LoadingBlock } from '../components/ui/Spinner';

const localUser = { full_name: 'Local demo workspace', role: 'admin' };
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, ready: false, cloudMode: false, anonymousWorkspace: false });
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const version = useRef(0);
  const currentUserId = useRef(null);
  useEffect(() => {
    let active = true;
    let subscription;
    let timer;
    setError('');
    setState((current) => ({ ...current, ready: false }));
    async function hydrate(session) {
      const ticket = ++version.current;
      if (!session || session.user.is_anonymous) {
        currentUserId.current = null;
        if (active) setState({ user: null, ready: true, cloudMode: true, anonymousWorkspace: Boolean(session?.user.is_anonymous) });
        return;
      }
      setState((current) => ({ ...current, user: null, ready: false, cloudMode: true }));
      try {
        const user = await authService.identity(session);
        if (active && ticket === version.current) {
          currentUserId.current = user.id;
          setState({ user, ready: true, cloudMode: true, anonymousWorkspace: false });
        }
      } catch (e) { if (active && ticket === version.current) setError(e.message); }
    }
    (async () => {
      if (!usesSupabase()) {
        if (active) setState({ user: localUser, ready: true, cloudMode: false, anonymousWorkspace: false });
        return;
      }
      const client = getSupabase();
      const initialVersion = version.current;
      subscription = client.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        // Refreshing a token or focusing a tab must not remount an unsaved consultation.
        if (session?.user.id === currentUserId.current && ['SIGNED_IN', 'TOKEN_REFRESHED'].includes(_event)) return;
        // Defer SDK queries until after the auth callback releases its lock.
        clearTimeout(timer);
        ++version.current;
        setError('');
        if (!session || session.user.is_anonymous) {
          currentUserId.current = null;
          if (active) setState({ user: null, ready: true, cloudMode: true, anonymousWorkspace: Boolean(session?.user.is_anonymous) });
        } else {
          if (active) setState((current) => ({ ...current, user: null, ready: false, cloudMode: true }));
          timer = setTimeout(() => { if (active) hydrate(session); }, 0);
        }
      }).data.subscription;
      const session = await authService.restore();
      if (active && version.current === initialVersion) await hydrate(session);
    })().catch((e) => { if (active) setError(e.message); });
    return () => { active = false; clearTimeout(timer); subscription?.unsubscribe(); };
  }, [attempt]);
  async function login(payload) { await authService.login(payload); return 'You are logged in.'; }
  async function register(payload) { return authService.register(payload); }
  async function logout() {
    await authService.logout();
    ++version.current;
    currentUserId.current = null;
    setState((current) => ({ ...current, user: null, ready: true }));
  }
  if (error) return <main className="studio studio-panel"><h1>Open your account</h1><Banner type="error" onRetry={() => setAttempt((n) => n + 1)}>{error}</Banner></main>;
  if (!state.ready) return <LoadingBlock label="Opening your account…" />;
  return <AuthContext.Provider value={{ ...state, prototypeMode: !state.cloudMode, isAdmin: state.user?.role === 'admin', login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Account state must be read inside AuthProvider.');
  return context;
}
