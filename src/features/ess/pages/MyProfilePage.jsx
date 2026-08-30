/**
 * MyProfilePage — a Worker's read-only landing page (P2-M2). Same data shape
 * as the admin employee profile, but scoped server-side to req.user.employee
 * and rendered read-only — a worker never edits their own HR record here.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
const DOCUMENTS = ['passport', 'visa', 'iqama', 'medical', 'drivingLicense'];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

export default function MyProfilePage() {
  const { t } = useTranslation();
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
        <PageHeader title={t('profile.title')} />
        <EmptyState
          title={t('profile.loadError')}
          description={t('common.checkConnection')}
          action={<Button variant="secondary" onClick={() => refetch()}>{t('common.retry')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={employee.fullName}
        description={`${employee.employeeId} · ${employee.designation}`}
        actions={<Badge variant={STATUS_VARIANT[employee.status]}>{t(`profile.employeeStatus.${employee.status}`, employee.status)}</Badge>}
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t('profile.personalDetails')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('profile.nationality')} value={employee.nationality} />
          <Field label={t('profile.mobile')} value={employee.mobile} />
          <Field label={t('profile.email')} value={employee.email} />
          <Field label={t('profile.joiningDate')} value={formatDate(employee.joiningDate)} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t('profile.employment')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('profile.designation')} value={employee.designation} />
          <Field label={t('profile.department')} value={employee.department} />
          <Field label={t('profile.monthlySalary')} value={formatMoney(employee.salary)} />
          <Field label={t('profile.accommodation')} value={employee.accommodation} />
          <Field
            label={t('profile.currentClient')}
            value={employee.currentClient?.companyName ?? (employee.currentSite ? employee.currentSite : null)}
          />
          <Field label={t('profile.myCoordinator')} value={employee.coordinator ? `${employee.coordinator.name}` : t('common.notAssigned')} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t('profile.documentsOnFile')}</h2>
        <div className="divide-y divide-border">
          {DOCUMENTS.map((key) => {
            const doc = employee[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{t(`profile.documents.${key}`)}</p>
                  <p className="text-xs text-muted">
                    {doc?.number ? t('profile.docNumber', { number: doc.number }) : t('profile.docNoNumber')}
                    {doc?.expiry ? t('profile.docExpires', { date: formatDate(doc.expiry) }) : ''}
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t('profile.emergencyContact')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('profile.contactName')} value={employee.emergencyContact.name} />
            <Field label={t('profile.contactPhone')} value={employee.emergencyContact.phone} />
            <Field label={t('profile.contactRelation')} value={employee.emergencyContact.relation} />
          </div>
        </Card>
      )}
    </div>
  );
}
