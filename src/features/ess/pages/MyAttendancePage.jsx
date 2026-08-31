/**
 * MyAttendancePage — a Worker records their own attendance (P2-M3+),
 * verified server-side by GPS geofence or by their request coming from the
 * office's allow-listed IP — never trusted from what the client claims.
 *
 * Strict per-day toggle, not a free-for-all: exactly one button shows at a
 * time, based on whether today's record is currently "signed in" (checkIn
 * set, checkOut not). The same punch endpoint handles both directions — the
 * server decides sign-in vs. sign-out from that same state (see
 * attendance.service.js selfPunch()). A worker can sign out and back in any
 * number of times in a day; each completed session adds to the running
 * hoursWorked total rather than replacing it.
 *
 * Early sign-out warning: purely a client-side nudge, not a server-enforced
 * rule — a worker can always confirm past it (a real early departure still
 * has to be recordable). `expectedDailyHours` comes from their own Employee
 * record (set by Admin/Manager/HR); if it's unset, no warning ever shows.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { punchMyAttendance, listMyAttendance, getMyProfile, listMyTimesheets, submitMyTimesheet } from '../ess.api.js';
import { useDeviceLocation } from '../../../lib/useDeviceLocation.js';
import { apiMessage, formatDate, formatHours, formatTime } from '../../../lib/utils.js';
import { ATTENDANCE_STATUS_META, TIMESHEET_STATUS_VARIANT } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Submit the current week's attendance as a timesheet for approval —
 *  doesn't re-enter hours, just summarizes what's already recorded (see
 *  timesheet.service.js). */
function MyTimesheetsSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['me', 'timesheets'],
    queryFn: () => listMyTimesheets({ limit: 10 }),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitMyTimesheet({ periodStart: new Date().toISOString() }),
    onSuccess: (timesheet) => {
      const overtime =
        timesheet.overtimeHours > 0
          ? t('attendance.timesheet.overtimeSuffix', { hours: formatHours(timesheet.overtimeHours) })
          : '';
      toast.success(t('attendance.timesheet.submitted', { hours: formatHours(timesheet.totalHours), overtime }));
      queryClient.invalidateQueries({ queryKey: ['me', 'timesheets'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const items = data?.items ?? [];
  const thisWeek = items[0];
  const canSubmitThisWeek = !thisWeek || thisWeek.status === 'Rejected';

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('attendance.timesheet.title')}</h2>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {canSubmitThisWeek
              ? t('attendance.timesheet.submitPrompt')
              : t('attendance.timesheet.alreadyStatus', { status: t(`common.status.${thisWeek.status}`, thisWeek.status).toLowerCase() })}
          </p>
          {canSubmitThisWeek && (
            <Button size="sm" isLoading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              {t('attendance.timesheet.submitButton')}
            </Button>
          )}
        </div>

        {!isPending && items.length > 0 && (
          <div className="mt-4 divide-y divide-border border-t border-border">
            {items.map((t2) => (
              <div key={t2._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">
                    {formatDate(t2.periodStart)} – {formatDate(t2.periodEnd)}
                  </p>
                  <p className="text-xs text-muted">
                    {t('attendance.hoursSuffix', { hours: formatHours(t2.totalHours) })}
                    {t2.overtimeHours > 0 && (
                      <span className="text-warning">
                        {t('attendance.timesheet.overtimeSuffix', { hours: formatHours(t2.overtimeHours) })}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={TIMESHEET_STATUS_VARIANT[t2.status]}>{t(`common.status.${t2.status}`, t2.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MyAttendancePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { locating, getLocation } = useDeviceLocation();
  const [confirmEarlySignOut, setConfirmEarlySignOut] = useState(null); // { hoursSoFar, expected } | null

  const VERIFIED_LABEL = {
    geofence: t('attendance.verifiedBy.geofence'),
    officeIp: t('attendance.verifiedBy.officeIp'),
  };

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'attendance'],
    queryFn: () => listMyAttendance({}),
  });

  const { data: profile } = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: getMyProfile,
  });

  const todayRecord = (data ?? []).find((r) => r.date.slice(0, 10) === todayKey());
  const isStaffSet = todayRecord?.source === 'staff';
  const hasPunchedToday = todayRecord?.source === 'self' && Boolean(todayRecord.checkInTime);
  // Exactly one button at a time — signed in and not yet out → only "Sign
  // out"; anything else (never punched, or already signed out) → "Sign in".
  const signedInNotOut = hasPunchedToday && !todayRecord?.checkOutTime;

  const punchMutation = useMutation({
    mutationFn: punchMyAttendance,
    onSuccess: ({ action, record }) => {
      toast.success(
        action === 'checked-in'
          ? t('attendance.signedIn')
          : t('attendance.signedOutWithHours', { hours: formatHours(record.hoursWorked) })
      );
      queryClient.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  async function doPunch() {
    // Permission denied or unavailable — still attempt it; the office-IP
    // check is a real, independent verification path, not just a GPS fallback.
    punchMutation.mutate((await getLocation()) ?? {});
  }

  /** The "Sign out" button — warns first if this looks like an early departure. */
  function handleSignOutClick() {
    const expected = profile?.expectedDailyHours;
    if (expected != null && todayRecord?.checkInTime) {
      const hoursSoFar = (Date.now() - new Date(todayRecord.checkInTime).getTime()) / 3_600_000;
      if (hoursSoFar < expected) {
        setConfirmEarlySignOut({ hoursSoFar, expected });
        return;
      }
    }
    doPunch();
  }

  const busy = locating || punchMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('attendance.title')} description={t('attendance.description')} />

      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          {isStaffSet ? (
            <>
              <Badge variant={ATTENDANCE_STATUS_META[todayRecord.status]?.variant ?? 'default'} className="text-sm">
                {t('attendance.todaySetByOffice', { status: t(`common.status.${todayRecord.status}`, todayRecord.status) })}
              </Badge>
              <p className="text-xs text-muted">{t('attendance.setByOfficeNotice')}</p>
            </>
          ) : (
            <>
              {signedInNotOut ? (
                <Badge variant="success" className="text-sm">
                  {t('attendance.signedInAt', { time: formatTime(todayRecord.checkInTime) })}
                </Badge>
              ) : hasPunchedToday ? (
                <>
                  <Badge variant="default" className="text-sm">
                    {t('attendance.signedOutAt', { time: formatTime(todayRecord.checkOutTime) })}
                  </Badge>
                  <p className="text-xs text-muted">
                    {t('attendance.hoursToday', {
                      hours: formatHours(todayRecord.hoursWorked),
                      verifiedBy: VERIFIED_LABEL[todayRecord.verifiedBy] ?? t('attendance.verifiedBy.selfMarked'),
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{t('attendance.notSignedInYet')}</p>
              )}

              {signedInNotOut ? (
                <Button onClick={handleSignOutClick} isLoading={busy} size="lg" variant="secondary">
                  {t('attendance.signOut')}
                </Button>
              ) : (
                <Button onClick={doPunch} isLoading={busy} size="lg">
                  {hasPunchedToday ? t('attendance.signInAgain') : t('attendance.signIn')}
                </Button>
              )}
              <p className="max-w-sm text-xs text-muted">{t('attendance.locationNotice')}</p>
            </>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('attendance.recentHistory')}</h2>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title={t('attendance.loadError')}
            description={t('common.checkConnection')}
            action={<Button variant="secondary" onClick={() => refetch()}>{t('common.retry')}</Button>}
          />
        ) : data.length === 0 ? (
          <EmptyState title={t('attendance.empty')} description={t('attendance.emptyDescription')} />
        ) : (
          <Card className="divide-y divide-border">
            {data.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{formatDate(r.date)}</p>
                  {r.source === 'self' && (
                    <p className="text-xs text-muted">
                      {VERIFIED_LABEL[r.verifiedBy] ?? t('attendance.verifiedBy.selfMarked')}
                      {r.checkInTime && r.checkOutTime && (
                        <> · {formatTime(r.checkInTime)}–{formatTime(r.checkOutTime)}</>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={ATTENDANCE_STATUS_META[r.status]?.variant ?? 'default'}>{t(`common.status.${r.status}`, r.status)}</Badge>
                  {r.hoursWorked != null && (
                    <p className="mt-0.5 text-xs text-muted">{t('attendance.hoursSuffix', { hours: formatHours(r.hoursWorked) })}</p>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <MyTimesheetsSection />

      <ConfirmDialog
        open={Boolean(confirmEarlySignOut)}
        title={t('attendance.earlySignOut.title')}
        message={
          confirmEarlySignOut &&
          t('attendance.earlySignOut.message', {
            hoursSoFar: formatHours(confirmEarlySignOut.hoursSoFar),
            expected: formatHours(confirmEarlySignOut.expected),
          })
        }
        confirmLabel={t('attendance.earlySignOut.confirmLabel')}
        loading={punchMutation.isPending}
        onCancel={() => setConfirmEarlySignOut(null)}
        onConfirm={() => {
          setConfirmEarlySignOut(null);
          doPunch();
        }}
      />
    </div>
  );
}
