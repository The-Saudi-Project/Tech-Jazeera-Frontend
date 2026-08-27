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
import { useAuth } from '../../auth/AuthContext.jsx';
import { EMPLOYEE_STATUSES, WEEKDAY_LABELS } from '../../../lib/constants.js';
import { COUNTRIES } from '../../../lib/countries.js';
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
  const { user } = useAuth();
  // A Coordinator adding their own worker never picks a coordinator — the
  // server always assigns it to themselves regardless of what's submitted
  // (see employee.service.js), so showing an editable picker here would just
  // be confusing. Everyone else keeps the normal picker.
  const isCoordinator = user.role === 'Coordinator';
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
    enabled: !isCoordinator,
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
      {/* Backs the Nationality field's autocomplete — type "I" and the browser
          filters to India, Indonesia, Iran, Iraq, Ireland, etc. Native
          <datalist>, not a custom dropdown: free typing still works for a
          nationality that isn't on the list. */}
      <datalist id="country-list">
        {COUNTRIES.map((country) => (
          <option key={country} value={country} />
        ))}
      </datalist>

      <Section title="Personal details">
        <Input label="Employee ID *" placeholder="AJ-001" error={errors.employeeId?.message} {...register('employeeId')} />
        <Input label="Full name *" error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label="Nationality *"
          list="country-list"
          autoComplete="off"
          error={errors.nationality?.message}
          {...register('nationality')}
        />
        <Input label="Mobile *" placeholder="+966 5x xxx xxxx" error={errors.mobile?.message} {...register('mobile')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      </Section>

      <Section title="Employment">
        <Input label="Joining date *" type="date" error={errors.joiningDate?.message} {...register('joiningDate')} />
        <Input label="Designation *" placeholder="Electrician" error={errors.designation?.message} {...register('designation')} />
        <Input label="Department" placeholder="Maintenance" error={errors.department?.message} {...register('department')} />
        <Input label="Salary (SAR/month) *" type="number" min="0" step="50" error={errors.salary?.message} {...register('salary')} />
        <Input label="Accommodation" placeholder="Company camp, room 12" error={errors.accommodation?.message} {...register('accommodation')} />
        <div>
          <Input
            label="Expected daily hours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            placeholder="e.g. 9.5"
            error={errors.expectedDailyHours?.message}
            {...register('expectedDailyHours')}
          />
          <p className="mt-1 text-xs text-muted">
            Warns this worker in My Attendance if they sign out before this many hours. Leave blank for no warning.
          </p>
        </div>
        <div>
          <Select label="Weekly off day" error={errors.weeklyOffDay?.message} {...register('weeklyOffDay')}>
            <option value="">No fixed day off</option>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Shown as an inferred "Off" day on the Attendance Records grid when nothing was recorded — a real record
            for that day always overrides it.
          </p>
        </div>
        <Select label="Status" error={errors.status?.message} {...register('status')}>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {isCoordinator ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Coordinator</p>
            <p className="mt-0.5 text-sm font-medium">{user.name} (you)</p>
            <p className="mt-1 text-xs text-muted">Employees you add are automatically assigned to your team.</p>
          </div>
        ) : (
          <Select label="Coordinator" error={errors.coordinator?.message} {...register('coordinator')}>
            <option value="">Not assigned</option>
            {(coordinators ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
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
