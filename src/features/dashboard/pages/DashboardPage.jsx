/**
 * Dashboard — the management overview. One query to /dashboard feeds headline
 * stats, a finance summary, workforce/quotation breakdowns, expiring-document
 * alerts, recent activity, and role-aware quick actions. Replaces the M3
 * placeholder.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../dashboard.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { formatMoney } from '../../../lib/utils.js';
import { EXPIRY_WARNING_DAYS } from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Button from '../../../components/ui/Button.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBreakdown from '../components/StatusBreakdown.jsx';
import ExpiringDocuments from '../components/ExpiringDocuments.jsx';
import RecentActivity from '../components/RecentActivity.jsx';
import QuickActions from '../components/QuickActions.jsx';

/** A labelled money figure for the finance card. */
function FinanceItem({ label, value, hint, accent }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ?? 'text-text'}`}>{formatMoney(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const THRESHOLD_STORAGE_KEY = 'aj-erp:dashboard-alert-threshold';

export default function DashboardPage() {
  const { user } = useAuth();
  // P2-M2: a personal display preference — not worth a server round trip, so
  // it lives in localStorage, per browser/device, like any other UI setting.
  const [thresholdDays, setThresholdDays] = useState(
    () => Number(localStorage.getItem(THRESHOLD_STORAGE_KEY)) || EXPIRY_WARNING_DAYS
  );
  function changeThreshold(days) {
    setThresholdDays(days);
    localStorage.setItem(THRESHOLD_STORAGE_KEY, String(days));
  }

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', thresholdDays],
    queryFn: () => getDashboard(thresholdDays),
  });

  const firstName = user.name.split(' ')[0];

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title={`Welcome back, ${firstName}`} />
        <EmptyState
          title="Could not load the dashboard"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      </div>
    );
  }

  const { stats, finance, workforceByStatus, quotationsByStatus, expiringDocuments, recentActivity } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={`Welcome back, ${firstName}`} description="Here's what's happening across the company." />

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Deployed now" value={stats.deployedActive} accent="primary" hint="Active placements" to="/deployments" />
        <StatCard label="Active workers" value={stats.activeWorkers} accent="success" hint={`${stats.totalWorkers} total · ${stats.onLeave} on leave`} to="/employees" />
        <StatCard label="Active clients" value={stats.activeClients} to="/clients" />
        <StatCard label="Pending quotations" value={stats.pendingQuotations} accent="warning" hint="Draft, awaiting approval" to="/quotations" />
      </div>

      {/* Finance summary */}
      <Card>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Finance</h2>
          <span className="text-xs text-muted">Profit needs cost data (a later phase)</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FinanceItem label="Approved revenue" value={finance.approvedRevenue} accent="text-success" hint="Approved quotations" />
          <FinanceItem label="Pipeline" value={finance.pendingRevenue} hint="Draft quotations" />
          <FinanceItem label="Monthly payroll" value={finance.monthlyPayroll} hint="Active workforce salaries" />
        </div>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdown
          title="Workforce by status"
          data={workforceByStatus}
          colors={{ Active: 'success', 'On Leave': 'warning', Exited: 'default' }}
        />
        <StatusBreakdown
          title="Quotations by status"
          data={quotationsByStatus}
          colors={{ Draft: 'default', Approved: 'success', Rejected: 'danger' }}
        />
      </div>

      {/* Alerts + activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpiringDocuments
          items={expiringDocuments}
          thresholdDays={thresholdDays}
          onThresholdChange={changeThreshold}
          scopedToTeam={user.role === 'Coordinator'}
        />
        <RecentActivity items={recentActivity} />
      </div>

      <QuickActions />
    </div>
  );
}
