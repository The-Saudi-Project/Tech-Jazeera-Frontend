/**
 * Settlement detail — the full Article 84/85 breakdown for one computed
 * settlement. Read-only: a settlement is corrected by deleting and
 * recomputing (see settlement.model.js), never edited in place.
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettlement, deleteSettlement } from '../eosb.api.js';
import SettlementPdfButton from '../components/SettlementPdfButton.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import { EOSB_WRITE_ROLES, EXIT_REASON_LABELS } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

function fractionLabel(f) {
  if (f === 1) return 'Full award';
  if (f === 0) return 'Forfeited (under 2 years)';
  return `${Math.round(f * 100)}% of the award`;
}

function Row({ label, value, note, bold }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div>
        <p className={bold ? 'font-semibold' : 'text-sm'}>{label}</p>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
      <p className={bold ? 'shrink-0 font-semibold tabular-nums' : 'shrink-0 text-sm tabular-nums'}>{value}</p>
    </div>
  );
}

export default function SettlementViewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const canDelete = EOSB_WRITE_ROLES.includes(user.role);

  const { data: s, isPending, isError } = useQuery({
    queryKey: ['eosb', id],
    queryFn: () => getSettlement(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSettlement(id),
    onSuccess: () => {
      toast.success('Settlement deleted.');
      queryClient.invalidateQueries({ queryKey: ['eosb'] });
      navigate('/eosb', { replace: true });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setConfirmingDelete(false);
    },
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        title="Settlement not found"
        description="It may have been deleted."
        action={
          <Link to="/eosb">
            <Button variant="secondary">Back to settlements</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={s.employeeName}
        description={`${s.employeeCode} · exited ${formatDate(s.exitDate)}`}
        actions={
          <>
            <Badge variant={s.exitReason === 'Resignation' ? 'warning' : 'default'} className="mr-1">
              {EXIT_REASON_LABELS[s.exitReason]}
            </Badge>
            <SettlementPdfButton id={s._id} employeeCode={s.employeeCode} />
            {canDelete && (
              <Button variant="ghost" className="hover:text-danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <Card>
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Joining date</p>
            <p className="mt-0.5 font-medium">{formatDate(s.joiningDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Service</p>
            <p className="mt-0.5 font-medium">{s.serviceYears} years</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Monthly wage</p>
            <p className="mt-0.5 font-medium">{formatMoney(s.monthlyWage)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Computed</p>
            <p className="mt-0.5 font-medium">{formatDate(s.createdAt)}</p>
          </div>
        </div>

        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">End of service award (Articles 84–85)</h2>
        <Row
          label="Gross award"
          value={formatMoney(s.eosbGross)}
          note="Half a month's wage per year for the first 5 years, a full month's wage per year after."
        />
        <Row
          label="Reduction applied"
          value={fractionLabel(s.reductionFactor)}
          note={s.exitReason === 'Resignation' ? 'Article 85 resignation tiering, by length of service.' : 'Not a resignation — full award, no reduction.'}
        />
        <Row label="Net end-of-service award" value={formatMoney(s.eosbNet)} bold />

        <h2 className="mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Vacation pay settlement</h2>
        <Row label="Unused annual leave" value={`${s.unusedLeaveDays} day${s.unusedLeaveDays === 1 ? '' : 's'}`} />
        <Row label="Leave encashment" value={formatMoney(s.leaveEncashment)} />

        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <p className="font-semibold">Total settlement</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(s.totalSettlement)}</p>
        </div>

        {s.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs uppercase tracking-wide text-muted">Notes</p>
            <p className="mt-1 text-sm">{s.notes}</p>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete settlement?"
        message={`This settlement for ${s.employeeName} will be permanently removed.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
