/**
 * ClientForm — shared by create & edit. The notable pattern here is the
 * dynamic **sites** list via react-hook-form's `useFieldArray`: the user adds
 * and removes site rows, and RHF tracks them as an array. This is the M5
 * addition to the form toolkit (M4 had only flat/nested-object fields).
 */
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { clientFormSchema } from '../clients.schema.js';
import { CLIENT_STATUSES } from '../../../lib/constants.js';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';
import Card from '../../../components/ui/Card.jsx';

function Section({ title, description, children }) {
  return (
    <Card>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function ClientForm({ defaultValues, onSubmit, submitLabel, submitting }) {
  const navigate = useNavigate();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(clientFormSchema), defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'sites' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Section title="Company">
        <Input label="Company name *" error={errors.companyName?.message} {...register('companyName')} />
        <Input label="Industry" placeholder="Construction, Facilities…" error={errors.industry?.message} {...register('industry')} />
        <Input label="Contact person" error={errors.contactPerson?.message} {...register('contactPerson')} />
        <Input label="Phone" placeholder="+966 1x xxx xxxx" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Select label="Status" error={errors.status?.message} {...register('status')}>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Section>

      <Section title="Legal & address" description="Saudi VAT is 15 digits; Commercial Registration is 10 digits.">
        <Input label="VAT number" placeholder="3xxxxxxxxxxxxx3" error={errors.vatNumber?.message} {...register('vatNumber')} />
        <Input label="Commercial Registration" placeholder="10 digits" error={errors.crNumber?.message} {...register('crNumber')} />
        <Input label="Address" className="sm:col-span-2" error={errors.address?.message} {...register('address')} />
      </Section>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sites</h2>
            <p className="mt-1 text-sm text-muted">Locations or projects where workers are deployed.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => append({ name: '', city: '', address: '' })}>
            Add site
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
            No sites added yet. Add the locations where this client's workers are based.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
                <Input placeholder="Site name *" error={errors.sites?.[index]?.name?.message} {...register(`sites.${index}.name`)} />
                <Input placeholder="City" {...register(`sites.${index}.city`)} />
                <Input placeholder="Address" {...register(`sites.${index}.address`)} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:text-danger"
                  onClick={() => remove(index)}
                  aria-label={`Remove site ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Textarea label="Notes" placeholder="Payment terms, key contacts, history…" error={errors.notes?.message} {...register('notes')} />
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
