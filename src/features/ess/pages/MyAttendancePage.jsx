/**
 * MyAttendancePage — a Worker records their own attendance (P2-M3+),
 * verified server-side by GPS geofence or by their request coming from the
 * office's allow-listed IP — never trusted from what the client claims.
 *
 * Both buttons call the same punch endpoint — the server decides whether
 * it's the day's first punch (check-in) or a later one, not the button
 * label. A Worker can press either button, any number of times, in any
 * order: leaving for an errand and coming back never errors. Only the very
 * first punch of the day and the most recent one end up mattering for
 * hoursWorked, which is why the "so far" framing below never claims to be
 * final — there's no way to know a punch is the day's last one until no
 * further punches happen.
 *
 * Early sign-out warning: purely a client-side nudge, not a server-enforced
 * rule — a worker can always confirm past it (a real early departure still
 * has to be recordable). `expectedDailyHours` comes from their own Employee
 * record (set by Admin/Manager/HR); if it's unset, no warning ever shows.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { punchMyAttendance, listMyAttendance, getMyProfile } from '../ess.api.js';
import { apiMessage, formatDate, formatHours, formatTime } from '../../../lib/utils.js';
import { ATTENDANCE_STATUS_META } from '../../../lib/constants.js';
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
        action === 'checked-in' ? 'Signed in.' : `Recorded — ${formatHours(record.hoursWorked)} hrs so far today.`
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
        description="Sign in when you arrive and sign out when you leave — tap either button as many times as you need throughout the day."
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
              {hasPunchedToday ? (
                <>
                  <Badge variant="success" className="text-sm">
                    Signed in at {formatTime(todayRecord.checkInTime)}
                  </Badge>
                  {todayRecord.checkOutTime && (
                    <p className="text-xs text-muted">
                      Last recorded at {formatTime(todayRecord.checkOutTime)} ·{' '}
                      {formatHours(todayRecord.hoursWorked)} hrs so far ·{' '}
                      {VERIFIED_LABEL[todayRecord.verifiedBy] ?? 'Self-marked'}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">You haven't signed in today.</p>
              )}

              <div className="flex gap-3">
                <Button onClick={doPunch} isLoading={busy} size="lg">
                  {hasPunchedToday ? 'Sign in again' : 'Sign in'}
                </Button>
                {hasPunchedToday && (
                  <Button onClick={handleSignOutClick} isLoading={busy} size="lg" variant="secondary">
                    Sign out
                  </Button>
                )}
              </div>
              <p className="max-w-sm text-xs text-muted">
                You'll be asked for your location — you must be at the office (or on the office network) for this to
                work. Only your first sign-in and your last sign-out of the day are used to calculate your hours.
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
