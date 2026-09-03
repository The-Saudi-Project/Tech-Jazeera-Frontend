/**
 * ApprovalsPage — Admin-only configuration of the company's Configurable
 * Approval Hierarchy: named ApprovalRoles (GM, COO, HR, BDM…, each holding
 * one or more staff accounts) and ApprovalWorkflows (ordered chains built
 * from those roles). Deciding an actual request happens on that request's
 * own review screen (LeavePage etc.) via the shared engine — this page is
 * configuration only.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listApprovalRoles,
  createApprovalRole,
  updateApprovalRole,
  listApprovalWorkflows,
  createApprovalWorkflow,
  updateApprovalWorkflow,
} from '../approvals.api.js';
import {
  approvalRoleFormSchema,
  emptyApprovalRoleForm,
  approvalRoleToForm,
  approvalWorkflowFormSchema,
  emptyApprovalWorkflowForm,
  approvalWorkflowToForm,
} from '../approvals.schema.js';
import { listStaffUsers } from '../../users/users.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { APPROVAL_REQUEST_TYPES, APPROVAL_REQUEST_TYPE_LABELS, APPROVALS_MANAGE_ROLES } from '../../../lib/constants.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

function ApprovalRolesPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit

  const { data: roles, isPending } = useQuery({ queryKey: ['approval-roles'], queryFn: listApprovalRoles });
  const { data: staffUsers } = useQuery({ queryKey: ['users', {}], queryFn: () => listStaffUsers({}) });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(approvalRoleFormSchema), defaultValues: emptyApprovalRoleForm });
  const members = watch('members') ?? [];

  function toggleMember(id) {
    setValue('members', members.includes(id) ? members.filter((m) => m !== id) : [...members, id]);
  }

  const saveMutation = useMutation({
    mutationFn: (values) => (editing?._id ? updateApprovalRole(editing._id, values) : createApprovalRole(values)),
    onSuccess: () => {
      toast.success(editing?._id ? 'Approval role updated.' : 'Approval role created.');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['approval-roles'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openNew() {
    reset(emptyApprovalRoleForm);
    setEditing({});
  }
  function openEdit(role) {
    reset(approvalRoleToForm(role));
    setEditing(role);
  }

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Approval roles</h2>
          <p className="mt-1 text-xs text-muted">
            Named roles in your hierarchy (GM, COO, HR, BDM…) — each holds one or more staff accounts.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          Add role
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : roles.length === 0 ? (
        <EmptyState title="No approval roles yet" description="Add one to start building your approval hierarchy." />
      ) : (
        <div className="divide-y divide-border">
          {roles.map((r) => (
            <button
              key={r._id}
              onClick={() => openEdit(r)}
              className="-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-bg/60"
            >
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted">
                  {r.members?.length ? r.members.map((m) => m.name).join(', ') : 'No members yet'}
                </p>
              </div>
              <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit approval role' : 'New approval role'}>
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-4">
          <Input label="Name *" placeholder="e.g. HR, BDM, COO" error={errors.name?.message} {...register('name')} />
          <Input label="Description" error={errors.description?.message} {...register('description')} />
          <div>
            <label className="mb-2 block text-sm font-medium">Members</label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {(staffUsers ?? []).length === 0 ? (
                <p className="px-1.5 py-1 text-sm text-muted">No staff accounts found.</p>
              ) : (
                (staffUsers ?? []).map((u) => (
                  <label key={u._id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-bg/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={members.includes(u._id)}
                      onChange={() => toggleMember(u._id)}
                    />
                    {u.name} <span className="text-xs text-muted">({u.role})</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('isActive')} />
            Active
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
    </Card>
  );
}

function ApprovalWorkflowsPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: workflows, isPending } = useQuery({ queryKey: ['approval-workflows'], queryFn: listApprovalWorkflows });
  const { data: roles } = useQuery({ queryKey: ['approval-roles'], queryFn: listApprovalRoles });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(approvalWorkflowFormSchema), defaultValues: emptyApprovalWorkflowForm });
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: 'steps' });
  const appliesTo = watch('appliesTo') ?? [];

  function toggleAppliesTo(type) {
    setValue('appliesTo', appliesTo.includes(type) ? appliesTo.filter((t) => t !== type) : [...appliesTo, type]);
  }
  function toggleStepRole(stepIndex, roleId) {
    const current = watch(`steps.${stepIndex}.roles`) ?? [];
    setValue(
      `steps.${stepIndex}.roles`,
      current.includes(roleId) ? current.filter((r) => r !== roleId) : [...current, roleId]
    );
  }

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing?._id ? updateApprovalWorkflow(editing._id, values) : createApprovalWorkflow(values),
    onSuccess: () => {
      toast.success(editing?._id ? 'Approval workflow updated.' : 'Approval workflow created.');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openNew() {
    reset(emptyApprovalWorkflowForm);
    setEditing({});
  }
  function openEdit(workflow) {
    reset(approvalWorkflowToForm(workflow));
    setEditing(workflow);
  }

  const noRoles = !roles?.length;

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Approval workflows</h2>
          <p className="mt-1 text-xs text-muted">
            Ordered chains built from your approval roles — any one member of a step's role(s) can decide it.
          </p>
        </div>
        <Button size="sm" onClick={openNew} disabled={noRoles} title={noRoles ? 'Add an approval role first' : undefined}>
          Add workflow
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No approval workflows yet"
          description={noRoles ? 'Add an approval role first, then build a chain from it.' : 'Add one to route requests through a multi-step chain.'}
        />
      ) : (
        <div className="divide-y divide-border">
          {workflows.map((wf) => (
            <button
              key={wf._id}
              onClick={() => openEdit(wf)}
              className="-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-bg/60"
            >
              <div>
                <p className="font-medium">{wf.name}</p>
                <p className="text-xs text-muted">
                  {wf.steps.map((s) => s.label || s.roles.map((r) => r.name).join('/')).join(' → ')}
                </p>
                {wf.appliesTo?.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted">
                    Default for: {wf.appliesTo.map((t) => APPROVAL_REQUEST_TYPE_LABELS[t]).join(', ')}
                  </p>
                )}
              </div>
              <Badge variant={wf.isActive ? 'success' : 'default'}>{wf.isActive ? 'Active' : 'Inactive'}</Badge>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit approval workflow' : 'New approval workflow'}
      >
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-4">
          <Input label="Name *" placeholder="e.g. Leave Chain" error={errors.name?.message} {...register('name')} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Steps, in order *</label>
              <Button type="button" size="sm" variant="secondary" onClick={() => appendStep({ label: '', roles: [] })}>
                Add step
              </Button>
            </div>
            <div className="space-y-3">
              {stepFields.map((field, i) => {
                const stepRoles = watch(`steps.${i}.roles`) ?? [];
                return (
                  <div key={field.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <Input
                        placeholder="Step label (optional, e.g. HR)"
                        className="flex-1"
                        aria-label={`Step ${i + 1} label`}
                        {...register(`steps.${i}.label`)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="hover:text-danger"
                        onClick={() => removeStep(i)}
                        aria-label="Remove step"
                      >
                        ✕
                      </Button>
                    </div>
                    <p className="mb-1 text-xs text-muted">Any ONE member of any role checked below can decide this step:</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {(roles ?? []).map((r) => (
                        <label key={r._id} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={stepRoles.includes(r._id)}
                            onChange={() => toggleStepRole(i, r._id)}
                          />
                          {r.name}
                        </label>
                      ))}
                    </div>
                    {errors.steps?.[i]?.roles?.message && (
                      <p className="mt-1 text-sm text-danger">{errors.steps[i].roles.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.steps?.message && <p className="mt-1 text-sm text-danger">{errors.steps.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Default for request types</label>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {APPROVAL_REQUEST_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={appliesTo.includes(t)}
                    onChange={() => toggleAppliesTo(t)}
                  />
                  {APPROVAL_REQUEST_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              Only one active workflow may default to a given request type — an individual employee's profile can
              still override this.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('isActive')} />
            Active
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
    </Card>
  );
}

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!APPROVALS_MANAGE_ROLES.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Approval Hierarchy"
        description="Define your company's approval roles and the multi-step chains Leave, Salary Advance, Reimbursement and Timesheet requests route through."
        onBack={() => navigate(-1)}
      />
      <ApprovalRolesPanel />
      <ApprovalWorkflowsPanel />
    </div>
  );
}
