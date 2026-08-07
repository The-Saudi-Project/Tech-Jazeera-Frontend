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
        <Select label="Worker *" error={errors.worker?.message} {...register('worker')}>
          <option value="">Select an unassigned worker…</option>
          {workers.map((w) => (
            <option key={w._id} value={w._id}>
              {w.fullName} ({w.employeeId})
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Client *"
          error={errors.client?.message}
          {...clientReg}
          onChange={(e) => {
            clientReg.onChange(e);
            setValue('site', ''); // reset site when client changes
          }}
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.companyName}
            </option>
          ))}
        </Select>

        <Select
          label="Site *"
          error={errors.site?.message}
          disabled={!selectedClient}
          {...register('site')}
        >
          <option value="">
            {selectedClient ? 'Select a site…' : 'Choose a client first'}
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
          {selectedClient.companyName} has no sites yet. Add a site to the client before deploying
          workers there.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Start date *" type="date" error={errors.startDate?.message} {...register('startDate')} />
        <Select label="Shift" error={errors.shift?.message} {...register('shift')}>
          {DEPLOYMENT_SHIFTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input label="Vehicle" placeholder="Plate / unit no." error={errors.vehicle?.message} {...register('vehicle')} />
        <Input label="Driver" placeholder="Driver name" error={errors.driver?.message} {...register('driver')} />
      </div>

      <Textarea label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
