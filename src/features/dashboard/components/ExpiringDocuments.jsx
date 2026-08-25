/**
 * ExpiringDocuments — compliance panel: identity documents and uploaded files
 * expiring within 30 days (or already expired), soonest first. Employee items
 * link to the worker's profile.
 */
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { formatDate } from '../../../lib/utils.js';

function ExpiryTag({ daysLeft }) {
  if (daysLeft < 0) return <Badge variant="danger">Expired</Badge>;
  return <Badge variant="warning">{daysLeft}d left</Badge>;
}

/**
 * `thresholdDays`/`onThresholdChange` (P2-M2): lets a viewer (a Coordinator
 * watching their own team especially) widen or narrow the alert window
 * instead of being stuck with a fixed 30 days. Persisted by the parent
 * (DashboardPage) to localStorage — it's a personal display preference, not
 * something worth a server round trip to store.
 */
export default function ExpiringDocuments({ items, thresholdDays, onThresholdChange, scopedToTeam }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Expiring documents{scopedToTeam ? ' · your team' : ''}
        </h2>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Alert within
          <input
            type="number"
            min="1"
            max="365"
            value={thresholdDays}
            onChange={(e) => onThresholdChange(Number(e.target.value) || 30)}
            className="h-7 w-14 rounded-md border border-border bg-surface px-1.5 text-center text-xs text-text"
            aria-label="Alert window in days"
          />
          days
        </label>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing expiring" description={`No documents expire in the next ${thresholdDays} days.`} />
      ) : (
        <div className="divide-y divide-border">
          {items.map((item, i) => {
            const label = `${item.label}${item.source === 'Employee' ? '' : ` · ${item.ref}`}`;
            // Employee items link to the worker's profile; uploaded documents
            // link to the Document Center (no per-file page).
            const to = item.source === 'Employee' ? `/employees/${item.ownerId}` : '/documents';
            return (
              <Link
                key={i}
                to={to}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-bg/60"
              >
                <div>
                  <p className="font-medium">{item.ownerName}</p>
                  <p className="text-xs text-muted">
                    {label} · expires {formatDate(item.expiry)}
                  </p>
                </div>
                <ExpiryTag daysLeft={item.daysLeft} />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
