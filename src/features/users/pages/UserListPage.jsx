/**
 * UserListPage — staff account management (P2-M2). Admin creates logins for
 * every staff role including Coordinator (Worker logins stay on the employee
 * profile, linked to a workforce record — see WorkerLoginPanel). Same
 * one-time-password-reveal pattern as P2-M1: the temp password is shown once
 * and never stored in plaintext.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listStaffUsers, createStaffUser, updateStaffUser } from '../users.api.js';
import { createStaffUserSchema, emptyCreateStaffUserForm } from '../users.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import {
  STAFF_ASSIGNABLE_ROLES,
  STAFF_USER_MANAGE_ROLES,
  COORDINATOR_MANAGER_ROLES,
} from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function UserListPage() {
  const { user: viewer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canManage = STAFF_USER_MANAGE_ROLES.includes(viewer.role);

  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(null); // one-time credential reveal

  const { data: users, isPending, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => listStaffUsers(),
  });

  const managers = (users ?? []).filter((u) => COORDINATOR_MANAGER_ROLES.includes(u.role));

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(createStaffUserSchema), defaultValues: emptyCreateStaffUserForm });
  const selectedRole = watch('role');

  const createMutation = useMutation({
    mutationFn: createStaffUser,
    onSuccess: (data) => {
      setCreateOpen(false);
      reset(emptyCreateStaffUserForm);
      setCreated(data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => updateStaffUser(id, { isActive }),
    onSuccess: () => {
      toast.success('User updated.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      toast.success('Temporary password copied.');
    } catch {
      toast.error('Could not copy — select and copy it manually.');
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <span className="font-medium text-text">
          {u.name}
          <span className="block text-xs font-normal text-muted">{u.email}</span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant="primary">{u.role}</Badge>
          {u.role === 'Coordinator' && u.managedBy && (
            <span className="text-xs text-muted">reports to {u.managedBy.name}</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>,
    },
    { key: 'createdAt', header: 'Created', hideOnMobile: true, render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) =>
        canManage && u._id !== viewer.id ? (
          <Button
            size="sm"
            variant="ghost"
            className={u.isActive ? 'hover:text-danger' : ''}
            isLoading={toggleActiveMutation.isPending}
            onClick={() => toggleActiveMutation.mutate({ id: u._id, isActive: !u.isActive })}
          >
            {u.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Team"
        description="Staff logins — Admin, Manager, HR, Operations, Accounts, Viewer, Coordinator. Worker logins are created from an employee profile instead."
        actions={canManage && <Button onClick={() => setCreateOpen(true)}>Create staff login</Button>}
      />

      {isError ? (
        <EmptyState
          title="Could not load users"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <Table columns={columns} rows={users ?? []} rowKey={(u) => u._id} loading={isPending} />
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create staff login">
        <form
          onSubmit={handleSubmit((values) =>
            createMutation.mutate({ ...values, managedBy: values.role === 'Coordinator' ? values.managedBy : undefined })
          )}
          noValidate
          className="space-y-4"
        >
          <Input label="Name *" error={errors.name?.message} {...register('name')} />
          <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
          <Select label="Role *" error={errors.role?.message} {...register('role')}>
            <option value="">Choose a role…</option>
            {STAFF_ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {selectedRole === 'Coordinator' && (
            <Select label="Reports to" error={errors.managedBy?.message} {...register('managedBy')}>
              <option value="">No manager set</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create login
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Staff login created">
        {created && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Hand these to <span className="font-medium text-text">{created.user.name}</span>. The temporary
              password is shown <span className="font-medium text-text">once</span> — copy it now.
            </p>
            <div className="rounded-lg border border-border bg-bg p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Email</p>
              <p className="mt-0.5 font-medium">{created.user.email}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Temporary password</p>
              <p className="mt-0.5 select-all break-all font-mono text-base font-semibold">{created.tempPassword}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={copyPassword}>
                Copy password
              </Button>
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
