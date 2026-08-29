/**
 * MyRequestsPage — a Worker's salary advance and reimbursement requests
 * (P3-C). One page, two sections — mirrors how the staff-side
 * FinancialRequestsPage groups the same two concerns.
 */
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMyAdvances,
  submitMyAdvance,
  cancelMyAdvance,
  listMyReimbursements,
  submitMyReimbursement,
  cancelMyReimbursement,
  downloadMyReceipt,
} from '../ess.api.js';
import {
  advanceFormSchema,
  emptyAdvanceForm,
  reimbursementFormSchema,
  emptyReimbursementForm,
} from '../../financialRequests/financialRequests.schema.js';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import {
  ADVANCE_STATUS_VARIANT,
  REIMBURSEMENT_CATEGORIES,
  REIMBURSEMENT_STATUS_VARIANT,
  RECEIPT_ACCEPT,
  RECEIPT_MAX_MB,
} from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

function MyAdvancesSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'advances'],
    queryFn: () => listMyAdvances({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(advanceFormSchema), defaultValues: emptyAdvanceForm });

  const submitMutation = useMutation({
    mutationFn: submitMyAdvance,
    onSuccess: () => {
      toast.success('Advance request submitted.');
      reset(emptyAdvanceForm);
      queryClient.invalidateQueries({ queryKey: ['me', 'advances'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelMyAdvance(id),
    onSuccess: () => {
      toast.success('Advance request cancelled.');
      setToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'advances'] });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setToCancel(null);
    },
  });

  return (
    <>
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Request a salary advance</h2>
        <form onSubmit={handleSubmit((values) => submitMutation.mutate(values))} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Amount (SAR) *" type="number" step="0.01" min="1" error={errors.amount?.message} {...register('amount')} />
            <Input label="Repay over (months) *" type="number" min="1" max="24" error={errors.repaymentMonths?.message} {...register('repaymentMonths')} />
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your advance requests</h2>
        {isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <EmptyState
            title="Could not load your advance requests"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
          />
        ) : data.items.length === 0 ? (
          <EmptyState title="No advance requests yet" description="Submit your first request above." />
        ) : (
          <Card className="divide-y divide-border">
            {data.items.map((a) => (
              <div key={a._id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{formatMoney(a.amount)}</p>
                  <p className="text-xs text-muted">
                    Over {a.repaymentMonths} month{a.repaymentMonths > 1 ? 's' : ''} · requested {formatDate(a.createdAt)}
                  </p>
                  {(a.status === 'Approved' || a.status === 'Closed') && (
                    <p className="mt-1 text-xs">Outstanding: <span className="font-semibold">{formatMoney(a.outstandingBalance)}</span></p>
                  )}
                  {a.decisionNote && <p className="mt-1 text-xs italic text-muted">Note: {a.decisionNote}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={ADVANCE_STATUS_VARIANT[a.status]}>{a.status}</Badge>
                  {a.status === 'Pending' && (
                    <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToCancel(a)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel advance request?"
        message={`Your request for ${toCancel ? formatMoney(toCancel.amount) : ''} will be cancelled.`}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel._id)}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

function MyReimbursementsSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'reimbursements'],
    queryFn: () => listMyReimbursements({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(reimbursementFormSchema), defaultValues: emptyReimbursementForm });

  function resetFile() {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > RECEIPT_MAX_MB * 1024 * 1024) {
      toast.error(`File is too large (maximum ${RECEIPT_MAX_MB} MB).`);
      e.target.value = '';
      return;
    }
    setPendingFile(file);
  }

  const submitMutation = useMutation({
    mutationFn: (values) => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(values)) fd.append(key, value);
      fd.append('file', pendingFile);
      return submitMyReimbursement(fd);
    },
    onSuccess: () => {
      toast.success('Reimbursement claim submitted.');
      reset(emptyReimbursementForm);
      resetFile();
      queryClient.invalidateQueries({ queryKey: ['me', 'reimbursements'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelMyReimbursement(id),
    onSuccess: () => {
      toast.success('Reimbursement claim cancelled.');
      setToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'reimbursements'] });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setToCancel(null);
    },
  });

  function onSubmit(values) {
    if (!pendingFile) {
      toast.error('Attach a receipt before submitting.');
      return;
    }
    submitMutation.mutate(values);
  }

  async function handleDownload(claim) {
    setDownloadingId(claim._id);
    try {
      await downloadMyReceipt(claim._id, claim.receipt.originalName);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not download the receipt.'));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Claim an expense</h2>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Category *" error={errors.category?.message} {...register('category')}>
              <option value="">Choose a category…</option>
              {REIMBURSEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input label="Amount (SAR) *" type="number" step="0.01" min="0.01" error={errors.amount?.message} {...register('amount')} />
          </div>
          <Input label="Expense date *" type="date" error={errors.expenseDate?.message} {...register('expenseDate')} />
          <Textarea label="Description" placeholder="Optional" error={errors.description?.message} {...register('description')} />

          <div>
            <label className="mb-1.5 block text-sm font-medium">Receipt *</label>
            <input ref={fileInputRef} type="file" accept={RECEIPT_ACCEPT} className="hidden" onChange={handleFileChange} />
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {pendingFile ? 'Change file' : 'Choose file'}
              </Button>
              {pendingFile && <span className="truncate text-sm text-muted">{pendingFile.name}</span>}
            </div>
            <p className="mt-1 text-xs text-muted">PDF, JPG, PNG, or WEBP — up to {RECEIPT_MAX_MB} MB.</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={submitMutation.isPending}>
              Submit claim
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your reimbursement claims</h2>
        {isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <EmptyState
            title="Could not load your claims"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
          />
        ) : data.items.length === 0 ? (
          <EmptyState title="No reimbursement claims yet" description="Submit your first claim above." />
        ) : (
          <Card className="divide-y divide-border">
            {data.items.map((c) => (
              <div key={c._id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.category} · {formatMoney(c.amount)}
                  </p>
                  <p className="text-xs text-muted">Expense {formatDate(c.expenseDate)}</p>
                  {c.decisionNote && <p className="mt-1 text-xs italic text-muted">Note: {c.decisionNote}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={REIMBURSEMENT_STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  <Button size="sm" variant="ghost" isLoading={downloadingId === c._id} onClick={() => handleDownload(c)}>
                    Receipt
                  </Button>
                  {c.status === 'Pending' && (
                    <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToCancel(c)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel reimbursement claim?"
        message={`Your ${toCancel?.category} claim for ${toCancel ? formatMoney(toCancel.amount) : ''} will be cancelled.`}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel._id)}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

export default function MyRequestsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My requests" description="Salary advances and expense reimbursement claims." />
      <MyAdvancesSection />
      <MyReimbursementsSection />
    </div>
  );
}
