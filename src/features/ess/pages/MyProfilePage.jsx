/**
 * MyProfilePage — a Worker's read-only landing page (P2-M2). Same data shape
 * as the admin employee profile, but scoped server-side to req.user.employee
 * and rendered read-only — a worker never edits their own HR record here.
 */
import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '../ess.api.js';
import { formatDate, formatMoney } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import ExpiryBadge from '../../../components/shared/ExpiryBadge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Button from '../../../components/ui/Button.jsx';

const STATUS_VARIANT = { Active: 'success', 'On Leave': 'warning', Exited: 'default' };
const DOCUMENTS = [
  ['passport', 'Passport'],
  ['visa', 'Visa'],
  ['iqama', 'Iqama'],
  ['medical', 'Medical'],
  ['drivingLicense', 'Driving License'],
];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

export default function MyProfilePage() {
  const { data: employee, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: getMyProfile,
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="My profile" />
        <EmptyState
          title="Could not load your profile"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={employee.fullName}
        description={`${employee.employeeId} · ${employee.designation}`}
        actions={<Badge variant={STATUS_VARIANT[employee.status]}>{employee.status}</Badge>}
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Personal details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nationality" value={employee.nationality} />
          <Field label="Mobile" value={employee.mobile} />
          <Field label="Email" value={employee.email} />
          <Field label="Joining date" value={formatDate(employee.joiningDate)} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Employment</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Designation" value={employee.designation} />
          <Field label="Department" value={employee.department} />
          <Field label="Monthly salary" value={formatMoney(employee.salary)} />
          <Field label="Accommodation" value={employee.accommodation} />
          <Field
            label="Current client"
            value={employee.currentClient?.companyName ?? (employee.currentSite ? employee.currentSite : null)}
          />
          <Field label="My coordinator" value={employee.coordinator ? `${employee.coordinator.name}` : 'Not assigned'} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Documents on file</h2>
        <div className="divide-y divide-border">
          {DOCUMENTS.map(([key, label]) => {
            const doc = employee[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted">
                    {doc?.number ? `No. ${doc.number}` : 'No number on file'}
                    {doc?.expiry ? ` · expires ${formatDate(doc.expiry)}` : ''}
                  </p>
                </div>
                <ExpiryBadge date={doc?.expiry} />
              </div>
            );
          })}
        </div>
      </Card>

      {employee.emergencyContact?.name && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Emergency contact</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name" value={employee.emergencyContact.name} />
            <Field label="Phone" value={employee.emergencyContact.phone} />
            <Field label="Relation" value={employee.emergencyContact.relation} />
          </div>
        </Card>
      )}
    </div>
  );
}
