/**
 * MyAttendancePage — a Worker marks their own attendance (P2-M3), verified
 * server-side by GPS geofence or by their request coming from the office's
 * allow-listed IP — never trusted from what the client claims. The browser
 * only collects the raw GPS reading; the server decides whether it counts.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { markMyAttendance, listMyAttendance } from '../ess.api.js';
import { apiMessage, formatDate } from '../../../lib/utils.js';
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

  const markMutation = useMutation({
    mutationFn: markMyAttendance,
    onSuccess: () => {
      toast.success("Today's attendance marked.");
      queryClient.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function handleMark() {
    if (!navigator.geolocation) {
      // No GPS available at all — still try, so the office-IP path can work.
      markMutation.mutate({});
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        markMutation.mutate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        setLocating(false);
        // Permission denied or unavailable — still attempt it; the office-IP
        // check is a real, independent path, not just a GPS fallback message.
        markMutation.mutate({});
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const busy = locating || markMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My attendance" description="Mark today's attendance from the office, and see your recent history." />

      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          {todayRecord ? (
            <>
              <Badge variant={ATTENDANCE_STATUS_META[todayRecord.status]?.variant ?? 'default'} className="text-sm">
                Today: {todayRecord.status}
              </Badge>
              {todayRecord.source === 'self' && (
                <p className="text-xs text-muted">
                  {VERIFIED_LABEL[todayRecord.verifiedBy] ?? 'Self-marked'} · {formatDate(todayRecord.updatedAt)}
                </p>
              )}
              {todayRecord.source === 'staff' && (
                <p className="text-xs text-muted">Set by your office — contact HR to change it.</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted">You haven't marked attendance today.</p>
              <Button onClick={handleMark} isLoading={busy} size="lg">
                Mark attendance
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
          <EmptyState title="No attendance yet" description="Your marked days will appear here." />
        ) : (
          <Card className="divide-y divide-border">
            {data.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{formatDate(r.date)}</p>
                  {r.source === 'self' && (
                    <p className="text-xs text-muted">{VERIFIED_LABEL[r.verifiedBy] ?? 'Self-marked'}</p>
                  )}
                </div>
                <Badge variant={ATTENDANCE_STATUS_META[r.status]?.variant ?? 'default'}>{r.status}</Badge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
