/**
 * AuthContext — the client's single source of truth for "who is logged in".
 *
 * Session restore on page load: the access token lives only in memory, so a
 * reload wipes it. On mount we make ONE silent /auth/refresh call — the
 * httpOnly cookie (which survives reloads) either mints a fresh session or
 * fails, and `status` resolves to 'authed' or 'guest'. Route guards render a
 * spinner during the in-between 'loading' state instead of bouncing the user
 * to /login prematurely.
 *
 * The axios layer reports unrecoverable 401s via subscribeUnauthorized, so
 * an expired session anywhere in the app drops cleanly to the login screen.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { setAccessToken, subscribeUnauthorized } from '../../lib/axios.js';
import { loginRequest, refreshRequest, logoutRequest } from './auth.api.js';
import { useToast } from '../../components/ui/Toast.jsx';

const AuthContext = createContext(null);

/**
 * P2-M1: the web client is staff-only for now. A Worker's login authenticates
 * server-side (they get real tokens — that's how the ESS portal will work in
 * P2-M2), but this SPA has no worker screens yet, so we refuse the session
 * here rather than drop them onto admin pages that 403. Thrown at login and
 * enforced again on session-restore; LoginPage reads `.userMessage`.
 */
export const WORKER_WEB_MESSAGE =
  "Worker accounts don't have web access yet. Please contact your administrator.";

function blockedWorkerError() {
  return Object.assign(new Error('worker-web-blocked'), { userMessage: WORKER_WEB_MESSAGE });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authed' | 'guest'
  const toast = useToast();

  useEffect(() => {
    // One-shot session restore. A 401 here just means "not logged in".
    refreshRequest()
      .then(({ user: restoredUser, accessToken }) => {
        // A Worker may hold a valid refresh cookie but has no web portal yet
        // (P2-M1). Don't restore the session — drop the server session too so
        // a reload doesn't loop back here.
        if (restoredUser.role === 'Worker') {
          logoutRequest().catch(() => {});
          setStatus('guest');
          return;
        }
        setAccessToken(accessToken);
        setUser(restoredUser);
        setStatus('authed');
      })
      .catch(() => setStatus('guest'));

    // Axios tells us when a session dies mid-use (an API call 401'd and the
    // re-refresh failed). This only ever fires for a previously-authed user
    // — cold visitors' bootstrap failures don't go through this path — so
    // the toast can't greet a first-time visitor with "session expired".
    return subscribeUnauthorized(() => {
      toast.error('Your session has expired. Please sign in again.');
      setUser(null);
      setStatus('guest');
    });
  }, [toast]);

  // Auto-logout after 12 minutes of inactivity
  useEffect(() => {
    if (status !== 'authed') return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Trigger auto-logout but use the state directly to avoid cyclic dependencies in the hook
        logoutRequest().catch(() => {});
        setAccessToken(null);
        setUser(null);
        setStatus('guest');
        toast.info('You have been logged out due to inactivity.');
      }, 12 * 60 * 1000); // 12 minutes
    };

    // Events that indicate the user is active
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    
    resetTimer(); // Start the timer

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [status, toast]);

  const login = useCallback(async (credentials) => {
    const { user: loggedInUser, accessToken } = await loginRequest(credentials);
    if (loggedInUser.role === 'Worker') {
      // Undo the server session we just created, then surface a clear message.
      await logoutRequest().catch(() => {});
      throw blockedWorkerError();
    }
    setAccessToken(accessToken);
    setUser(loggedInUser);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    // Server call first (kills the session row); local state clears even if
    // the network call fails — the user asked to leave, so we leave.
    await logoutRequest().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
