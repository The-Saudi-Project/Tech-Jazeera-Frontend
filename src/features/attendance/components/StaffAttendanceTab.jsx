/**
 * Staff Attendance tab — Admin/Manager/HR oversight of every Coordinator/HR/
 * Accounts account's self-marked sign-in/sign-out, over a date range. Same
 * shape as the Time Log tab, but reading StaffAttendance/User records
 * instead of Attendance/Employee ones — see
 * server/src/modules/staffAttendance/staffAttendance.model.js for why
 * they're separate collections. Defaults to today, widen as needed.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAllStaffAttendance } from '../staffAttendance.api.js';
import { todayKey } from '../attendance.dates.js';
import { formatDate, formatTime, formatHours } from '../../../lib/utils.js';
import Input from '../../../components/ui/Input.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Table from '../../../components/ui/Table.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function StaffAttendanceTab() {
  const today = todayKey();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const rangeValid = Boolean(from && to && from <= to);

  const { data: records, isPending, isError } = useQuery({
    queryKey: ['staffAttendance', 'all', from, to],
    queryFn: () => listAllStaffAttendance({ from, to }),
    enabled: rangeValid,
  });

  // Newest day first, then alphabetically within a day.
  const rows = useMemo(() => {
    return [...(records ?? [])].sort((a, b) => {
      const dateDiff = b.date.slice(0, 10).localeCompare(a.date.slice(0, 10));
      return dateDiff !== 0 ? dateDiff : (a.user?.name ?? '').localeCompare(b.user?.name ?? '');
    });
  }, [records]);

  const columns = [
    {
      key: 'user',
      header: 'Staff',
      render: (r) => (
        <span className="font-medium text-text">
          {r.user?.name ?? 'Unknown'}
          <span className="block text-xs font-normal text-muted">{r.user?.role}</span>
        </span>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'checkIn', header: 'Sign-in', className: 'tabular-nums', render: (r) => formatTime(r.checkInTime) },
    { key: 'checkOut', header: 'Sign-out', className: 'tabular-nums', render: (r) => formatTime(r.checkOutTime) },
    {
      key: 'hours',
      header: 'Hours',
      className: 'text-center tabular-nums',
      render: (r) => formatHours(r.hoursWorked),
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (r) => (
        <Badge variant={r.checkOutTime ? 'default' : 'success'}>{r.checkOutTime ? 'Signed out' : 'Signed in'}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:max-w-[170px]" />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-[170px]" />
        </div>
        <p className="text-xs text-muted">Every Coordinator/HR/Accounts sign-in and sign-out for the selected range.</p>
      </div>

      {!rangeValid ? (
        <EmptyState title="Pick a valid range" description="The “from” date must be on or before the “to” date." />
      ) : isError ? (
        <EmptyState title="Could not load staff attendance" description="Please try again." />
      ) : (
        <Table
          columns={columns}
          rows={rows}
          rowKey={(r) => r._id}
          loading={isPending}
          emptyState={
            <EmptyState
              title="No staff attendance in this range"
              description="Sign-ins from Coordinator, HR, and Accounts accounts will appear here."
            />
          }
        />
      )}
    </div>
  );
}
