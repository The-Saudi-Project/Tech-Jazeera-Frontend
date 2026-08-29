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
import { punchMyAttendance, listMyAttendance, getMyProfile, listMyTimesheets, submitMyTimesheet } from '../ess.api.js';
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

const VERIFIED_LABEL = { geofence: 'Verified by location', officeIp: 'Verified by office network' };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Submit the current week's attendance as a timesheet for approval —
 *  doesn't re-enter hours, just summarizes what's already recorded (see
 *  timesheet.service.js). */
function MyTimesheetsSection() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['me', 'timesheets'],
    queryFn: () => listMyTimesheets({ limit: 10 }),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitMyTimesheet({ periodStart: new Date().toISOString() }),
    onSuccess: (timesheet) => {
      toast.success(`Timesheet submitted — ${formatHours(timesheet.totalHours)} hrs.`);
      queryClient.invalidateQueries({ queryKey: ['me', 'timesheets'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const items = data?.items ?? [];
  const thisWeek = items[0];
  const canSubmitThisWeek = !thisWeek || thisWeek.status === 'Rejected';

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Weekly timesheet</h2>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {canSubmitThisWeek
              ? 'Submit this week for your supervisor to approve.'
              : `This week is already ${thisWeek.status.toLowerCase()}.`}
          </p>
          {canSubmitThisWeek && (
            <Button size="sm" isLoading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              Submit this week
            </Button>
          )}
        </div>

        {!isPending && items.length > 0 && (
          <div className="mt-4 divide-y divide-border border-t border-border">
            {items.map((t) => (
              <div key={t._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">
                    {formatDate(t.periodStart)} – {formatDate(t.periodEnd)}
                  </p>
                  <p className="text-xs text-muted">{formatHours(t.totalHours)} hrs</p>
                </div>
                <Badge variant={TIMESHEET_STATUS_VARIANT[t.status]}>{t.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MyAttendancePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [locating, setLocating] = useState(false);
  const [confirmEarlySignOut, setConfirmEarlySignOut] = useState(null); // { hoursSoFar, expected } | null

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

  function withLocation(mutate) {
    if (!navigator.geolocation) {
      // No GPS available at all — still try, so the office-IP path can work.
      mutate({});
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {
        setLocating(false);
        // Permission denied or unavailable — still attempt it; the office-IP
        // check is a real, independent path, not just a GPS fallback message.
        mutate({});
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const punchMutation = useMutation({
    mutationFn: punchMyAttendance,
    onSuccess: ({ action, record }) => {
      toast.success(
        action === 'checked-in' ? 'Signed in.' : `Signed out — ${formatHours(record.hoursWorked)} hrs today.`
      );
      queryClient.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function doPunch() {
    withLocation(punchMutation.mutate);
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
      <PageHeader
        title="My attendance"
        description="Sign in when you arrive and sign out when you leave — sign out and back in as many times as you need throughout the day."
      />

      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          {isStaffSet ? (
            <>
              <Badge variant={ATTENDANCE_STATUS_META[todayRecord.status]?.variant ?? 'default'} className="text-sm">
                Today: {todayRecord.status}
              </Badge>
              <p className="text-xs text-muted">Set by your office — contact HR to change it.</p>
            </>
          ) : (
            <>
              {signedInNotOut ? (
                <Badge variant="success" className="text-sm">
                  Signed in at {formatTime(todayRecord.checkInTime)}
                </Badge>
              ) : hasPunchedToday ? (
                <>
                  <Badge variant="default" className="text-sm">
                    Signed out at {formatTime(todayRecord.checkOutTime)}
                  </Badge>
                  <p className="text-xs text-muted">
                    {formatHours(todayRecord.hoursWorked)} hrs today ·{' '}
                    {VERIFIED_LABEL[todayRecord.verifiedBy] ?? 'Self-marked'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">You haven't signed in today.</p>
              )}

              {signedInNotOut ? (
                <Button onClick={handleSignOutClick} isLoading={busy} size="lg" variant="secondary">
                  Sign out
                </Button>
              ) : (
                <Button onClick={doPunch} isLoading={busy} size="lg">
                  {hasPunchedToday ? 'Sign in again' : 'Sign in'}
                </Button>
              )}
              <p className="max-w-sm text-xs text-muted">
                You'll be asked for your location — you must be at the office (or on the office network) for this to
                work. Sign out and back in as many times as you need during the day; each session adds to today's
                hours.
              </p>
            </>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent history</h2>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load your attendance"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
          />
        ) : data.length === 0 ? (
          <EmptyState title="No attendance yet" description="Your signed-in days will appear here." />
        ) : (
          <Card className="divide-y divide-border">
            {data.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{formatDate(r.date)}</p>
                  {r.source === 'self' && (
                    <p className="text-xs text-muted">
                      {VERIFIED_LABEL[r.verifiedBy] ?? 'Self-marked'}
                      {r.checkInTime && r.checkOutTime && (
                        <> · {formatTime(r.checkInTime)}–{formatTime(r.checkOutTime)}</>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={ATTENDANCE_STATUS_META[r.status]?.variant ?? 'default'}>{r.status}</Badge>
                  {r.hoursWorked != null && <p className="mt-0.5 text-xs text-muted">{formatHours(r.hoursWorked)} hrs</p>}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <MyTimesheetsSection />

      <ConfirmDialog
        open={Boolean(confirmEarlySignOut)}
        title="Sign out early?"
        message={
          confirmEarlySignOut &&
          `You've been signed in for about ${formatHours(confirmEarlySignOut.hoursSoFar)} hrs — your expected shift is ${formatHours(confirmEarlySignOut.expected)} hrs. Sign out anyway?`
        }
        confirmLabel="Sign out anyway"
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
