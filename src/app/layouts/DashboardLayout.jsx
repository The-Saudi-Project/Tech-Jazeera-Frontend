/**
 * DashboardLayout — the app shell every authenticated screen lives inside.
 *
 * Responsive strategy:
 *   - ≥1024px (lg): fixed 256px sidebar, content beside it.
 *   - <1024px: sidebar becomes an overlay drawer opened by the topbar
 *     hamburger; a backdrop click or any navigation closes it.
 *
 * The sidebar itself just renders Dashboard + one link per NAV_GROUPS entry
 * (navConfig.js) — each group link goes to a hub page listing that group's
 * real pages. This used to be a flat list of all 22 routes directly; grouped
 * because that had grown too long for the sidebar's fixed-height column,
 * which had no scroll of its own (items past the fold were unreachable, not
 * just visually cluttered — a real bug, independent of the regrouping).
 */
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import ChangePasswordModal from '../../features/auth/components/ChangePasswordModal.jsx';
import AvatarUploadModal from '../../features/auth/components/AvatarUploadModal.jsx';
import ThemeToggle from '../../components/shared/ThemeToggle.jsx';
import NotificationBell from '../../components/shared/NotificationBell.jsx';
import { cn } from '../../lib/utils.js';
import { DASHBOARD_ITEM, NAV_GROUPS, EXECUTIVE_NAV_ITEMS } from '../navConfig.js';

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  // Executive gets its own short, explicit nav — see EXECUTIVE_NAV_ITEMS's
  // doc comment for why this can't just be another `roles`-filtered slice
  // of the grouped nav below (every unguarded group item, which is most of
  // them, would otherwise show up for free).
  let items;
  if (user.role === 'Executive') {
    items = [DASHBOARD_ITEM, ...EXECUTIVE_NAV_ITEMS];
  } else {
    // A group is shown if the user can reach at least one item inside it —
    // otherwise it'd be a link to an empty hub page. Individual role-gating
    // (e.g. the Admin-only Timesheet Processor) still applies on the hub page
    // itself, same check as before, just applied at two levels now.
    const groups = NAV_GROUPS.filter((group) =>
      group.items.some((item) => !item.roles || item.roles.includes(user.role))
    );
    items = [DASHBOARD_ITEM, ...groups];
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-surface">
      {/* Same bg-surface/70 + backdrop-blur-xl treatment as the topbar
          (below) — both are h-16 with a border-b, but leaving one solid and
          one blurred/translucent made the two independent border lines read
          as misaligned at the seam even though they're pixel-identical. */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border bg-surface/70 px-5 backdrop-blur-xl">
        <img src="/logo.png" alt="Al Jazeera" className="h-9 w-9 rounded-xl shadow-glow" />
        <span className="font-semibold tracking-tight">Al Jazeera ERP</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ease-out-expo',
                isActive
                  ? 'bg-primary/10 font-semibold text-primary shadow-xs ring-1 ring-inset ring-primary/10'
                  : 'font-medium text-muted hover:bg-border/40 hover:text-text'
              )
            }
          >
            <NavIcon d={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-[11px] leading-relaxed text-muted/70">
          Manpower supply &amp; trading
          <br />
          Operating system
        </p>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Static sidebar — desktop only */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Drawer sidebar — mobile only */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-muted hover:bg-border/40 hover:text-text lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted">{user.role}</p>
            </div>
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => setAvatarModalOpen(true)}
              title="Update profile photo"
              aria-label="Update profile photo"
              className="rounded-full"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-inset ring-primary/20"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
            <button
              onClick={() => setChangePasswordOpen(true)}
              title="Change password"
              aria-label="Change password"
              className="rounded-lg p-2 text-muted hover:bg-border/40 hover:text-text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="rounded-lg p-2 text-muted hover:bg-border/40 hover:text-danger"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
      <AvatarUploadModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} />
    </div>
  );
}
