/**
 * LeavePage — the staff side of the Leave module (P2-M2): policy config
 * (Admin/Manager) and the review queue (every staff role reads; Admin/
 * Manager/HR/Coordinator decide — Coordinator scoped to their own team by
 * the server). Workers use MyLeavePage (/me/leave) instead.
 */
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listLeaveTypes,
  createLeaveType,
  updateLeaveType,
  listLeaveRequests,
  decideLeaveRequest,
  acknowledgeLeaveRequest,
} from '../leave.api.js';
import { leaveTypeFormSchema, emptyLeaveTypeForm, emptySickLeaveTypeForm, leaveTypeToForm } from '../leave.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import {
  LEAVE_RECURRENCES,
  LEAVE_RECURRENCE_LABELS,
  LEAVE_REQUEST_STATUSES,
  LEAVE_REQUEST_STATUS_LABELS,
  LEAVE_STATUS_VARIANT,
  LEAVE_TYPE_MANAGE_ROLES,
  LEAVE_DECIDE_ROLES,
} from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import UpcomingHolidays from '../../holidays/components/UpcomingHolidays.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

function LeaveTypesPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit

  const { data: types, isPending } = useQuery({ queryKey: ['leave-types', {}], queryFn: () => listLeaveTypes() });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(leaveTypeFormSchema), defaultValues: emptyLeaveTypeForm });
  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({ control, name: 'sickPayTiers' });
  const recurrence = watch('recurrence');

  // Switching a NEW leave type to 'Sick' pre-fills Article 117's statutory
  // tiers as a starting point (editable before saving) — only the tiers
  // field, so it never clobbers a name the user already typed. Only for a
  // brand new type; editing an existing one already loaded its own real
  // tiers via leaveTypeToForm(), so this must never fire for `editing?._id`.
  useEffect(() => {
    if (!editing || editing._id) return;
    if (recurrence === 'Sick' && tierFields.length === 0) {
      setValue('sickPayTiers', emptySickLeaveTypeForm.sickPayTiers);
    }
  }, [recurrence, editing, tierFields.length, setValue]);

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing?._id ? updateLeaveType(editing._id, values) : createLeaveType(values),
    onSuccess: () => {
      toast.success(editing?._id ? 'Leave type updated.' : 'Leave type created.');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openNew() {
    reset(emptyLeaveTypeForm);
    setEditing({});
  }
  function openEdit(type) {
    reset(leaveTypeToForm(type));
    setEditing(type);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Leave types</h2>
        <Button size="sm" onClick={openNew}>
          Add leave type
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : types.length === 0 ? (
        <EmptyState title="No leave types yet" description="Add one so staff can start requesting leave." />
      ) : (
        <div className="divide-y divide-border">
          {types.map((t) => (
            <button
              key={t._id}
              onClick={() => openEdit(t)}
              className="-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-bg/60"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted">
                  {LEAVE_RECURRENCE_LABELS[t.recurrence]}
                  {t.recurrence === 'Annual' && ` · ${t.daysPerYear} days/yr${t.tierYears ? ` (${t.tierDaysPerYear} after ${t.tierYears}yr)` : ''}`}
                  {t.recurrence === 'ContractCycle' && ` · ${t.daysPerCycle} days every ${t.cycleYears}yr`}
                  {t.recurrence === 'Sick' &&
                    ` · ${(t.sickPayTiers ?? []).reduce((sum, tier) => sum + tier.days, 0)} days/yr (${(t.sickPayTiers ?? [])
                      .map((tier) => `${tier.days}d @ ${tier.payPercent}%`)
                      .join(', ')})`}
                  {t.minServiceMonths > 0 && ` · min ${t.minServiceMonths}mo service`}
                  {t.maxDaysPerRequest ? ` · capped at ${t.maxDaysPerRequest}d/request` : ''}
                  {t.recurrence !== 'Sick' && !t.isPaid && ' · unpaid'}
                </p>
              </div>
              <Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit leave type' : 'New leave type'}>
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
          className="space-y-4"
        >
          <Input label="Name *" error={errors.name?.message} {...register('name')} />
          <Select label="How it's earned *" error={errors.recurrence?.message} {...register('recurrence')}>
            {LEAVE_RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {LEAVE_RECURRENCE_LABELS[r]}
              </option>
            ))}
          </Select>

          {recurrence === 'Annual' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Days per year *" type="number" min="0" error={errors.daysPerYear?.message} {...register('daysPerYear')} />
              <div />
              <Input label="Tier: after years of service" type="number" min="1" error={errors.tierYears?.message} {...register('tierYears')} />
              <Input label="Tier: days per year" type="number" min="0" error={errors.tierDaysPerYear?.message} {...register('tierDaysPerYear')} />
            </div>
          )}
          {recurrence === 'ContractCycle' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Cycle length (years) *" type="number" min="1" error={errors.cycleYears?.message} {...register('cycleYears')} />
              <Input label="Days per cycle *" type="number" min="0" error={errors.daysPerCycle?.message} {...register('daysPerCycle')} />
            </div>
          )}
          {recurrence === 'Sick' && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Pay tiers *</label>
                <Button type="button" size="sm" variant="secondary" onClick={() => appendTier({ days: '', payPercent: '' })}>
                  Add tier
                </Button>
              </div>
              <p className="mb-2 text-xs text-muted">
                The next N days of sick leave taken each leave year are paid at the given %, in order. Article 117's
                default is 30 days @ 100%, 60 days @ 75%, 30 days @ 0% (120 days/year total) — adjust if your company
                policy is more generous.
              </p>
              <div className="space-y-2">
                {tierFields.map((field, i) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Days"
                      aria-label={`Tier ${i + 1} days`}
                      error={errors.sickPayTiers?.[i]?.days?.message}
                      {...register(`sickPayTiers.${i}.days`)}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Pay %"
                      aria-label={`Tier ${i + 1} pay percent`}
                      error={errors.sickPayTiers?.[i]?.payPercent?.message}
                      {...register(`sickPayTiers.${i}.payPercent`)}
                    />
                    <Button type="button" size="sm" variant="ghost" className="hover:text-danger" onClick={() => removeTier(i)} aria-label="Remove tier">
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              {errors.sickPayTiers?.message && <p className="mt-1 text-sm text-danger">{errors.sickPayTiers.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Minimum service before eligible (months)"
              type="number"
              min="0"
              error={errors.minServiceMonths?.message}
              {...register('minServiceMonths')}
            />
            <Input
              label="Max days per request"
              type="number"
              min="1"
              placeholder="No cap"
              error={errors.maxDaysPerRequest?.message}
              {...register('maxDaysPerRequest')}
            />
          </div>

          {recurrence !== 'Sick' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('isPaid')} />
              Paid leave
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('isActive')} />
            Active — visible when staff/workers submit a request
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

function ReviewQueue() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canDecide = LEAVE_DECIDE_ROLES.includes(user.role);
  const [status, setStatus] = useState('');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['leave', { status }],
    queryFn: () => listLeaveRequests({ limit: 50, ...(status && { status }) }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leave'] });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }) => decideLeaveRequest(id, { status: decision }),
    onSuccess: (req) => {
      toast.success(`Leave request ${req.status.toLowerCase()}.`);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const ackMutation = useMutation({
    mutationFn: (id) => acknowledgeLeaveRequest(id),
    onSuccess: () => {
      toast.success('Marked as seen.');
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Leave requests</h2>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[200px]" aria-label="Filter by status">
          <option value="">All statuses</option>
          {LEAVE_REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAVE_REQUEST_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <EmptyState
          title="Could not load leave requests"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : data.items.length === 0 ? (
        <EmptyState title="No leave requests" description="Nothing matches this filter." />
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((req) => {
            const needsAck = req.status === 'AutoApproved' && !req.acknowledgedByManager;
            return (
              <div key={req._id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {req.employee?.fullName}{' '}
                    <span className="font-normal text-muted">({req.employee?.employeeId})</span>
                  </p>
                  <p className="text-xs text-muted">
                    {req.leaveTypeName} · {formatDate(req.startDate)} – {formatDate(req.endDate)} · {req.days} day
                    {req.days > 1 ? 's' : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">{req.eligibility?.ruleApplied}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={LEAVE_STATUS_VARIANT[req.status]}>{LEAVE_REQUEST_STATUS_LABELS[req.status]}</Badge>
                  {canDecide && req.status === 'PendingReview' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={decideMutation.isPending}
                        onClick={() => decideMutation.mutate({ id: req._id, decision: 'Approved' })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:text-danger"
                        isLoading={decideMutation.isPending}
                        onClick={() => decideMutation.mutate({ id: req._id, decision: 'Rejected' })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {canDecide && needsAck && (
                    <Button size="sm" variant="ghost" isLoading={ackMutation.isPending} onClick={() => ackMutation.mutate(req._id)}>
                      Mark as seen
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function LeavePage() {
  const { user } = useAuth();
  const canManageTypes = LEAVE_TYPE_MANAGE_ROLES.includes(user.role);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Leave"
        description={
          user.role === 'Coordinator'
            ? 'Requests from your assigned employees.'
            : 'Leave requests across the company.'
        }
      />
      <UpcomingHolidays />
      {canManageTypes && <LeaveTypesPanel />}
      <ReviewQueue />
    </div>
  );
}
