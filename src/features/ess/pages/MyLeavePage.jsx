/**
 * MyLeavePage — a Worker submits leave requests and sees their own history
 * (P2-M2). Eligibility is never computed here: the server evaluates it at
 * submission time from the real joining date and leave history, and returns
 * the result (AutoApproved / PendingReview + why) — this page only displays it.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMyLeave, submitMyLeave, cancelMyLeave } from '../ess.api.js';
import { listLeaveTypes } from '../../leave/leave.api.js';
import { submitLeaveFormSchema, emptySubmitLeaveForm } from '../../leave/leave.schema.js';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import { LEAVE_STATUS_VARIANT, LEAVE_REQUEST_STATUS_LABELS } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';

export default function MyLeavePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState(null);

  const { data: types } = useQuery({
    queryKey: ['leave-types', { activeOnly: true }],
    queryFn: () => listLeaveTypes({ activeOnly: 'true' }),
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'leave'],
    queryFn: () => listMyLeave({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(submitLeaveFormSchema), defaultValues: emptySubmitLeaveForm });

  const submitMutation = useMutation({
    mutationFn: submitMyLeave,
    onSuccess: (request) => {
      toast[request.status === 'AutoApproved' ? 'success' : 'info'](
        request.status === 'AutoApproved' ? 'Leave request approved.' : 'Leave request submitted for review.'
      );
      reset(emptySubmitLeaveForm);
      queryClient.invalidateQueries({ queryKey: ['me', 'leave'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelMyLeave(id),
    onSuccess: () => {
      toast.success('Leave request cancelled.');
      setToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'leave'] });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setToCancel(null);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My leave" description="Request leave and track its status." />

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Request leave</h2>
        <form
          onSubmit={handleSubmit((values) => submitMutation.mutate(values))}
          noValidate
          className="space-y-4"
        >
          <Select label="Leave type *" error={errors.leaveType?.message} {...register('leaveType')}>
            <option value="">Choose a leave type…</option>
            {(types ?? []).map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start date *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End date *" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
          <Textarea label="Reason" placeholder="Optional" error={errors.reason?.message} {...register('reason')} />
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitMutation.isPending}>
              Submit request
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your requests</h2>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load your leave requests"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
          />
        ) : data.items.length === 0 ? (
          <EmptyState title="No leave requests yet" description="Submit your first request above." />
        ) : (
          <Card className="divide-y divide-border">
            {data.items.map((req) => {
              const cancellable =
                ['PendingReview', 'AutoApproved'].includes(req.status) && new Date(req.startDate) > new Date();
              return (
                <div key={req._id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {req.leaveTypeName} · {req.days} day{req.days > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                    </p>
                    <p className="mt-1 text-xs text-muted">{req.eligibility?.ruleApplied}</p>
                    {req.decisionNote && (
                      <p className="mt-1 text-xs italic text-muted">Note: {req.decisionNote}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={LEAVE_STATUS_VARIANT[req.status]}>{LEAVE_REQUEST_STATUS_LABELS[req.status]}</Badge>
                    {cancellable && (
                      <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToCancel(req)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel leave request?"
        message={`Your ${toCancel?.leaveTypeName} request for ${toCancel?.days} day(s) will be cancelled.`}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel._id)}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}
