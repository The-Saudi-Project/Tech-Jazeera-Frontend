/**
 * MyAttendancePage — a Worker signs in/out for their own shift (P2-M3+),
 * verified server-side by GPS geofence or by their request coming from the
 * office's allow-listed IP — never trusted from what the client claims. The
 * browser only collects the raw GPS reading; the server decides whether it
 * counts, for both the check-in and the check-out.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkInMyAttendance, checkOutMyAttendance, listMyAttendance } from '../ess.api.js';
import { apiMessage, formatDate, formatHours, formatTime } from '../../../lib/utils.js';
import { ATTENDANCE_STATUS_META } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

const VERIFIED_LABEL = { geofence: 'Verified by location', officeIp: 'Verified by office network' };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function MyAttendancePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [locating, setLocating] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'attendance'],
    queryFn: () => listMyAttendance({}),
  });

  const todayRecord = (data ?? []).find((r) => r.date.slice(0, 10) === todayKey());
  const isStaffSet = todayRecord?.source === 'staff';
  const isCheckedIn = todayRecord?.source === 'self' && todayRecord.checkInTime && !todayRecord.checkOutTime;
  const isCompleted = todayRecord?.source === 'self' && todayRecord.checkInTime && todayRecord.checkOutTime;

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

  const checkInMutation = useMutation({
    mutationFn: checkInMyAttendance,
    onSuccess: () => {
      toast.success('Signed in.');
      queryClient.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutMyAttendance,
    onSuccess: (record) => {
      toast.success(`Signed out — ${formatHours(record.hoursWorked)} hrs worked today.`);
      queryClient.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const busy = locating || checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My attendance"
        description="Sign in when you start work and sign out when you finish — your hours are calculated automatically."
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
          ) : isCompleted ? (
            <>
              <Badge variant="success" className="text-sm">
                Today: Present · {formatHours(todayRecord.hoursWorked)} hrs
              </Badge>
              <p className="text-xs text-muted">
                {formatTime(todayRecord.checkInTime)} – {formatTime(todayRecord.checkOutTime)} ·{' '}
                {VERIFIED_LABEL[todayRecord.verifiedBy] ?? 'Self-marked'}
              </p>
            </>
          ) : isCheckedIn ? (
            <>
              <Badge variant="success" className="text-sm">
                Signed in at {formatTime(todayRecord.checkInTime)}
              </Badge>
              <Button onClick={() => withLocation(checkOutMutation.mutate)} isLoading={busy} size="lg" variant="secondary">
                Sign out
              </Button>
              <p className="max-w-sm text-xs text-muted">
                Sign out when you finish work — we'll calculate your hours from your sign-in time.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">You haven't signed in today.</p>
              <Button onClick={() => withLocation(checkInMutation.mutate)} isLoading={busy} size="lg">
                Sign in
              </Button>
              <p className="max-w-sm text-xs text-muted">
                You'll be asked for your location — you must be at the office (or on the office network) for this to
                work.
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
    </div>
  );
}
