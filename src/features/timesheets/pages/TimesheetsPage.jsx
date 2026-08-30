/**
 * TimesheetsPage — the supervisor review queue for weekly timesheets
 * (P2-M3b): approve/reject individually, or select several Submitted weeks
 * and bulk-approve (the plan's "bulk approve a week").
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listTimesheets, decideTimesheet, bulkApproveTimesheets } from '../timesheets.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatHours } from '../../../lib/utils.js';
import { TIMESHEET_STATUSES, TIMESHEET_STATUS_VARIANT, TIMESHEET_DECIDE_ROLES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function TimesheetsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canDecide = TIMESHEET_DECIDE_ROLES.includes(user.role);
  const [status, setStatus] = useState('Submitted');
  const [selected, setSelected] = useState(new Set());

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['timesheets', { status }],
    queryFn: () => listTimesheets({ limit: 50, ...(status && { status }) }),
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
  });

  const bulkMutation = useMutation({
    mutationFn: (ids) => bulkApproveTimesheets(ids),
    onSuccess: (result) => {
      toast.success(`${result.approved} timesheet(s) approved.`);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const submittedIds = useMemo(
    () => (data?.items ?? []).filter((t) => t.status === 'Submitted').map((t) => t._id),
    [data]
  );
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
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Timesheets"
        description="Weekly hours submitted by workers, summarized from their attendance."
        actions={
          canDecide &&
          selected.size > 0 && (
            <Button isLoading={bulkMutation.isPending} onClick={() => bulkMutation.mutate([...selected])}>
              Approve {selected.size} selected
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[180px]" aria-label="Filter by status">
          <option value="">All statuses</option>
          {TIMESHEET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load timesheets" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
        ) : data.items.length === 0 ? (
          <EmptyState title="No timesheets" description="Nothing matches this filter." />
        ) : (
          <>
            {canDecide && submittedIds.length > 0 && (
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
                      {canDecide && t.status === 'Submitted' && (
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
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={TIMESHEET_STATUS_VARIANT[t.status]}>{t.status}</Badge>
                      {canDecide && t.status === 'Submitted' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" isLoading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: t._id, decision: 'Approved' })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="hover:text-danger" isLoading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: t._id, decision: 'Rejected' })}>
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
      </Card>
    </div>
  );
}
