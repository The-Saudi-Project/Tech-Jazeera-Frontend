/**
 * EOSB settlements list — every computed end-of-service settlement (P3-A).
 * View/PDF for Admin/Manager/HR/Accounts; computing a new one is
 * Admin/Manager/HR only (see lib/constants.js EOSB_WRITE_ROLES).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listSettlements } from '../eosb.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { formatDate, formatMoney } from '../../../lib/utils.js';
import { EOSB_WRITE_ROLES, EXIT_REASON_LABELS } from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function SettlementListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCompute = EOSB_WRITE_ROLES.includes(user.role);

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isPending, isError } = useQuery({
    queryKey: ['eosb', { page, limit }],
    queryFn: () => listSettlements({ page, limit }),
    placeholderData: keepPreviousData,
  });

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (s) => (
        <span className="font-medium text-text">
          {s.employeeName}
          <span className="block text-xs font-normal text-muted">{s.employeeCode}</span>
        </span>
      ),
    },
    { key: 'exitDate', header: 'Exit date', render: (s) => formatDate(s.exitDate) },
    {
      key: 'exitReason',
      header: 'Reason',
      hideOnMobile: true,
      render: (s) => <Badge variant={s.exitReason === 'Resignation' ? 'warning' : 'default'}>{EXIT_REASON_LABELS[s.exitReason]}</Badge>,
    },
    { key: 'serviceYears', header: 'Service', hideOnMobile: true, render: (s) => `${s.serviceYears} yrs` },
    { key: 'total', header: 'Total settlement', className: 'text-right', render: (s) => <span className="font-semibold tabular-nums">{formatMoney(s.totalSettlement)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="End of service settlements"
        description="Article 84/85 EOSB and vacation-pay calculations for exiting employees."
        onBack={() => navigate(-1)}
        actions={canCompute && <Button onClick={() => navigate('/eosb/new')}>New settlement</Button>}
      />

      {isError ? (
        <EmptyState title="Could not load settlements" description="Please try again." />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(s) => s._id}
            loading={isPending}
            onRowClick={(s) => navigate(`/eosb/${s._id}`)}
            emptyState={
              <EmptyState
                title="No settlements yet"
                description="Compute one when an employee resigns, is terminated, or their contract ends."
                action={canCompute && <Button onClick={() => navigate('/eosb/new')}>New settlement</Button>}
              />
            }
          />

          {data && data.total > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <span>
                Showing {(data.page - 1) * limit + 1}–{Math.min(data.page * limit, data.total)} of {data.total}
              </span>
              <span className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="tabular-nums">
                  {data.page} / {data.pages}
                </span>
                <Button size="sm" variant="secondary" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
