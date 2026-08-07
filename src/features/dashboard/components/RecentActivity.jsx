/**
 * RecentActivity — the latest audit-log entries as a human-readable feed.
 * Audit actions are dot-namespaced verbs (e.g. 'quotation.create'); we map the
 * common ones to friendly phrases and fall back to the raw action.
 */
import Card from '../../../components/ui/Card.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { timeAgo } from '../../../lib/utils.js';

const ACTION_LABELS = {
  'auth.login.success': 'signed in',
  'auth.login.failed': 'failed to sign in',
  'auth.logout': 'signed out',
  'auth.refresh.reuse_detected': 'session reuse detected',
  'employee.create': 'added an employee',
  'employee.update': 'updated an employee',
  'employee.delete': 'deleted an employee',
  'client.create': 'added a client',
  'client.update': 'updated a client',
  'client.delete': 'deleted a client',
  'deployment.assign': 'deployed a worker',
  'deployment.transfer': 'transferred a worker',
  'deployment.end': 'ended a deployment',
  'attendance.mark': 'marked attendance',
  'document.create': 'uploaded a document',
  'document.version': 'added a document version',
  'document.delete': 'deleted a document',
  'quotation.create': 'created a quotation',
  'quotation.update': 'updated a quotation',
  'quotation.duplicate': 'duplicated a quotation',
  'quotation.delete': 'deleted a quotation',
};

function describe(action) {
  return ACTION_LABELS[action] ?? action.replace(/\./g, ' ');
}

export default function RecentActivity({ items }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Recent activity</h2>
      {items.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions across the system will appear here." />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a._id} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span className="flex-1">
                <span className="font-medium">{a.user?.name ?? 'System'}</span>{' '}
                <span className="text-muted">{describe(a.action)}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
