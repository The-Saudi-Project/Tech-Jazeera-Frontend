/**
 * MobilisationForm — Section 1 fields (worker/job/client billing/subcontractor/
 * overtime/dates), used by both the New and Edit pages. Section 2 (Marketing
 * Manager's quotation/PO fields) and the submit/decide actions land in later
 * milestones, on a detail page this form doesn't yet know about.
 *
 * The subcontractor block only appears once "Routed through a subcontractor"
 * is checked — same reveal-on-toggle pattern as DeploymentForm's
 * client-dependent site dropdown.
 */
import { forwardRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mobilisationFormSchema } from '../mobilisations.schema.js';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';

// forwardRef is required here — react-hook-form's register() spreads a ref
// callback onto this element to manage it as an uncontrolled input; a plain
// function component drops that ref silently (React warns, and the field
// stops being registered correctly).
const Checkbox = forwardRef(function Checkbox({ label, ...props }, ref) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input ref={ref} type="checkbox" className="h-4 w-4 rounded border-border" {...props} />
      {label}
    </label>
  );
});

export default function MobilisationForm({
  workers,
  clients,
  subcontractors,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(mobilisationFormSchema), defaultValues });

  const hasSubcontractor = useWatch({ control, name: 'hasSubcontractor' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Worker & job</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Worker *" error={errors.worker?.message} {...register('worker')}>
            <option value="">Select a worker…</option>
            {workers.map((w) => (
              <option key={w._id} value={w._id}>
                {w.fullName} ({w.employeeId})
              </option>
            ))}
          </Select>
          <Input label="Job title *" placeholder="e.g. Site Driver" error={errors.jobTitle?.message} {...register('jobTitle')} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Client & billing</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Client *" error={errors.client?.message} {...register('client')}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName}
              </option>
            ))}
          </Select>
          <Input label="Client rate (SAR)" type="number" step="0.01" min="0" error={errors.clientRate?.message} {...register('clientRate')} />
          <Input label="Client commission (SAR)" type="number" step="0.01" min="0" error={errors.clientCommission?.message} {...register('clientCommission')} />
          <Input label="FTA allowance (SAR)" type="number" step="0.01" min="0" error={errors.ftaAllowance?.message} {...register('ftaAllowance')} />
        </div>
        <Checkbox label="Client requires a timesheet" {...register('clientTimesheetRequired')} />
      </section>

      <section className="space-y-4">
        <Checkbox label="Routed through a subcontractor" {...register('hasSubcontractor')} />
        {hasSubcontractor && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Subcontractor *" error={errors.subcontractor?.message} {...register('subcontractor')}>
              <option value="">Select a subcontractor…</option>
              {subcontractors.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="Subcontractor commission (SAR)"
              type="number"
              step="0.01"
              min="0"
              error={errors.subcontractorCommission?.message}
              {...register('subcontractorCommission')}
            />
            <Checkbox label="Subcontractor requires a timesheet" {...register('subcontractorTimesheetRequired')} />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Economics & dates</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Input label="Profit (SAR)" type="number" step="0.01" error={errors.profit?.message} {...register('profit')} />
            <p className="mt-1 text-xs text-muted">Entered directly — not auto-calculated yet.</p>
          </div>
          <Input label="Mobilisation date *" type="date" error={errors.mobilisationDate?.message} {...register('mobilisationDate')} />
          <Input label="Checkout date" type="date" error={errors.checkoutDate?.message} {...register('checkoutDate')} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Overtime</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Overtime rate (SAR)" type="number" step="0.01" min="0" error={errors.overtimeRate?.message} {...register('overtimeRate')} />
          <Input label="Overtime hours" type="number" step="0.01" min="0" error={errors.overtimeHours?.message} {...register('overtimeHours')} />
          <Input label="OT amount (SAR)" type="number" step="0.01" error={errors.otAmount?.message} {...register('otAmount')} />
          <Input label="OT commission in (SAR)" type="number" step="0.01" error={errors.otCommissionIn?.message} {...register('otCommissionIn')} />
          <Input label="OT commission out (SAR)" type="number" step="0.01" error={errors.otCommissionOut?.message} {...register('otCommissionOut')} />
        </div>
      </section>

      <Textarea label="Remark" placeholder="Optional" error={errors.remark?.message} {...register('remark')} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
