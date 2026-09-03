/**
 * SubcontractorListPage — the managed list of companies a Mobilisation can
 * be routed through. Same "list + modal" shape as ExpenseListPage/
 * HolidayListPage — no sub-workflow here, just records.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listSubcontractors,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractor,
} from '../subcontractors.api.js';
import { subcontractorFormSchema, emptySubcontractorForm, subcontractorToForm } from '../subcontractors.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage } from '../../../lib/utils.js';
import { SUBCONTRACTOR_STATUSES, SUBCONTRACTOR_WRITE_ROLES, SUBCONTRACTOR_DELETE_ROLES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function SubcontractorListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canWrite = SUBCONTRACTOR_WRITE_ROLES.includes(user.role);
  const canDelete = SUBCONTRACTOR_DELETE_ROLES.includes(user.role);

  const [search, setSearch] = useState('');
  const [params, setParams] = useState({ page: 1, limit: 20, search: '', status: '' });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => (p.search === search ? p : { ...p, search, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['subcontractors', params],
    queryFn: () =>
      listSubcontractors({
        page: params.page,
        limit: params.limit,
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
      }),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(subcontractorFormSchema), defaultValues: emptySubcontractorForm });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subcontractors'] });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing?._id ? updateSubcontractor(editing._id, values) : createSubcontractor(values),
    onSuccess: () => {
      toast.success(editing?._id ? 'Subcontractor updated.' : 'Subcontractor added.');
      closeModal();
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSubcontractor(id),
    onSuccess: () => {
      toast.success(`${toDelete.name} removed.`);
      setToDelete(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openNew() {
    reset(emptySubcontractorForm);
    setEditing({});
  }
  function openEdit(subcontractor) {
    reset(subcontractorToForm(subcontractor));
    setEditing(subcontractor);
  }
  function closeModal() {
    setEditing(null);
  }

  const columns = [
    { key: 'name', header: 'Name', render: (s) => s.name },
    { key: 'contactPerson', header: 'Contact', hideOnMobile: true, render: (s) => s.contactPerson || '—' },
    { key: 'phone', header: 'Phone', hideOnMobile: true, render: (s) => s.phone || '—' },
    { key: 'email', header: 'Email', hideOnMobile: true, render: (s) => s.email || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge variant={s.status === 'Active' ? 'success' : 'default'}>{s.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <span className="flex justify-end gap-2">
          {canWrite && (
            <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToDelete(s)}>
              Delete
            </Button>
          )}
        </span>
      ),
    },
  ];

  const noFilters = !params.search && !params.status;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Subcontractors"
        description="Companies a mobilisation is sometimes routed through."
        actions={
          canWrite && (
            <Button size="sm" onClick={openNew}>
              Add subcontractor
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          placeholder="Search name, contact, phone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search subcontractors"
        />
        <Select
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="sm:max-w-[160px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {SUBCONTRACTOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <EmptyState
          title="Could not load subcontractors"
          description="Please try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(s) => s._id}
            loading={isPending}
            emptyState={
              <EmptyState
                title={noFilters ? 'No subcontractors yet' : 'No subcontractors match'}
                description={
                  noFilters
                    ? canWrite
                      ? 'Add one when a mobilisation needs to be routed through a subcontractor.'
                      : 'Nothing has been added yet.'
                    : 'Try clearing the search or filters.'
                }
                action={canWrite && noFilters && <Button variant="secondary" onClick={openNew}>Add subcontractor</Button>}
              />
            }
          />

          {data && data.total > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <span>
                Showing {(data.page - 1) * params.limit + 1}–{Math.min(data.page * params.limit, data.total)} of {data.total}
              </span>
              <span className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}>
                  Previous
                </Button>
                <span className="tabular-nums">
                  {data.page} / {data.pages}
                </span>
                <Button size="sm" variant="secondary" disabled={data.page >= data.pages} onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}>
                  Next
                </Button>
              </span>
            </div>
          )}
        </>
      )}

      <Modal open={!!editing} onClose={closeModal} title={editing?._id ? 'Edit subcontractor' : 'Add subcontractor'} size="lg">
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name *" error={errors.name?.message} {...register('name')} />
            <Input label="Contact person" error={errors.contactPerson?.message} {...register('contactPerson')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Select label="Status" error={errors.status?.message} {...register('status')}>
              {SUBCONTRACTOR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Textarea label="Notes" placeholder="Optional" error={errors.notes?.message} {...register('notes')} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saveMutation.isPending}>
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
        title="Delete subcontractor?"
        message={`${toDelete?.name} will be permanently removed.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
