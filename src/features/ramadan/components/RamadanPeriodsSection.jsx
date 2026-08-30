/**
 * RamadanPeriodsSection (P3-E) — the configurable Ramadan calendar + hour
 * caps, embedded as a second section on the Holidays page rather than a
 * standalone nav item: both are "company calendar" configuration owned by
 * the same Admin/Manager/HR circle, and a whole new sidebar entry for one
 * small settings list would be pure navigation overhead (same call
 * P2-M3b made for folding timesheet submission into My Attendance).
 *
 * These dates + hour caps feed straight into Payroll's real overtime pay
 * (P3-E) via timesheet.service.js's weekly threshold check — not shown
 * here directly, but this is where that number ultimately comes from.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listRamadanPeriods,
  createRamadanPeriod,
  updateRamadanPeriod,
  deleteRamadanPeriod,
} from '../ramadanPeriods.api.js';
import { ramadanPeriodFormSchema, emptyRamadanPeriodForm, ramadanPeriodToForm } from '../ramadan.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import { HOLIDAY_MANAGE_ROLES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Table from '../../../components/ui/Table.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function RamadanPeriodsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canManage = HOLIDAY_MANAGE_ROLES.includes(user.role);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [toDelete, setToDelete] = useState(null);

  const { data: periods, isPending, isError, refetch } = useQuery({
    queryKey: ['ramadan-periods'],
    queryFn: () => listRamadanPeriods(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(ramadanPeriodFormSchema), defaultValues: emptyRamadanPeriodForm });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ramadan-periods'] });

  const saveMutation = useMutation({
    mutationFn: (values) => (editing?._id ? updateRamadanPeriod(editing._id, values) : createRamadanPeriod(values)),
    onSuccess: () => {
      toast.success(editing?._id ? 'Ramadan period updated.' : 'Ramadan period added.');
      setEditing(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRamadanPeriod(id),
    onSuccess: () => {
      toast.success(`${toDelete.label} removed.`);
      setToDelete(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openNew() {
    reset(emptyRamadanPeriodForm);
    setEditing({});
  }
  function openEdit(period) {
    reset(ramadanPeriodToForm(period));
    setEditing(period);
  }

  const columns = [
    { key: 'label', header: 'Period', render: (p) => <span className="font-medium text-text">{p.label}</span> },
    {
      key: 'dates',
      header: 'Dates',
      render: (p) => `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`,
    },
    {
      key: 'caps',
      header: 'Hour caps',
      hideOnMobile: true,
      render: (p) => `${p.dailyHours}h/day · ${p.weeklyHours}h/week`,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) =>
        canManage ? (
          <span className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToDelete(p)}>
              Delete
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Ramadan working hours</h2>
          <p className="mt-1 text-xs text-muted">
            The reduced-hours period and weekly cap used to calculate overtime — confirm the dates each year.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openNew}>
            Add period
          </Button>
        )}
      </div>

      {isError ? (
        <EmptyState
          title="Could not load Ramadan periods"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <Table
          columns={columns}
          rows={periods ?? []}
          rowKey={(p) => p._id}
          loading={isPending}
          emptyState={
            <EmptyState
              title="No Ramadan periods yet"
              description={
                canManage
                  ? 'Add this year’s dates so weekly timesheets during Ramadan use the reduced-hours cap.'
                  : 'HR has not added a Ramadan period yet.'
              }
              action={canManage && <Button variant="secondary" onClick={openNew}>Add period</Button>}
            />
          }
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit Ramadan period' : 'Add Ramadan period'}>
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-4">
          <Input label="Label *" placeholder="e.g. Ramadan 1447" error={errors.label?.message} {...register('label')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start date *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End date *" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Daily hour cap *" type="number" min="1" max="8" error={errors.dailyHours?.message} {...register('dailyHours')} />
            <Input label="Weekly hour cap *" type="number" min="6" max="48" error={errors.weeklyHours?.message} {...register('weeklyHours')} />
          </div>
          <p className="text-xs text-muted">
            Labor Law Article 98 sets the default at 6 hours/day, 36 hours/week — adjust only if company policy differs.
          </p>
          <Textarea label="Notes" placeholder="Optional" error={errors.notes?.message} {...register('notes')} />
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

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete Ramadan period?"
        message={`"${toDelete?.label}" will be removed. Timesheets already decided for weeks in this period keep their computed overtime; only future submissions are affected.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
