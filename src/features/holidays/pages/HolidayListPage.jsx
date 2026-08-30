/**
 * HolidayListPage — the company holiday calendar (P3-B). Every staff role and
 * Worker can view it (mirrors the Leave-types read-open pattern); only
 * Admin/Manager/HR can add, edit, or remove an entry.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listHolidays, createHoliday, updateHoliday, deleteHoliday } from '../holidays.api.js';
import { holidayFormSchema, emptyHolidayForm, holidayToForm } from '../holidays.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import { HOLIDAY_MANAGE_ROLES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import RamadanPeriodsSection from '../../ramadan/components/RamadanPeriodsSection.jsx';

export default function HolidayListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canManage = HOLIDAY_MANAGE_ROLES.includes(user.role);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [toDelete, setToDelete] = useState(null);

  const { data: holidays, isPending, isError, refetch } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => listHolidays(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(holidayFormSchema), defaultValues: emptyHolidayForm });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['holidays'] });

  const saveMutation = useMutation({
    mutationFn: (values) => (editing?._id ? updateHoliday(editing._id, values) : createHoliday(values)),
    onSuccess: () => {
      toast.success(editing?._id ? 'Holiday updated.' : 'Holiday added.');
      setEditing(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteHoliday(id),
    onSuccess: () => {
      toast.success(`${toDelete.name} removed.`);
      setToDelete(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openNew() {
    reset(emptyHolidayForm);
    setEditing({});
  }
  function openEdit(holiday) {
    reset(holidayToForm(holiday));
    setEditing(holiday);
  }

  function dayCount(holiday) {
    const days = Math.round((new Date(holiday.endDate) - new Date(holiday.startDate)) / 86_400_000) + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  const columns = [
    {
      key: 'name',
      header: 'Holiday',
      render: (h) => (
        <span className="font-medium text-text">
          {h.name}
          {!h.isPaid && <Badge variant="default" className="ml-2">Unpaid</Badge>}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (h) =>
        h.startDate.slice(0, 10) === h.endDate.slice(0, 10)
          ? formatDate(h.startDate)
          : `${formatDate(h.startDate)} – ${formatDate(h.endDate)}`,
    },
    { key: 'days', header: 'Length', hideOnMobile: true, render: (h) => dayCount(h) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (h) =>
        canManage ? (
          <span className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToDelete(h)}>
              Delete
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Holidays & Ramadan"
        description="The official public holiday calendar, plus the Ramadan reduced-hours period used for overtime."
        actions={
          canManage && (
            <Button size="sm" onClick={openNew}>
              Add holiday
            </Button>
          )
        }
      />

      {isError ? (
        <EmptyState
          title="Could not load holidays"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <Table
          columns={columns}
          rows={holidays ?? []}
          rowKey={(h) => h._id}
          loading={isPending}
          emptyState={
            <EmptyState
              title="No holidays yet"
              description={
                canManage
                  ? 'Add National Day, Eid, and any other paid observance so they show up across the app.'
                  : 'HR has not added any holidays yet.'
              }
              action={
                canManage && (
                  <Button variant="secondary" onClick={openNew}>
                    Add holiday
                  </Button>
                )
              }
            />
          }
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit holiday' : 'Add holiday'}>
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-4">
          <Input label="Name *" placeholder="e.g. Eid al-Fitr" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start date *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End date *" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
          <Textarea label="Notes" placeholder="Optional" error={errors.notes?.message} {...register('notes')} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('isPaid')} />
            Paid holiday
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

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete holiday?"
        message={`"${toDelete?.name}" will be permanently removed from the calendar.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />

      {/* P3-E: a second, related calendar-configuration section on the same
          page — see RamadanPeriodsSection's own doc comment for why this
          isn't a separate nav item. */}
      <div className="mt-10 border-t border-border pt-8">
        <RamadanPeriodsSection />
      </div>
    </div>
  );
}
