/**
 * ReimbursementReviewPanel — the staff review queue for expense
 * reimbursement claims: approve/reject, download the receipt, then mark
 * paid once Accounts has actually reimbursed it.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listReimbursements, decideReimbursement, markReimbursementPaid, downloadReceipt } from '../reimbursements.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import {
  REIMBURSEMENT_STATUSES,
  REIMBURSEMENT_STATUS_VARIANT,
  FINANCIAL_REQUEST_DECIDE_ROLES,
  FINANCIAL_REQUEST_MONEY_ROLES,
} from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function ReimbursementReviewPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canDecide = FINANCIAL_REQUEST_DECIDE_ROLES.includes(user.role);
  const canPay = FINANCIAL_REQUEST_MONEY_ROLES.includes(user.role);
  const [status, setStatus] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['financial-requests', 'reimbursements', { status }],
    queryFn: () => listReimbursements({ limit: 50, ...(status && { status }) }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financial-requests', 'reimbursements'] });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }) => decideReimbursement(id, { status: decision }),
    onSuccess: (claim) => {
      toast.success(`Claim ${claim.status.toLowerCase()}.`);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const payMutation = useMutation({
    mutationFn: (id) => markReimbursementPaid(id),
    onSuccess: () => {
      toast.success('Claim marked paid.');
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  async function handleDownload(claim) {
    setDownloadingId(claim._id);
    try {
      await downloadReceipt(claim._id, claim.receipt.originalName);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not download the receipt.'));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Reimbursement claims</h2>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[180px]" aria-label="Filter by status">
          <option value="">All statuses</option>
          {REIMBURSEMENT_STATUSES.map((s) => (
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
          title="Could not load reimbursement claims"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : data.items.length === 0 ? (
        <EmptyState title="No reimbursement claims" description="Nothing matches this filter." />
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((c) => (
            <div key={c._id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {c.employee?.fullName} <span className="font-normal text-muted">({c.employee?.employeeId})</span>
                </p>
                <p className="text-xs text-muted">
                  {c.category} · {formatMoney(c.amount)} · expense {formatDate(c.expenseDate)}
                </p>
                {c.description && <p className="mt-1 text-xs text-muted">{c.description}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={REIMBURSEMENT_STATUS_VARIANT[c.status]}>{c.status}</Badge>
                <Button size="sm" variant="ghost" isLoading={downloadingId === c._id} onClick={() => handleDownload(c)}>
                  Receipt
                </Button>
                {canDecide && c.status === 'Pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" isLoading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: c._id, decision: 'Approved' })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="hover:text-danger" isLoading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: c._id, decision: 'Rejected' })}>
                      Reject
                    </Button>
                  </div>
                )}
                {canPay && c.status === 'Approved' && (
                  <Button size="sm" variant="ghost" isLoading={payMutation.isPending} onClick={() => payMutation.mutate(c._id)}>
                    Mark paid
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
