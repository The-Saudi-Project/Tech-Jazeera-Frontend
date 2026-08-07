/**
 * EmployeeForm — one form, two uses: create (blank defaults) and edit
 * (defaults from employeeToForm). The page owns the mutation; this component
 * owns fields + validation. That split means create/edit can never drift
 * apart in layout or rules.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { employeeFormSchema } from '../employees.schema.js';
import { EMPLOYEE_STATUSES } from '../../../lib/constants.js';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';
import Card from '../../../components/ui/Card.jsx';

/** The five identity documents, rendered uniformly from this config. */
const DOCUMENTS = [
  ['passport', 'Passport'],
  ['visa', 'Visa'],
  ['iqama', 'Iqama'],
  ['medical', 'Medical'],
  ['drivingLicense', 'Driving License'],
];

/** Section wrapper: consistent heading + responsive field grid. */
function Section({ title, children }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function EmployeeForm({ defaultValues, onSubmit, submitLabel, submitting }) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(employeeFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Section title="Personal details">
        <Input label="Employee ID *" placeholder="AJ-001" error={errors.employeeId?.message} {...register('employeeId')} />
        <Input label="Full name *" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Nationality *" error={errors.nationality?.message} {...register('nationality')} />
        <Input label="Mobile *" placeholder="+966 5x xxx xxxx" error={errors.mobile?.message} {...register('mobile')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      </Section>

      <Section title="Employment">
        <Input label="Joining date *" type="date" error={errors.joiningDate?.message} {...register('joiningDate')} />
        <Input label="Designation *" placeholder="Electrician" error={errors.designation?.message} {...register('designation')} />
        <Input label="Department" placeholder="Maintenance" error={errors.department?.message} {...register('department')} />
        <Input label="Salary (SAR/month) *" type="number" min="0" step="50" error={errors.salary?.message} {...register('salary')} />
        <Input label="Accommodation" placeholder="Company camp, room 12" error={errors.accommodation?.message} {...register('accommodation')} />
        <Select label="Status" error={errors.status?.message} {...register('status')}>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Section>

      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Documents</h2>
        <p className="mb-4 text-sm text-muted">
          Leave blank if not issued yet — expiry dates drive the renewal alerts.
        </p>
        <div className="space-y-4">
          {DOCUMENTS.map(([key, label]) => (
            <div key={key} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={`${label} number`}
                error={errors[key]?.number?.message}
                {...register(`${key}.number`)}
              />
              <Input
                label={`${label} expiry`}
                type="date"
                error={errors[key]?.expiry?.message}
                {...register(`${key}.expiry`)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Section title="Emergency contact">
        <Input label="Name" error={errors.emergencyContact?.name?.message} {...register('emergencyContact.name')} />
        <Input label="Phone" error={errors.emergencyContact?.phone?.message} {...register('emergencyContact.phone')} />
        <Input label="Relation" placeholder="Wife, brother…" error={errors.emergencyContact?.relation?.message} {...register('emergencyContact.relation')} />
      </Section>

      <Card>
        <Textarea label="Notes" placeholder="Certifications, restrictions, anything the office should know." error={errors.notes?.message} {...register('notes')} />
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
