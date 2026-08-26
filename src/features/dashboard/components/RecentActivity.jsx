/**
 * RecentActivity — the latest audit-log entries as a human-readable feed.
 * The full, filterable, paginated trail lives on the Security Log page
 * (Admin-only) — this widget is just the newest 8, for a glance.
 * Admin/Manager/HR/Accounts only — a Coordinator's dashboard never renders
 * this (see DashboardPage.jsx / dashboard.service.js).
 */
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { timeAgo } from '../../../lib/utils.js';
import { describeAction } from '../../../lib/auditActions.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function RecentActivity({ items }) {
  const { user } = useAuth();
  // Defensive: every current caller always passes an array, but this widget
  // shouldn't crash the page if a future caller ever passes null/undefined.
  const safeItems = items ?? [];
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Recent activity</h2>
        {user.role === 'Admin' && (
          <Link to="/security-log" className="text-xs font-medium text-primary hover:underline">
            View full log
          </Link>
        )}
      </div>
      {safeItems.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions across the system will appear here." />
      ) : (
        <ul className="space-y-3">
          {safeItems.map((a) => (
            <li key={a._id} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span className="flex-1">
                <span className="font-medium">{a.user?.name ?? 'System'}</span>{' '}
                <span className="text-muted">{describeAction(a.action)}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
