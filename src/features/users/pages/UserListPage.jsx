/**
 * UserListPage — account management (P2-M2). Admin creates logins for every
 * staff role including Coordinator, AND for an Employee (a Worker login
 * linked to a workforce record) from this same screen — picking "Employee"
 * swaps the form to an employee picker and reuses employees.api.js's
 * createEmployeeLogin under the hood, since that's the only way a Worker
 * login can exist (it's meaningless without the Employee it's linked to).
 * Same one-time-password-reveal pattern as P2-M1: the temp password is
 * shown once and never stored in plaintext.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listStaffUsers, createStaffUser, updateStaffUser, resetStaffPassword, deleteStaffUser } from '../users.api.js';
import { createLoginFormSchema, emptyCreateLoginForm, CREATE_LOGIN_ROLES } from '../users.schema.js';
import { listEmployees, createEmployeeLogin } from '../../employees/employees.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import { STAFF_USER_MANAGE_ROLES, COORDINATOR_MANAGER_ROLES } from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
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
  } = useForm({ resolver: zodResolver(createLoginFormSchema), defaultValues: emptyCreateLoginForm });
  const selectedRole = watch('role');

  // Only fetched once "Employee" is actually picked — no point loading the
  // whole workforce register for the common case of provisioning staff.
  const { data: employeesData } = useQuery({
    queryKey: ['employees', { forLogin: true }],
    queryFn: () => listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
    enabled: selectedRole === 'Employee',
  });

  const createMutation = useMutation({
    mutationFn: (values) =>
      values.role === 'Employee'
        ? createEmployeeLogin(values.employeeId, values.email ? { email: values.email } : {})
        : createStaffUser({
            name: values.name,
            email: values.email,
            role: values.role,
            managedBy: values.role === 'Coordinator' ? values.managedBy : undefined,
          }),
    onSuccess: (data) => {
      setCreateOpen(false);
      reset(emptyCreateLoginForm);
      setCreated(data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Employee.login summary changed
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

  // Reveals through the same one-time-password modal as creation — the
  // response only carries { tempPassword }, so the row's own name/email
  // (already in hand at click time) fills in the rest of that modal's shape.
  const resetPasswordMutation = useMutation({
    mutationFn: (u) => resetStaffPassword(u._id).then((data) => ({ user: u, ...data, reset: true })),
    onSuccess: (data) => setCreated(data),
    onError: (error) => toast.error(apiMessage(error)),
  });

  const [toDelete, setToDelete] = useState(null);
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteStaffUser(id),
    onSuccess: () => {
      toast.success(`${toDelete.name} deleted.`);
      setToDelete(null);
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
          <span className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              isLoading={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate(u)}
            >
              Reset password
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={u.isActive ? 'hover:text-danger' : ''}
              isLoading={toggleActiveMutation.isPending}
              onClick={() => toggleActiveMutation.mutate({ id: u._id, isActive: !u.isActive })}
            >
              {u.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
            <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToDelete(u)}>
              Delete
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Team"
        description="Staff logins (Admin, Manager, HR, Accounts, Coordinator) and Employee (Worker) logins, all from one place."
        actions={canManage && <Button onClick={() => setCreateOpen(true)}>Create login</Button>}
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create login">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate className="space-y-4">
          <Select label="Role *" error={errors.role?.message} {...register('role')}>
            <option value="">Choose a role…</option>
            {CREATE_LOGIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>

          {selectedRole === 'Employee' ? (
            <>
              <Select label="Employee *" error={errors.employeeId?.message} {...register('employeeId')}>
                <option value="">Choose an employee…</option>
                {(employeesData?.items ?? []).map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </Select>
              <Input
                label="Email"
                type="email"
                placeholder="Defaults to the employee's own email if left blank"
                error={errors.email?.message}
                {...register('email')}
              />
            </>
          ) : (
            <>
              <Input label="Name *" error={errors.name?.message} {...register('name')} />
              <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
            </>
          )}

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

      <Modal open={!!created} onClose={() => setCreated(null)} title={created?.reset ? 'Password reset' : 'Login created'}>
        {created && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {created.reset ? (
                <>
                  Their old password no longer works. Hand this new one to{' '}
                  <span className="font-medium text-text">{created.user.name}</span> — it's shown{' '}
                  <span className="font-medium text-text">once</span>, copy it now.
                </>
              ) : (
                <>
                  Hand these to <span className="font-medium text-text">{created.user.name}</span>. The temporary
                  password is shown <span className="font-medium text-text">once</span> — copy it now.
                </>
              )}
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

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete login?"
        message={`${toDelete?.name} (${toDelete?.email}) will be permanently removed — this cannot be undone. To just remove access while keeping the account, use Deactivate instead.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
