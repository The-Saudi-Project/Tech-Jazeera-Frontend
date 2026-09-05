/**
 * TimesheetsPage — the supervisor review queue for weekly timesheets
 * (P2-M3b): approve/reject individually, or select several Submitted weeks
 * and bulk-approve (the plan's "bulk approve a week"). Three tabs — see
 * docs/TABS-notes.md for why tabs replaced the original vertical stack.
 */
import { useMemo, useState } from 'react';
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Generate monthly report</h2>
      <p className="mb-4 text-xs text-muted">
        A full day-by-day report for one employee's whole month, built from their real attendance — same format as
        the Timesheet Processor's export. Available to Admin and anyone set up in the Approval Hierarchy.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Select
          label="Employee"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="sm:col-span-2"
        >
          <option value="">Select employee…</option>
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.fullName} ({emp.employeeId})
            </option>
          ))}
        </Select>
        <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
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
          Generate report
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
  const toast = useToast();
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => submitTimesheet({ periodStart: new Date().toISOString() }),
    onSuccess: (timesheet) => {
      toast.success(`Timesheet submitted — ${formatHours(timesheet.totalHours)} hrs this week.`);
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Submit your own timesheet</h2>
          <p className="mt-1 text-xs text-muted">Summarizes this week's attendance so far and sends it for approval.</p>
        </div>
        <Button isLoading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
          Submit this week
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
      toast.success(`Timesheet ${timesheet.status.toLowerCase()}.`);
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
          ? `${result.approved} approved, ${result.skipped} skipped (not yet at their final step, or not yours to decide).`
          : `${result.approved} timesheet(s) approved.`
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Timesheets</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" onClick={() => setConfirmingBulk(true)}>
              Approve {selected.size} selected
            </Button>
          )}
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[180px]" aria-label="Filter by status">
            <option value="">All statuses</option>
            {TIMESHEET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <EmptyState title="Could not load timesheets" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No timesheets" description="Nothing matches this filter." />
      ) : (
        <>
          {submittedIds.length > 0 && (
            <label className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-xs text-muted">
              <input type="checkbox" className="h-4 w-4 rounded border-border" checked={allSelected} onChange={toggleAll} />
              Select all submitted
            </label>
          )}
          <div className="divide-y divide-border">
            {data.items.map((t) => {
              const incomplete = t.recordedDays < 7;
              return (
                <div key={t._id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div className="flex min-w-0 items-start gap-3">
                    {canBulkApprove(t) && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-border"
                        checked={selected.has(t._id)}
                        onChange={() => toggleOne(t._id)}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">
                        {t.employee?.fullName} <span className="font-normal text-muted">({t.employee?.employeeId})</span>
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(t.periodStart)} – {formatDate(t.periodEnd)} · {formatHours(t.totalHours)} hrs
                        {t.overtimeHours > 0 && (
                          <span className="text-warning"> ({formatHours(t.overtimeHours)} overtime)</span>
                        )}{' '}
                        · {t.daysPresent} present, {t.daysAbsent} absent, {t.daysLeaveOrSick} leave/sick, {t.daysOff} off
                      </p>
                      {incomplete && (
                        <p className="mt-1 text-xs text-warning">Only {t.recordedDays} of 7 days have attendance recorded.</p>
                      )}
                      {t.notes && <p className="mt-1 text-xs text-muted">{t.notes}</p>}
                      {t.decisionNote && <p className="mt-1 text-xs italic text-muted">Note: {t.decisionNote}</p>}
                      <ApprovalTrailView request={t} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={TIMESHEET_STATUS_VARIANT[t.status]}>{t.status}</Badge>
                    {t.canDecideCurrentStep && t.status === 'Submitted' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setConfirming({ timesheet: t, decision: 'Approved' })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setConfirming({ timesheet: t, decision: 'Rejected' })}>
                          Reject
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
        title={confirming?.decision === 'Approved' ? 'Approve timesheet?' : 'Reject timesheet?'}
        message={
          confirming &&
          `${confirming.decision === 'Approved' ? 'Approve' : 'Reject'} ${confirming.timesheet.employee?.fullName}'s timesheet for ${formatDate(confirming.timesheet.periodStart)} – ${formatDate(confirming.timesheet.periodEnd)}? This cannot be undone.`
        }
        confirmLabel={confirming?.decision === 'Approved' ? 'Approve' : 'Reject'}
        confirmVariant={confirming?.decision === 'Approved' ? 'primary' : 'danger'}
        loading={decideMutation.isPending}
        onConfirm={() => decideMutation.mutate({ id: confirming.timesheet._id, decision: confirming.decision })}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirmingBulk}
        title="Approve selected timesheets?"
        message={`Approve ${selected.size} selected timesheet(s)? Any not yet at their final step, or not yours to decide, will be skipped. This cannot be undone.`}
        confirmLabel="Approve"
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
  const { user } = useAuth();

  const tabs = [
    { key: 'requests', label: 'Requests', content: <ReviewQueue /> },
    user.role !== 'Admin' && { key: 'submit', label: 'Submit Timesheet', content: <SubmitTimesheetPanel /> },
    { key: 'monthly-report', label: 'Monthly Report', content: <MonthlyReportPanel /> },
  ].filter(Boolean);
  const [activeTab, setActiveTab] = useTabParam(tabs, 'requests');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Timesheets"
        description="Weekly hours submitted by workers, summarized from their attendance."
        onBack={() => navigate(-1)}
      />
      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
    </div>
  );
}
