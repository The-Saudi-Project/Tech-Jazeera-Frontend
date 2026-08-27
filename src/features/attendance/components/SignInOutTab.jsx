/**
 * Sign In/Out tab — replaces the old My Attendance / Time Log / Staff
 * Attendance split with one screen: a punch card (only for roles that
 * self-mark here — Coordinator/HR/Accounts; Admin/Manager are exempt by
 * design, Workers have their own equivalent in the ESS portal) on top, and
 * one merged chronological log below combining Employee-based Attendance
 * with User-based StaffAttendance (Admin/Manager/HR only see the latter —
 * same RBAC as before, just one screen instead of three).
 *
 * The two sources are never combined into one bare-id lookup — every row
 * carries a `kind` discriminator and its own record `_id` as the row key.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAttendance } from '../attendance.api.js';
import { listAllStaffAttendance, listMyStaffAttendance, punchStaffAttendance } from '../staffAttendance.api.js';
import { todayKey } from '../attendance.dates.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ATTENDANCE_STATUS_META, ATTENDANCE_WRITE_ROLES, STAFF_SELF_ATTENDANCE_ROLES } from '../../../lib/constants.js';
import { apiMessage, formatDate, formatHours, formatTime } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Table from '../../../components/ui/Table.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

const VERIFIED_LABEL = { geofence: 'Verified by location', officeIp: 'Verified by office network' };

/** The punch card — Coordinator/HR/Accounts sign themselves in/out here. */
function PunchCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [locating, setLocating] = useState(false);

  const { data } = useQuery({
    queryKey: ['staffAttendance', 'mine'],
    queryFn: () => listMyStaffAttendance({}),
  });

  const todayRecord = (data ?? []).find((r) => r.date.slice(0, 10) === todayKey());
  const hasPunchedToday = Boolean(todayRecord?.checkInTime);
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

  const busy = locating || punchMutation.isPending;

  return (
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
          <Button onClick={() => withLocation(punchMutation.mutate)} isLoading={busy} size="lg" variant="secondary">
            Sign out
          </Button>
        ) : (
          <Button onClick={() => withLocation(punchMutation.mutate)} isLoading={busy} size="lg">
            {hasPunchedToday ? 'Sign in again' : 'Sign in'}
          </Button>
        )}
        <p className="max-w-sm text-xs text-muted">
          You'll be asked for your location — you must be at the office (or on the office network) for this to
          work. Sign out and back in as many times as you need during the day; each session adds to today's hours.
        </p>
      </div>
    </Card>
  );
}

export default function SignInOutTab() {
  const { user } = useAuth();
  const canSeeStaffRows = ATTENDANCE_WRITE_ROLES.includes(user.role);
  const showPunchCard = STAFF_SELF_ATTENDANCE_ROLES.includes(user.role);

  const today = todayKey();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const rangeValid = Boolean(from && to && from <= to);

  const { data: employeeRecords, isPending: employeePending, isError: employeeError } = useQuery({
    queryKey: ['attendance', 'range', from, to],
    queryFn: () => listAttendance({ from, to }),
    enabled: rangeValid,
  });
  const { data: staffRecords, isPending: staffPending, isError: staffError } = useQuery({
    queryKey: ['staffAttendance', 'all', from, to],
    queryFn: () => listAllStaffAttendance({ from, to }),
    enabled: rangeValid && canSeeStaffRows,
  });

  const isPending = employeePending || (canSeeStaffRows && staffPending);
  const isError = employeeError || staffError;

  // Newest day first, then alphabetically within a day.
  const rows = useMemo(() => {
    const employeeRows = (employeeRecords ?? []).map((r) => ({
      kind: 'employee',
      id: r._id,
      name: r.employee.fullName,
      subLabel: r.employee.employeeId,
      date: r.date,
      status: r.status,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      hoursWorked: r.hoursWorked,
      source: r.source,
    }));
    const staffRows = (staffRecords ?? []).map((r) => ({
      kind: 'staff',
      id: r._id,
      name: r.user?.name ?? 'Unknown',
      subLabel: r.user?.role,
      date: r.date,
      status: null, // StaffAttendance has no status field
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      hoursWorked: r.hoursWorked,
      source: 'self', // no staff-correction path exists for StaffAttendance
    }));
    return [...employeeRows, ...staffRows].sort((a, b) => {
      const dateDiff = b.date.slice(0, 10).localeCompare(a.date.slice(0, 10));
      return dateDiff !== 0 ? dateDiff : a.name.localeCompare(b.name);
    });
  }, [employeeRecords, staffRecords]);

  const columns = [
    {
      key: 'who',
      header: 'Name',
      render: (r) => (
        <span className="font-medium text-text">
          {r.name}
          <span className="block text-xs font-normal text-muted">{r.subLabel}</span>
        </span>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.status ? (
          <Badge variant={ATTENDANCE_STATUS_META[r.status]?.variant ?? 'default'}>{r.status}</Badge>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: 'checkIn', header: 'Sign-in', className: 'tabular-nums', render: (r) => formatTime(r.checkInTime) },
    { key: 'checkOut', header: 'Sign-out', className: 'tabular-nums', render: (r) => formatTime(r.checkOutTime) },
    {
      key: 'hours',
      header: 'Hours',
      className: 'text-center tabular-nums',
      render: (r) => formatHours(r.hoursWorked),
    },
    {
      key: 'source',
      header: 'Marked by',
      hideOnMobile: true,
      render: (r) => (r.source === 'self' ? 'Self' : 'Staff'),
    },
  ];

  return (
    <div className="space-y-6">
      {showPunchCard && <PunchCard />}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-3">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:max-w-[170px]" />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-[170px]" />
          </div>
          <p className="text-xs text-muted">Every sign-in/sign-out for the selected range.</p>
        </div>

        {!rangeValid ? (
          <EmptyState title="Pick a valid range" description="The “from” date must be on or before the “to” date." />
        ) : isError ? (
          <EmptyState title="Could not load the sign-in/out log" description="Please try again." />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(r) => `${r.kind}-${r.id}`}
            loading={isPending}
            emptyState={
              <EmptyState
                title="No sign-ins in this range"
                description="Mark or self-mark attendance for these dates to see sign-in/sign-out times."
              />
            }
          />
        )}
      </div>
    </div>
  );
}
