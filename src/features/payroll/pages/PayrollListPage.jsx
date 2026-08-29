/**
 * PayrollListPage — every payroll run (P2-M5), newest first, with a "Run
 * payroll" action that builds a Draft for a chosen month from real
 * employee salaries and Approved timesheets.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPayrollRuns, createPayrollRun } from '../payroll.api.js';
import { apiMessage, formatMoney } from '../../../lib/utils.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { PAYROLL_STATUS_VARIANT, PAYROLL_WRITE_ROLES, MONTH_NAMES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Select from '../../../components/ui/Select.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

const now = new Date();

export default function PayrollListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite = PAYROLL_WRITE_ROLES.includes(user.role);

  const [creating, setCreating] = useState(false);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['payroll'],
    queryFn: () => listPayrollRuns({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => createPayrollRun({ periodYear, periodMonth }),
    onSuccess: (run) => {
      toast.success(`Payroll run created for ${MONTH_NAMES[run.periodMonth - 1]} ${run.periodYear}.`);
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      navigate(`/payroll/${run._id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const columns = [
    {
      key: 'period',
      header: 'Period',
      render: (r) => (
        <span className="font-medium text-text">
          {MONTH_NAMES[r.periodMonth - 1]} {r.periodYear}
        </span>
      ),
    },
    { key: 'lines', header: 'Employees', hideOnMobile: true, render: (r) => r.lines?.length ?? '—' },
    { key: 'totalNet', header: 'Total net pay', className: 'text-right', render: (r) => <span className="font-semibold tabular-nums">{formatMoney(r.totalNet)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={PAYROLL_STATUS_VARIANT[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Payroll"
        description="Monthly payroll runs for the supplied workforce."
        actions={canWrite && <Button onClick={() => setCreating(true)}>Run payroll</Button>}
      />

      {isError ? (
        <EmptyState title="Could not load payroll runs" description="Please try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
      ) : (
        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(r) => r._id}
          loading={isPending}
          onRowClick={(r) => navigate(`/payroll/${r._id}`)}
          emptyState={
            <EmptyState
              title="No payroll runs yet"
              description="Run payroll for a month to compute pay from real salaries and approved hours."
              action={canWrite && <Button onClick={() => setCreating(true)}>Run payroll</Button>}
            />
          }
        />
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Run payroll">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Builds a draft from every active supplied-workforce employee's current salary. You can adjust
            allowances and deductions before finalizing.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Month" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
            <Select label="Year" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreating(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Build draft
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
