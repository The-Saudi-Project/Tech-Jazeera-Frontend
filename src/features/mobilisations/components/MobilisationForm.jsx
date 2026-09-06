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
import { forwardRef, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mobilisationFormSchema } from '../mobilisations.schema.js';
import { createJobTitle } from '../../jobTitles/jobTitles.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';

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
  jobTitles,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(mobilisationFormSchema), defaultValues });

  const hasSubcontractor = useWatch({ control, name: 'hasSubcontractor' });

  const [addingJobTitle, setAddingJobTitle] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  // The list invalidation refetches asynchronously, so the new <option> isn't
  // in the DOM yet at the moment createJobTitle resolves — selecting it here
  // would silently no-op. Defer the actual selection until jobTitles (the
  // prop, refreshed by the invalidated query) really contains it.
  const [pendingJobTitle, setPendingJobTitle] = useState(null);
  const addJobTitleMutation = useMutation({
    mutationFn: () => createJobTitle(newJobTitle.trim()),
    onSuccess: (created) => {
      toast.success(t('staffMobilisations.form.jobTitleAddedToast', { name: created.name }));
      queryClient.invalidateQueries({ queryKey: ['job-titles'] });
      setPendingJobTitle(created.name);
      setAddingJobTitle(false);
      setNewJobTitle('');
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  useEffect(() => {
    if (pendingJobTitle && jobTitles.some((jt) => jt.name === pendingJobTitle)) {
      setValue('jobTitle', pendingJobTitle, { shouldValidate: true, shouldDirty: true });
      setPendingJobTitle(null);
    }
  }, [jobTitles, pendingJobTitle, setValue]);

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.form.sectionWorkerJob')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label={t('staffMobilisations.form.workerLabel')} error={errors.worker?.message} {...register('worker')}>
            <option value="">{t('staffMobilisations.form.selectWorker')}</option>
            {workers.map((w) => (
              <option key={w._id} value={w._id}>
                {w.fullName} ({w.employeeId})
              </option>
            ))}
          </Select>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-text">{t('staffMobilisations.form.jobTitleLabel')}</label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setAddingJobTitle(true)}
              >
                {t('staffMobilisations.form.addNew')}
              </button>
            </div>
            <Select error={errors.jobTitle?.message} {...register('jobTitle')}>
              <option value="">{t('staffMobilisations.form.selectJobTitle')}</option>
              {jobTitles.map((jt) => (
                <option key={jt._id} value={jt.name}>
                  {jt.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.form.sectionClientBilling')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label={t('staffMobilisations.form.clientLabel')} error={errors.client?.message} {...register('client')}>
            <option value="">{t('staffMobilisations.form.selectClient')}</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName}
              </option>
            ))}
          </Select>
          <Input label={t('staffMobilisations.form.clientRate')} type="number" step="0.01" min="0" error={errors.clientRate?.message} {...register('clientRate')} />
          <Input label={t('staffMobilisations.form.clientCommission')} type="number" step="0.01" min="0" error={errors.clientCommission?.message} {...register('clientCommission')} />
          <Input label={t('staffMobilisations.form.ftaAllowance')} type="number" step="0.01" min="0" error={errors.ftaAllowance?.message} {...register('ftaAllowance')} />
        </div>
        <Checkbox label={t('staffMobilisations.form.clientTimesheetRequired')} {...register('clientTimesheetRequired')} />
      </section>

      <section className="space-y-4">
        <Checkbox label={t('staffMobilisations.form.routedThroughSubcontractor')} {...register('hasSubcontractor')} />
        {hasSubcontractor && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label={t('staffMobilisations.form.subcontractorLabel')} error={errors.subcontractor?.message} {...register('subcontractor')}>
              <option value="">{t('staffMobilisations.form.selectSubcontractor')}</option>
              {subcontractors.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label={t('staffMobilisations.form.subcontractorCommission')}
              type="number"
              step="0.01"
              min="0"
              error={errors.subcontractorCommission?.message}
              {...register('subcontractorCommission')}
            />
            <Checkbox label={t('staffMobilisations.form.subcontractorTimesheetRequired')} {...register('subcontractorTimesheetRequired')} />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.form.sectionEconomicsDates')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Input label={t('staffMobilisations.form.profit')} type="number" step="0.01" error={errors.profit?.message} {...register('profit')} />
            <p className="mt-1 text-xs text-muted">{t('staffMobilisations.form.profitHint')}</p>
          </div>
          <Input label={t('staffMobilisations.form.mobilisationDate')} type="date" error={errors.mobilisationDate?.message} {...register('mobilisationDate')} />
          <Input label={t('staffMobilisations.form.checkoutDate')} type="date" error={errors.checkoutDate?.message} {...register('checkoutDate')} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.form.sectionOvertime')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('staffMobilisations.form.overtimeRate')} type="number" step="0.01" min="0" error={errors.overtimeRate?.message} {...register('overtimeRate')} />
          <Input label={t('staffMobilisations.form.overtimeHours')} type="number" step="0.01" min="0" error={errors.overtimeHours?.message} {...register('overtimeHours')} />
          <Input label={t('staffMobilisations.form.otAmount')} type="number" step="0.01" error={errors.otAmount?.message} {...register('otAmount')} />
          <Input label={t('staffMobilisations.form.otCommissionIn')} type="number" step="0.01" error={errors.otCommissionIn?.message} {...register('otCommissionIn')} />
          <Input label={t('staffMobilisations.form.otCommissionOut')} type="number" step="0.01" error={errors.otCommissionOut?.message} {...register('otCommissionOut')} />
        </div>
      </section>

      <Textarea label={t('staffMobilisations.form.remark')} placeholder={t('common.optional')} error={errors.remark?.message} {...register('remark')} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>

    <Modal open={addingJobTitle} onClose={() => setAddingJobTitle(false)} title={t('staffMobilisations.form.addJobTitleModalTitle')}>
      <div className="flex flex-col gap-4">
        <Input
          label={t('staffMobilisations.form.jobTitleFieldLabel')}
          placeholder={t('staffMobilisations.form.jobTitlePlaceholder')}
          value={newJobTitle}
          onChange={(e) => setNewJobTitle(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddingJobTitle(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => addJobTitleMutation.mutate()}
            isLoading={addJobTitleMutation.isPending}
            disabled={!newJobTitle.trim()}
          >
            {t('common.add')}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
}
