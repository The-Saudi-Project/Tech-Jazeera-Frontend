/**
 * MyAttendanceTab — a Coordinator, HR, or Accounts account's own sign-in/
 * sign-out. Same geofence verification as a Worker's My Attendance (P2-M3),
 * against StaffAttendance instead of Employee-based Attendance — see
 * server/src/modules/staffAttendance/staffAttendance.model.js for why they're
 * kept separate. Unlike the Worker's free-punch model, this is a strict
 * per-day toggle — exactly one button at a time, and every sign-in/out cycle
 * today accumulates onto the running hoursWorked total (see
 * staffAttendance.service.js selfPunch()).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { punchStaffAttendance, listMyStaffAttendance } from '../staffAttendance.api.js';
import { apiMessage, formatDate, formatHours, formatTime } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

const VERIFIED_LABEL = { geofence: 'Verified by location', officeIp: 'Verified by office network' };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function MyAttendanceTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [locating, setLocating] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['staffAttendance', 'mine'],
    queryFn: () => listMyStaffAttendance({}),
  });

  const todayRecord = (data ?? []).find((r) => r.date.slice(0, 10) === todayKey());
  const hasPunchedToday = Boolean(todayRecord?.checkInTime);
  // Exactly one button at a time, toggling on today's state — unlike a
  // Worker's free-punch model, staff self-attendance is a strict in/out
  // pair per day: signed in and not yet out → only "Sign out"; anything
  // else (never signed in, or already signed out) → only "Sign in".
  const signedInNotOut = hasPunchedToday && !todayRecord?.checkOutTime;

  function withLocation(mutate) {
    if (!navigator.geolocation) {
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
        mutate({});
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const punchMutation = useMutation({
    mutationFn: punchStaffAttendance,
    onSuccess: ({ action, record }) => {
      toast.success(
        action === 'checked-in' ? 'Signed in.' : `Signed out — ${formatHours(record.hoursWorked)} hrs today.`
      );
      queryClient.invalidateQueries({ queryKey: ['staffAttendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function doPunch() {
    withLocation(punchMutation.mutate);
  }

  const busy = locating || punchMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
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
                {formatHours(todayRecord.hoursWorked)} hrs today · {VERIFIED_LABEL[todayRecord.verifiedBy] ?? 'Self-marked'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">You haven't signed in today.</p>
          )}

          {signedInNotOut ? (
            <Button onClick={doPunch} isLoading={busy} size="lg" variant="secondary">
              Sign out
            </Button>
          ) : (
            <Button onClick={doPunch} isLoading={busy} size="lg">
              {hasPunchedToday ? 'Sign in again' : 'Sign in'}
            </Button>
          )}
          <p className="max-w-sm text-xs text-muted">
            You'll be asked for your location — you must be at the office (or on the office network) for this to
            work. Sign out and back in as many times as you need during the day; each session adds to today's hours.
          </p>
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
                  <p className="text-xs text-muted">
                    {VERIFIED_LABEL[r.verifiedBy] ?? 'Self-marked'}
                    {r.checkInTime && r.checkOutTime && (
                      <>
                        {' '}
                        · {formatTime(r.checkInTime)}–{formatTime(r.checkOutTime)}
                      </>
                    )}
                  </p>
                </div>
                {r.hoursWorked != null && (
                  <p className="text-xs font-medium tabular-nums text-muted">{formatHours(r.hoursWorked)} hrs</p>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
