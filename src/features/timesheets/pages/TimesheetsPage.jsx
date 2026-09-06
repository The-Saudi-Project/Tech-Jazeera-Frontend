/**
 * TimesheetsPage — the supervisor review queue for weekly timesheets
 * (P2-M3b): approve/reject individually, or select several Submitted weeks
 * and bulk-approve (the plan's "bulk approve a week"). Three tabs — see
 * docs/TABS-notes.md for why tabs replaced the original vertical stack.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTimesheets,
  submitTimesheet,
  decideTimesheet,
  bulkApproveTimesheets,
  generateMonthlyReport,
} from '../timesheets.api.js';
import { listEmployees } from '../../employees/employees.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatHours } from '../../../lib/utils.js';
import { TIMESHEET_STATUSES, TIMESHEET_STATUS_VARIANT } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ApprovalTrailView from '../../../components/shared/ApprovalTrailView.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Tabs, { useTabParam } from '../../../components/ui/Tabs.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

/**
 * MonthlyReportPanel — a full day-by-day monthly report built from real
 * Attendance records (phone self-punch or staff-marked), in the same
 * formatted style as the Timesheet Processor's export. Shown to every
 * staff viewer (like the Approval Log, whoever isn't actually eligible —
 * Admin or a real Approval Role member — gets a clear error from the
 * server rather than the control being hidden, since the client has no
 * reliable way to know that in advance).
 */
function MonthlyReportPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const now = new Date();
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const { data: employeeData } = useQuery({
    queryKey: ['employees', 'monthly-report-picker'],
    queryFn: () => listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
  });
  const employees = employeeData?.items ?? [];

  const reportMutation = useMutation({
    mutationFn: () => {
      const employee = employees.find((e) => e._id === employeeId);
      const filename = `timesheet-report_${employee?.employeeId ?? employeeId}_${year}-${String(month).padStart(2, '0')}.xlsx`;
      return generateMonthlyReport({ employeeId, month: Number(month), year: Number(year) }, filename);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffTimesheets.monthlyReport.title')}</h2>
      <p className="mb-4 text-xs text-muted">
        {t('staffTimesheets.monthlyReport.description')}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Select
          label={t('staffTimesheets.monthlyReport.employee')}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="sm:col-span-2"
        >
          <option value="">{t('staffTimesheets.monthlyReport.selectEmployee')}</option>
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.fullName} ({emp.employeeId})
            </option>
          ))}
        </Select>
        <Select label={t('staffTimesheets.monthlyReport.month')} value={month} onChange={(e) => setMonth(e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {t(`common.months.${m}`)}
            </option>
          ))}
        </Select>
        <Select label={t('staffTimesheets.monthlyReport.year')} value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={!employeeId}
          isLoading={reportMutation.isPending}
          onClick={() => reportMutation.mutate()}
        >
          {t('staffTimesheets.monthlyReport.generate')}
        </Button>
      </div>
    </Card>
  );
}

/** Only the FINAL step of a workflow-governed timesheet is eligible for
 *  bulk-approve — a mid-chain one is skipped server-side rather than
 *  silently advanced by one step (see timesheet.service.js). Individual
 *  Approve/Reject (below) has no such restriction. */
function canBulkApprove(t) {
  if (!t.canDecideCurrentStep || t.status !== 'Submitted') return false;
  if (!t.workflow) return true;
  return t.currentStep === (t.steps?.length ?? 0) - 1;
}

/**
 * SubmitTimesheetPanel — a STAFF member (Coordinator/HR/Manager/Accounts)
 * submitting their OWN timesheet. Admin has no Employee record and never
 * sees this panel. Mirrors MyAttendancePage's single "summarize this week"
 * button exactly — no free-form fields, since Attendance is the one place
 * hours are actually entered.
 */
function SubmitTimesheetPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => submitTimesheet({ periodStart: new Date().toISOString() }),
    onSuccess: (timesheet) => {
      toast.success(t('staffTimesheets.submit.submittedToast', { hours: formatHours(timesheet.totalHours) }));
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('staffTimesheets.submit.title')}</h2>
          <p className="mt-1 text-xs text-muted">{t('staffTimesheets.submit.description')}</p>
        </div>
        <Button isLoading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
          {t('staffTimesheets.submit.submitButton')}
        </Button>
      </div>
    </Card>
  );
}

/**
 * ReviewQueue — the main review table plus its own bulk-approve trigger.
 * The "Approve N selected" button lives here, in this component's own
 * header, rather than in PageHeader as it originally did — once this queue
 * became one tab among several, a header button referencing checkboxes
 * inside a possibly-hidden tab would be confusing.
 */
function ReviewQueue() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('Submitted');
  const [selected, setSelected] = useState(new Set());
  // { timesheet, decision } while the single-decide "are you sure?" dialog
  // is open; confirmingBulk while the bulk-approve one is.
  const [confirming, setConfirming] = useState(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['timesheets', { status }],
    queryFn: () => listTimesheets({ limit: 50, ...(status && { status }) }),
    // Same reasoning as the Leave review queue: a submission from another
    // session has no way to reach this already-open queue otherwise.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    setSelected(new Set());
  };

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }) => decideTimesheet(id, { status: decision }),
    onSuccess: (timesheet) => {
      toast.success(timesheet.status === 'Approved' ? t('staffTimesheets.queue.approvedToast') : t('staffTimesheets.queue.rejectedToast'));
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
    onSettled: () => setConfirming(null),
  });

  const bulkMutation = useMutation({
    mutationFn: (ids) => bulkApproveTimesheets(ids),
    onSuccess: (result) => {
      toast.success(
        result.skipped > 0
          ? t('staffTimesheets.queue.bulkResultSkipped', { approved: result.approved, skipped: result.skipped })
          : t('staffTimesheets.queue.bulkResultAllApproved', { count: result.approved })
      );
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
    onSettled: () => setConfirmingBulk(false),
  });

  const submittedIds = useMemo(() => (data?.items ?? []).filter(canBulkApprove).map((t) => t._id), [data]);
  const allSelected = submittedIds.length > 0 && submittedIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(submittedIds));
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('staffTimesheets.queue.title')}</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" onClick={() => setConfirmingBulk(true)}>
              {t('staffTimesheets.queue.approveSelected', { count: selected.size })}
            </Button>
          )}
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[180px]" aria-label={t('staffTimesheets.queue.filterAriaLabel')}>
            <option value="">{t('common.allStatuses')}</option>
            {TIMESHEET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`common.status.${s}`, s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <EmptyState title={t('staffTimesheets.queue.couldNotLoad')} description={t('common.checkConnection')} action={<Button variant="secondary" onClick={() => refetch()}>{t('common.retry')}</Button>} />
      ) : data.items.length === 0 ? (
        <EmptyState title={t('staffTimesheets.queue.emptyTitle')} description={t('staffTimesheets.queue.emptyDescription')} />
      ) : (
        <>
          {submittedIds.length > 0 && (
            <label className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-xs text-muted">
              <input type="checkbox" className="h-4 w-4 rounded border-border" checked={allSelected} onChange={toggleAll} />
              {t('staffTimesheets.queue.selectAllSubmitted')}
            </label>
          )}
          <div className="divide-y divide-border">
            {data.items.map((ts) => {
              const incomplete = ts.recordedDays < 7;
              return (
                <div key={ts._id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div className="flex min-w-0 items-start gap-3">
                    {canBulkApprove(ts) && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-border"
                        checked={selected.has(ts._id)}
                        onChange={() => toggleOne(ts._id)}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">
                        {ts.employee?.fullName} <span className="font-normal text-muted">({ts.employee?.employeeId})</span>
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(ts.periodStart)} – {formatDate(ts.periodEnd)} · {formatHours(ts.totalHours)} hrs
                        {ts.overtimeHours > 0 && (
                          <span className="text-warning"> {t('staffTimesheets.queue.overtimeSuffix', { hours: formatHours(ts.overtimeHours) })}</span>
                        )}{' '}
                        · {t('staffTimesheets.queue.daysSummary', {
                          present: ts.daysPresent,
                          absent: ts.daysAbsent,
                          leaveOrSick: ts.daysLeaveOrSick,
                          off: ts.daysOff,
                        })}
                      </p>
                      {incomplete && (
                        <p className="mt-1 text-xs text-warning">{t('staffTimesheets.queue.incompleteWarning', { recorded: ts.recordedDays })}</p>
                      )}
                      {ts.notes && <p className="mt-1 text-xs text-muted">{ts.notes}</p>}
                      {ts.decisionNote && <p className="mt-1 text-xs italic text-muted">{t('staffTimesheets.queue.noteLabel', { note: ts.decisionNote })}</p>}
                      <ApprovalTrailView request={ts} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={TIMESHEET_STATUS_VARIANT[ts.status]}>{t(`common.status.${ts.status}`, ts.status)}</Badge>
                    {ts.canDecideCurrentStep && ts.status === 'Submitted' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setConfirming({ timesheet: ts, decision: 'Approved' })}>
                          {t('staffTimesheets.queue.approve')}
                        </Button>
                        <Button size="sm" variant="danger-ghost" onClick={() => setConfirming({ timesheet: ts, decision: 'Rejected' })}>
                          {t('staffTimesheets.queue.reject')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirming}
        title={confirming?.decision === 'Approved' ? t('staffTimesheets.queue.approveTitle') : t('staffTimesheets.queue.rejectTitle')}
        message={
          confirming &&
          t('staffTimesheets.queue.confirmMessage', {
            action: confirming.decision === 'Approved' ? t('staffTimesheets.queue.approve') : t('staffTimesheets.queue.reject'),
            name: confirming.timesheet.employee?.fullName,
            start: formatDate(confirming.timesheet.periodStart),
            end: formatDate(confirming.timesheet.periodEnd),
          })
        }
        confirmLabel={confirming?.decision === 'Approved' ? t('staffTimesheets.queue.approve') : t('staffTimesheets.queue.reject')}
        confirmVariant={confirming?.decision === 'Approved' ? 'primary' : 'danger'}
        loading={decideMutation.isPending}
        onConfirm={() => decideMutation.mutate({ id: confirming.timesheet._id, decision: confirming.decision })}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirmingBulk}
        title={t('staffTimesheets.queue.bulkApproveTitle')}
        message={t('staffTimesheets.queue.bulkApproveMessage', { count: selected.size })}
        confirmLabel={t('staffTimesheets.queue.approve')}
        confirmVariant="primary"
        loading={bulkMutation.isPending}
        onConfirm={() => bulkMutation.mutate([...selected])}
        onCancel={() => setConfirmingBulk(false)}
      />
    </Card>
  );
}

export default function TimesheetsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const tabs = [
    { key: 'requests', label: t('staffTimesheets.tabs.requests'), content: <ReviewQueue /> },
    user.role !== 'Admin' && { key: 'submit', label: t('staffTimesheets.tabs.submit'), content: <SubmitTimesheetPanel /> },
    { key: 'monthly-report', label: t('staffTimesheets.tabs.monthlyReport'), content: <MonthlyReportPanel /> },
  ].filter(Boolean);
  const [activeTab, setActiveTab] = useTabParam(tabs, 'requests');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('staffTimesheets.page.title')}
        description={t('staffTimesheets.page.description')}
        onBack={() => navigate(-1)}
      />
      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
    </div>
  );
}
