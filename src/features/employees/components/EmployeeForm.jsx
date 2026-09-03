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
import { listApprovalWorkflows } from '../../approvals/approvals.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { EMPLOYEE_STATUSES, EMPLOYEE_TYPES, WEEKDAY_LABELS, MANAGER_ELIGIBLE_ROLES } from '../../../lib/constants.js';
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
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(employeeFormSchema), defaultValues });

  // Drives which fields below render as required — nationality/mobile/
  // joining date/salary are compliance & payroll fields that only make sense
  // for 'Client' (the supplied workforce); an 'Own' (internal staff) record
  // may have none of that.
  const type = watch('type');

  // P2-M2: who this employee's day-to-day (leave, expiry follow-up) reports
  // to. The list call itself is the access check — Accounts can't reach it
  // and never renders this field meaningfully, but it also never renders
  // EmployeeForm (write-gated by the pages that use it).
  const { data: coordinators } = useQuery({
    queryKey: ['users', { role: 'Coordinator' }],
    queryFn: () => listStaffUsers({ role: 'Coordinator' }),
    enabled: !isCoordinator,
  });

  // Every 'Own' employee reports to a Manager; a 'Client' employee may too,
  // alongside or instead of a coordinator — so this stays fetched regardless
  // of type. MANAGER_ELIGIBLE_ROLES (Admin or Manager) filtered client-side,
  // since listStaffUsers only takes one exact role per call.
  const { data: staffUsers } = useQuery({
    queryKey: ['users', {}],
    queryFn: () => listStaffUsers({}),
  });
  const managers = (staffUsers ?? []).filter((u) => MANAGER_ELIGIBLE_ROLES.includes(u.role));

  // Configurable Approval Hierarchy: which workflow governs THIS employee's
  // own requests, overriding the company-wide default for its request
  // type(s). Only active workflows are offered — an inactive one can't be
  // newly assigned, though an employee already pointed at one keeps showing
  // it (see the reapply effect below) rather than silently blanking the field.
  const { data: workflows } = useQuery({ queryKey: ['approval-workflows'], queryFn: listApprovalWorkflows });
  const activeWorkflows = (workflows ?? []).filter((w) => w.isActive || w._id === defaultValues.approvalWorkflow);

  // The <select>s mount (via register's ref) before these async lists
  // resolve, so setting their value to an id with no matching <option> yet
  // silently fails — a native select doesn't retroactively select an option
  // added later. Re-apply the defaults once the real options exist.
  useEffect(() => {
    if (coordinators && defaultValues.coordinator) {
      setValue('coordinator', defaultValues.coordinator);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinators]);
  useEffect(() => {
    if (staffUsers && defaultValues.manager) {
      setValue('manager', defaultValues.manager);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUsers]);
  useEffect(() => {
    if (workflows && defaultValues.approvalWorkflow) {
      setValue('approvalWorkflow', defaultValues.approvalWorkflow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows]);

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

      <Section title="Employee type">
        <div className="sm:col-span-2">
          <Select label="Type *" error={errors.type?.message} {...register('type')}>
            {EMPLOYEE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'Client' ? 'Client — supplied workforce' : 'Own — internal staff'}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            {type === 'Own'
              ? 'Internal staff (Manager/HR/Coordinator/IT/Office). Nationality, mobile, joining date and salary are optional.'
              : 'Workforce supplied to clients — visa/iqama tracking and payroll apply.'}
          </p>
        </div>
      </Section>

      <Section title="Personal details">
        <Input label="Employee ID *" placeholder="AJ-001" error={errors.employeeId?.message} {...register('employeeId')} />
        <Input label="Full name *" error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label={`Nationality${type === 'Client' ? ' *' : ''}`}
          list="country-list"
          autoComplete="off"
          error={errors.nationality?.message}
          {...register('nationality')}
        />
        <Input
          label={`Mobile${type === 'Client' ? ' *' : ''}`}
          placeholder="+966 5x xxx xxxx"
          error={errors.mobile?.message}
          {...register('mobile')}
        />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      </Section>

      <Section title="Employment">
        <Input
          label={`Joining date${type === 'Client' ? ' *' : ''}`}
          type="date"
          error={errors.joiningDate?.message}
          {...register('joiningDate')}
        />
        <Input label="Designation *" placeholder="Electrician" error={errors.designation?.message} {...register('designation')} />
        <Input label="Department" placeholder="Maintenance" error={errors.department?.message} {...register('department')} />
        <Input
          label={`Salary (SAR/month)${type === 'Client' ? ' *' : ''}`}
          type="number"
          min="0"
          step="50"
          error={errors.salary?.message}
          {...register('salary')}
        />
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-muted">
            WPS salary breakdown (optional — leave blank to show the full salary as Basic on payslips)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Basic" type="number" min="0" step="50" error={errors.basicSalary?.message} {...register('basicSalary')} />
            <Input label="Housing allowance" type="number" min="0" step="50" error={errors.housingAllowance?.message} {...register('housingAllowance')} />
            <Input label="Transport allowance" type="number" min="0" step="50" error={errors.transportAllowance?.message} {...register('transportAllowance')} />
          </div>
        </div>
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
        <div>
          <Select label="Manager" error={errors.manager?.message} {...register('manager')}>
            <option value="">Not assigned</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} ({m.role})
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            {type === 'Own'
              ? 'Who this employee reports to.'
              : "Optional — alongside or instead of a coordinator, if they report to a manager directly."}
          </p>
        </div>
        <div>
          <Select label="Approval workflow override" error={errors.approvalWorkflow?.message} {...register('approvalWorkflow')}>
            <option value="">Use the company default</option>
            {activeWorkflows.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Which approval chain this employee's Leave/Salary Advance/Reimbursement/Timesheet requests route
            through. Leave as the default unless this person needs a different chain — configure roles and
            workflows under Admin &amp; Tools → Approval Hierarchy.
          </p>
        </div>
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
