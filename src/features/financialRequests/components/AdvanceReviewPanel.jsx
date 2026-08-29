/**
 * AdvanceReviewPanel — the staff review queue for salary advance requests,
 * plus recording repayments against an approved one. No multi-level
 * approval matrix (see docs/P3-C-notes.md) — single-level Approve/Reject,
 * same as Leave.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAdvances, decideAdvance, addAdvanceRepayment } from '../advances.api.js';
import { repaymentFormSchema, emptyRepaymentForm } from '../financialRequests.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import {
  ADVANCE_STATUSES,
  ADVANCE_STATUS_VARIANT,
  FINANCIAL_REQUEST_DECIDE_ROLES,
  FINANCIAL_REQUEST_MONEY_ROLES,
} from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Select from '../../../components/ui/Select.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function AdvanceReviewPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canDecide = FINANCIAL_REQUEST_DECIDE_ROLES.includes(user.role);
  const canRecordRepayment = FINANCIAL_REQUEST_MONEY_ROLES.includes(user.role);
  const [status, setStatus] = useState('');
  const [repaying, setRepaying] = useState(null); // the advance being repaid, or null

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['financial-requests', 'advances', { status }],
    queryFn: () => listAdvances({ limit: 50, ...(status && { status }) }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financial-requests', 'advances'] });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }) => decideAdvance(id, { status: decision }),
    onSuccess: (advance) => {
      toast.success(`Advance ${advance.status.toLowerCase()}.`);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(repaymentFormSchema), defaultValues: emptyRepaymentForm });

  const repayMutation = useMutation({
    mutationFn: ({ id, values }) => addAdvanceRepayment(id, values),
    onSuccess: (advance) => {
      toast.success(
        advance.status === 'Closed' ? 'Repayment recorded — advance fully repaid.' : 'Repayment recorded.'
      );
      setRepaying(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openRepay(advance) {
    reset(emptyRepaymentForm);
    setRepaying(advance);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Salary advances</h2>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[180px]" aria-label="Filter by status">
          <option value="">All statuses</option>
          {ADVANCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <EmptyState
          title="Could not load advances"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : data.items.length === 0 ? (
        <EmptyState title="No advance requests" description="Nothing matches this filter." />
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((a) => (
            <div key={a._id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {a.employee?.fullName} <span className="font-normal text-muted">({a.employee?.employeeId})</span>
                </p>
                <p className="text-xs text-muted">
                  {formatMoney(a.amount)} · over {a.repaymentMonths} month{a.repaymentMonths > 1 ? 's' : ''} · requested{' '}
                  {formatDate(a.createdAt)}
                </p>
                {a.reason && <p className="mt-1 text-xs text-muted">{a.reason}</p>}
                {(a.status === 'Approved' || a.status === 'Closed') && (
                  <p className="mt-1 text-xs">
                    Repaid {formatMoney(a.amountRepaid)} of {formatMoney(a.amount)} — outstanding{' '}
                    <span className="font-semibold">{formatMoney(a.outstandingBalance)}</span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={ADVANCE_STATUS_VARIANT[a.status]}>{a.status}</Badge>
                {canDecide && a.status === 'Pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" isLoading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: a._id, decision: 'Approved' })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:text-danger" isLoading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: a._id, decision: 'Rejected' })}>
                      Reject
                    </Button>
                  </div>
                )}
                {canRecordRepayment && a.status === 'Approved' && (
                  <Button size="sm" variant="ghost" onClick={() => openRepay(a)}>
                    Record repayment
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!repaying} onClose={() => setRepaying(null)} title="Record a repayment">
        {repaying && (
          <form
            onSubmit={handleSubmit((values) => repayMutation.mutate({ id: repaying._id, values }))}
            noValidate
            className="space-y-4"
          >
            <p className="text-sm text-muted">
              {repaying.employee?.fullName} — outstanding <span className="font-semibold text-text">{formatMoney(repaying.outstandingBalance)}</span>
            </p>
            <Input label="Amount *" type="number" step="0.01" min="0.01" error={errors.amount?.message} {...register('amount')} />
            <Input label="Date *" type="date" error={errors.date?.message} {...register('date')} />
            <Textarea label="Note" placeholder="Optional" error={errors.note?.message} {...register('note')} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRepaying(null)} disabled={repayMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={repayMutation.isPending}>
                Save repayment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Card>
  );
}
