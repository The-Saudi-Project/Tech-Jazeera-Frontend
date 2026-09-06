/**
 * Dashboard — the management overview. One query to /dashboard feeds headline
 * stats, a finance summary, workforce/quotation breakdowns, expiring-document
 * alerts, recent activity, and role-aware quick actions. Replaces the M3
 * placeholder.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import ProfitCard from '../components/ProfitCard.jsx';
import MyPendingActions from '../components/MyPendingActions.jsx';

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
  const { t } = useTranslation();
  // P2-M2: a personal display preference — not worth a server round trip, so
  // it lives in localStorage, per browser/device, like any other UI setting.
  const [thresholdDays, setThresholdDays] = useState(
    () => Number(localStorage.getItem(THRESHOLD_STORAGE_KEY)) || EXPIRY_WARNING_DAYS
  );
  function changeThreshold(days) {
    setThresholdDays(days);
    localStorage.setItem(THRESHOLD_STORAGE_KEY, String(days));
  }

  // P2-M8: which month the Profit section shows. Not persisted like the
  // threshold above — always opens on the current month, so nobody mistakes
  // an old month's figures for today's by forgetting they changed it last visit.
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', thresholdDays, month],
    queryFn: () => getDashboard(thresholdDays, month),
  });

  const firstName = user.name.split(' ')[0];
  const isCoordinator = user.role === 'Coordinator';
  // A Manager (the generic login a BDM-titled person holds) — company-wide
  // money figures (Pipeline, Profit, Recent Activity) are Admin/Executive
  // territory; see dashboard.service.js's hideFinance for the full reasoning.
  const isManager = user.role === 'Manager';
  const hideFinance = isCoordinator || isManager;

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
        <PageHeader title={t('staffDashboard.welcomeBack', { name: firstName })} />
        <EmptyState
          title={t('staffDashboard.couldNotLoad')}
          description={t('staffDashboard.checkConnectionRetry')}
          action={<Button variant="secondary" onClick={() => refetch()}>{t('common.retry')}</Button>}
        />
      </div>
    );
  }

  const { stats, finance, workforceByStatus, quotationsByStatus, expiringDocuments, recentActivity, myPendingActions } =
    data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t('staffDashboard.welcomeBack', { name: firstName })}
        description={isCoordinator ? t('staffDashboard.subtitleTeam') : t('staffDashboard.subtitleCompany')}
      />

      {/* Only ever non-zero for Admin/Manager/HR — a Coordinator's own
          submissions aren't counted here (see dashboard.service.js). Hidden
          entirely at zero so it never sits around as dead chrome. */}
      {stats.pendingClientApprovals > 0 && (
        <Link
          to="/coordinator-activity"
          className="flex items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm transition-colors hover:bg-warning/15"
        >
          <span className="font-medium text-text">
            {t('staffDashboard.clientsWaitingApproval', { count: stats.pendingClientApprovals })}
          </span>
          <span className="font-medium text-primary">{t('staffDashboard.review')}</span>
        </Link>
      )}

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t('staffDashboard.stats.deployedNow')} value={stats.deployedActive} accent="primary" hint={t('staffDashboard.stats.activePlacements')} to="/deployments" />
        <StatCard
          label={t('staffDashboard.stats.activeWorkers')}
          value={stats.activeWorkers}
          accent="success"
          hint={t('staffDashboard.stats.workersHint', { total: stats.totalWorkers, onLeave: stats.onLeave })}
          to="/employees"
        />
        <StatCard label={isCoordinator ? t('staffDashboard.stats.yourClients') : t('staffDashboard.stats.activeClients')} value={stats.activeClients} to="/clients" />
        {isCoordinator ? (
          <StatCard label={t('staffDashboard.stats.expiringSoon')} value={stats.expiringSoon} accent="warning" hint={t('staffDashboard.stats.documentsNeedingAttention')} />
        ) : (
          <StatCard
            label={t('staffDashboard.stats.pendingQuotations')}
            value={stats.pendingQuotations}
            accent="warning"
            hint={isManager ? t('staffDashboard.stats.yourDraftsAwaiting') : t('staffDashboard.stats.draftAwaiting')}
            to="/quotations"
          />
        )}
        <StatCard
          label={t('staffDashboard.stats.markedToday')}
          value={stats.markedToday}
          hint={t('staffDashboard.stats.ofActiveWorkers', { count: stats.activeWorkers })}
          to="/attendance/summary"
        />
      </div>

      <MyPendingActions items={myPendingActions} />

      {/* Finance summary — Admin/Executive/HR/Accounts only. Neither a
          Coordinator nor a Manager (BDM) sees salary or revenue figures — see
          dashboard.service.js's hideFinance. */}
      {!hideFinance && (
        <>
          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffDashboard.pipeline.title')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FinanceItem label={t('staffDashboard.pipeline.approvedRevenue')} value={finance.approvedRevenue} accent="text-success" hint={t('staffDashboard.pipeline.approvedQuotations')} />
              <FinanceItem label={t('staffDashboard.pipeline.pipeline')} value={finance.pendingRevenue} hint={t('staffDashboard.pipeline.draftQuotations')} />
              <FinanceItem label={t('staffDashboard.pipeline.monthlyPayroll')} value={finance.monthlyPayroll} hint={t('staffDashboard.pipeline.workforceSalariesRunRate')} />
            </div>
          </Card>

          {/* P2-M8: real profit for a selected month — Revenue − Payroll −
              Expenses, from Invoices/finalized Payroll/Expenses. */}
          <ProfitCard profit={finance.profit} month={month} onMonthChange={setMonth} />
        </>
      )}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdown
          title={isCoordinator ? t('staffDashboard.yourTeamByStatus') : t('staffDashboard.workforceByStatus')}
          data={workforceByStatus}
          colors={{ Active: 'success', 'On Leave': 'warning', Exited: 'default' }}
        />
        {!isCoordinator && (
          <StatusBreakdown
            title={t('staffDashboard.quotationsByStatus')}
            data={quotationsByStatus}
            colors={{ Draft: 'default', Approved: 'success', Rejected: 'danger' }}
          />
        )}
      </div>

      {/* Alerts + activity — Recent Activity is Admin/Executive/HR/Accounts
          only, same visibility line as Finance above (see dashboard.service.js). */}
      {isCoordinator ? (
        <ExpiringDocuments
          items={expiringDocuments}
          thresholdDays={thresholdDays}
          onThresholdChange={changeThreshold}
          scopedToTeam
        />
      ) : isManager ? (
        <ExpiringDocuments items={expiringDocuments} thresholdDays={thresholdDays} onThresholdChange={changeThreshold} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ExpiringDocuments items={expiringDocuments} thresholdDays={thresholdDays} onThresholdChange={changeThreshold} />
          <RecentActivity items={recentActivity} />
        </div>
      )}

      <QuickActions />
    </div>
  );
}
