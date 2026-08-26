/**
 * Time Log tab — a flat, sortable-by-eye register of actual sign-in/sign-out
 * clock times per worker per day, over a date range. The Records grid already
 * carries this data (a cell's tooltip shows it on hover), but reading exact
 * punch times off a calendar grid one cell at a time doesn't scale past a
 * handful of people; this is the same GET /attendance data, just laid out as
 * a list built for that. Defaults to today, widen the range as needed.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAttendance } from '../attendance.api.js';
import { todayKey } from '../attendance.dates.js';
import { ATTENDANCE_STATUS_META } from '../../../lib/constants.js';
import { formatDate, formatTime, formatHours } from '../../../lib/utils.js';
import Input from '../../../components/ui/Input.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Table from '../../../components/ui/Table.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function TimeLogTab() {
  const today = todayKey();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const rangeValid = Boolean(from && to && from <= to);

  const { data: records, isPending, isError } = useQuery({
    queryKey: ['attendance', 'range', from, to],
    queryFn: () => listAttendance({ from, to }),
    enabled: rangeValid,
  });

  // Newest day first, then alphabetically within a day — matches how you'd
  // scan a printed daily register.
  const rows = useMemo(() => {
    return [...(records ?? [])].sort((a, b) => {
      const dateDiff = b.date.slice(0, 10).localeCompare(a.date.slice(0, 10));
      return dateDiff !== 0 ? dateDiff : a.employee.fullName.localeCompare(b.employee.fullName);
    });
  }, [records]);

  const columns = [
    {
      key: 'worker',
      header: 'Worker',
      render: (r) => (
        <span className="font-medium text-text">
          {r.employee.fullName}
          <span className="block text-xs font-normal text-muted">{r.employee.employeeId}</span>
        </span>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge variant={ATTENDANCE_STATUS_META[r.status]?.variant ?? 'default'}>{r.status}</Badge>,
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
      render: (r) => (r.source === 'self' ? 'Worker (self)' : 'Staff'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:max-w-[170px]" />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-[170px]" />
        </div>
        <p className="text-xs text-muted">Actual sign-in/sign-out times for the selected range.</p>
      </div>

      {!rangeValid ? (
        <EmptyState title="Pick a valid range" description="The “from” date must be on or before the “to” date." />
      ) : isError ? (
        <EmptyState title="Could not load the time log" description="Please try again." />
      ) : (
        <Table
          columns={columns}
          rows={rows}
          rowKey={(r) => r._id}
          loading={isPending}
          emptyState={
            <EmptyState
              title="No attendance in this range"
              description="Mark or self-mark attendance for these dates to see sign-in/sign-out times."
            />
          }
        />
      )}
    </div>
  );
}
