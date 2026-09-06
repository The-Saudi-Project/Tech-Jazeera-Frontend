/**
 * DeploymentForm — used for both assigning and transferring.
 *
 * - Assign: pass `workers` (assignable list) → a worker <select> is shown and
 *   the assign schema (worker required) is used.
 * - Transfer: omit `workers` → no worker field, transfer schema is used.
 *
 * Notable pattern: the **site dropdown depends on the chosen client**. We
 * `watch('client')`, look up that client's embedded sites, and render them as
 * options; changing the client resets the site so a stale site from a
 * previous selection can't be submitted.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { assignFormSchema, transferFormSchema } from '../deployments.schema.js';
import { DEPLOYMENT_SHIFTS } from '../../../lib/constants.js';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function DeploymentForm({
  workers, // array → assign mode; undefined → transfer mode
  clients, // active clients, each with its embedded `sites`
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}) {
  const { t } = useTranslation();
  const isAssign = Array.isArray(workers);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isAssign ? assignFormSchema : transferFormSchema),
    defaultValues,
  });

  const selectedClientId = watch('client');
  const selectedClient = clients.find((c) => c._id === selectedClientId);
  const siteOptions = selectedClient?.sites ?? [];

  // Spread the client register but also clear the site when the client changes.
  const clientReg = register('client');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {isAssign && (
        <Select label={t('staffDeployments.form.workerLabel')} error={errors.worker?.message} {...register('worker')}>
          <option value="">{t('staffDeployments.form.selectWorker')}</option>
          {workers.map((w) => (
            <option key={w._id} value={w._id}>
              {w.fullName} ({w.employeeId})
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t('staffDeployments.form.clientLabel')}
          error={errors.client?.message}
          {...clientReg}
          onChange={(e) => {
            clientReg.onChange(e);
            setValue('site', ''); // reset site when client changes
          }}
        >
          <option value="">{t('staffDeployments.form.selectClient')}</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.companyName}
            </option>
          ))}
        </Select>

        <Select
          label={t('staffDeployments.form.siteLabel')}
          error={errors.site?.message}
          disabled={!selectedClient}
          {...register('site')}
        >
          <option value="">
            {selectedClient ? t('staffDeployments.form.selectSite') : t('staffDeployments.form.chooseClientFirst')}
          </option>
          {siteOptions.map((s) => (
            <option key={s._id ?? s.name} value={s.name}>
              {s.name}
              {s.city ? ` — ${s.city}` : ''}
            </option>
          ))}
        </Select>
      </div>

      {selectedClient && siteOptions.length === 0 && (
        <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
          {t('staffDeployments.form.noSitesWarning', { client: selectedClient.companyName })}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('staffDeployments.form.startDate')} type="date" error={errors.startDate?.message} {...register('startDate')} />
        <Select label={t('staffDeployments.form.shift')} error={errors.shift?.message} {...register('shift')}>
          {DEPLOYMENT_SHIFTS.map((s) => (
            <option key={s} value={s}>
              {t(`staffDeployments.shiftLabels.${s}`, s)}
            </option>
          ))}
        </Select>
        <Input label={t('staffDeployments.form.vehicle')} placeholder={t('staffDeployments.form.vehiclePlaceholder')} error={errors.vehicle?.message} {...register('vehicle')} />
        <Input label={t('staffDeployments.form.driver')} placeholder={t('staffDeployments.form.driverPlaceholder')} error={errors.driver?.message} {...register('driver')} />
      </div>

      <Textarea label={t('staffDeployments.form.notes')} rows={2} error={errors.notes?.message} {...register('notes')} />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
