/**
 * AuthLayout — centered-card chrome for unauthenticated screens (login now;
 * e.g. a future "reset password" screen would drop in with zero layout work).
 *
 * The sign-in card is a deliberate use of glass: a frosted panel floating over
 * the app's indigo background wash. It's a first impression with no dense data
 * behind it, so the effect adds warmth without costing legibility.
 */
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../../components/shared/ThemeToggle.jsx';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <ThemeToggle className="fixed right-4 top-4" />
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="Al Jazeera" className="h-10 w-10 rounded-xl shadow-glow" />
        <span className="text-lg font-semibold tracking-tight">Al Jazeera ERP</span>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-surface/70 p-6 shadow-xl backdrop-blur-xl animate-rise-in dark:border-white/10">
        <Outlet />
      </div>
      <p className="text-xs text-muted">Internal system, authorized staff only</p>
    </div>
  );
}
