/**
 * CompanySettingsPage — the company's own legal/contact/bank identity, used
 * as the letterhead on every generated PDF (invoices, quotations, EOSB
 * settlements, certificates, payslips). Edit access is dynamic (Admin,
 * Manager, or a member of an admin-picked set of ApprovalRoles — e.g. BDM/
 * COO/GM), so this page is visible to every staff role in the nav and a
 * non-eligible viewer sees this page's own explained 403, not a route
 * redirect — same pattern as the Approval Log.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCompanySettings,
  updateCompanySettings,
  updateManageRoles,
} from '../companySettings.api.js';
import { companySettingsFormSchema, companySettingsToForm } from '../companySettings.schema.js';
import { listApprovalRoles } from '../../approvals/approvals.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import CompanyLogoCard from '../components/CompanyLogoCard.jsx';

function Field({ name, label, register, errors, type = 'text' }) {
  return <Input label={label} type={type} error={errors[name]?.message} {...register(name)} />;
}

function RoleChecklist({ roles, selected, onToggle }) {
  if (roles.length === 0) {
    return (
      <p className="px-1.5 py-1 text-sm text-muted">
        No approval roles configured yet — add one on the Approval Hierarchy page first.
      </p>
    );
  }
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
      {roles.map((r) => (
        <label key={r._id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-bg/60">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={selected.includes(r._id)}
            onChange={() => onToggle(r._id)}
          />
          {r.name}
        </label>
      ))}
    </div>
  );
}

/** Admin-only — who else, besides Admin/Manager, can edit this page. */
function ManageAccessCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['company-settings'], queryFn: getCompanySettings });
  const { data: roles, isPending: rolesLoading } = useQuery({
    queryKey: ['approval-roles'],
    queryFn: listApprovalRoles,
  });
  const [manageRoles, setManageRoles] = useState([]);

  useEffect(() => {
    if (!settings) return;
    setManageRoles((settings.manageRoles ?? []).map((r) => r._id));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateManageRoles(manageRoles),
    onSuccess: () => {
      toast.success('Access list saved.');
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function toggle(id) {
    setManageRoles((list) => (list.includes(id) ? list.filter((r) => r !== id) : [...list, id]));
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Who else can manage this page</h2>
      <p className="mt-1 mb-2 text-xs text-muted">
        Admin and Manager can always edit company settings. Add approval roles here (e.g. BDM, COO, GM) to let their
        members edit it too — deciding who gets that access is kept Admin-only on purpose.
      </p>
      {rolesLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <RoleChecklist roles={roles ?? []} selected={manageRoles} onToggle={toggle} />
      )}
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function CompanySettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isPending, isError, error } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(companySettingsFormSchema), defaultValues: companySettingsToForm(null) });

  useEffect(() => {
    if (settings) reset(companySettingsToForm(settings));
  }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: () => {
      toast.success('Company settings saved.');
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Company Settings" onBack={() => navigate(-1)} />
        <EmptyState
          title="You don't have access to this page"
          description={apiMessage(error) || 'Company settings can only be managed by Admin, Manager, or a role added to the access list.'}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Company Settings"
        description="Your company's own identity — printed as the letterhead on every generated document."
        onBack={() => navigate(-1)}
      />

      <CompanyLogoCard />

      <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Legal identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="companyName" label="Company name (English)" register={register} errors={errors} />
            <Field name="companyNameAr" label="Company name (Arabic)" register={register} errors={errors} />
            <Field name="crNumber" label="CR number" register={register} errors={errors} />
            <Field name="vatNumber" label="VAT registration number" register={register} errors={errors} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Contact & address</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="address" label="Address" register={register} errors={errors} />
            <Field name="phone" label="Phone" register={register} errors={errors} />
            <Field name="email" label="Email" type="email" register={register} errors={errors} />
            <Field name="website" label="Website" register={register} errors={errors} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Bank details</h2>
          <p className="mb-4 text-xs text-muted">Shown as payment instructions on an unpaid invoice.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="bankName" label="Bank name" register={register} errors={errors} />
            <Field name="bankIban" label="IBAN" register={register} errors={errors} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Authorized signatory</h2>
          <p className="mb-4 text-xs text-muted">Printed on certificates and official letters.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="signatoryName" label="Name" register={register} errors={errors} />
            <Field name="signatoryTitle" label="Title" register={register} errors={errors} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={saveMutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>

      {user.role === 'Admin' && <ManageAccessCard />}
    </div>
  );
}
