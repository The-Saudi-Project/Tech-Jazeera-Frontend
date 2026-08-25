/**
 * EmployeeForm — one form, two uses: create (blank defaults) and edit
 * (defaults from employeeToForm). The page owns the mutation; this component
 * owns fields + validation. That split means create/edit can never drift
 * apart in layout or rules.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeFormSchema } from '../employees.schema.js';
import { listStaffUsers } from '../../users/users.api.js';
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
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(employeeFormSchema), defaultValues });

  // P2-M2: who this employee's day-to-day (leave, expiry follow-up) reports
  // to. The list call itself is the access check — Accounts can't reach it
  // and never renders this field meaningfully, but it also never renders
  // EmployeeForm (write-gated by the pages that use it).
  const { data: coordinators } = useQuery({
    queryKey: ['users', { role: 'Coordinator' }],
    queryFn: () => listStaffUsers({ role: 'Coordinator' }),
  });

  // The <select> mounts (via register's ref) before this async list resolves,
  // so setting its value to an id with no matching <option> yet silently
  // fails — a native select doesn't retroactively select an option added
  // later. Re-apply the default once the real options exist.
  useEffect(() => {
    if (coordinators && defaultValues.coordinator) {
      setValue('coordinator', defaultValues.coordinator);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinators]);

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
        <Select label="Coordinator" error={errors.coordinator?.message} {...register('coordinator')}>
          <option value="">Not assigned</option>
          {(coordinators ?? []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
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
