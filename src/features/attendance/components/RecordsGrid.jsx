/**
 * Records grid — the weekly/monthly view. Rows are workers, columns are days;
 * each cell shows the day's status as a coloured letter. The grid scrolls
 * horizontally inside its own container so the page never does.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listEmployees } from '../../employees/employees.api.js';
import { listAttendance } from '../attendance.api.js';
import {
  monthRange,
  weekRange,
  addMonths,
  addDays,
  monthLabel,
  dayHeader,
  isWeekend,
  todayKey,
} from '../attendance.dates.js';
import { ATTENDANCE_STATUS_META } from '../../../lib/constants.js';
import { cn } from '../../../lib/utils.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function RecordsGrid() {
  const [mode, setMode] = useState('month'); // 'month' | 'week'
  const [ref, setRef] = useState(todayKey());

  const range = useMemo(() => (mode === 'month' ? monthRange(ref) : weekRange(ref)), [mode, ref]);

  const { data: employeeData, isPending: employeesLoading } = useQuery({
    queryKey: ['employees', { forAttendance: true }],
    queryFn: () => listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
  });
  const { data: records, isPending: recordsLoading } = useQuery({
    queryKey: ['attendance', 'range', range.from, range.to],
    queryFn: () => listAttendance({ from: range.from, to: range.to }),
  });

  // Fast lookup: `${employeeId}|${dateKey}` → { status, source }.
  const marks = useMemo(() => {
    const map = {};
    for (const r of records ?? []) {
      map[`${r.employee._id}|${r.date.slice(0, 10)}`] = { status: r.status, source: r.source };
    }
    return map;
  }, [records]);

  const workers = (employeeData?.items ?? []).filter((e) => e.status !== 'Exited');

  const shift = (dir) => setRef((r) => (mode === 'month' ? addMonths(r, dir) : addDays(r, dir * 7)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {['month', 'week'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                mode === m ? 'bg-primary text-white' : 'text-muted hover:text-text'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => shift(-1)}>
            ‹ Prev
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-medium">
            {mode === 'month' ? monthLabel(ref) : `${range.from} → ${range.to}`}
          </span>
          <Button size="sm" variant="secondary" onClick={() => shift(1)}>
            Next ›
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(ATTENDANCE_STATUS_META).map(([status, meta]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn('grid h-5 w-5 place-items-center rounded text-[10px] font-bold', meta.cell)}>
              {meta.letter}
            </span>
            {status}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="relative inline-block h-3 w-3">
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-surface" />
          </span>
          Self-marked by worker
        </span>
      </div>

      {employeesLoading || recordsLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium text-muted">
                  Worker
                </th>
                {range.days.map((d) => (
                  <th
                    key={d}
                    className={cn(
                      'whitespace-nowrap px-2 py-2 text-center text-xs font-medium text-muted',
                      isWeekend(d) && 'bg-bg/60'
                    )}
                  >
                    {dayHeader(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w._id} className="border-t border-border">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2">
                    <span className="font-medium">{w.fullName}</span>
                    <span className="block text-xs text-muted">{w.employeeId}</span>
                  </td>
                  {range.days.map((d) => {
                    const mark = marks[`${w._id}|${d}`];
                    const meta = mark ? ATTENDANCE_STATUS_META[mark.status] : null;
                    return (
                      <td key={d} className={cn('px-2 py-2 text-center', isWeekend(d) && 'bg-bg/40')}>
                        {meta ? (
                          <span
                            title={mark.source === 'self' ? `${mark.status} · self-marked` : mark.status}
                            className={cn(
                              'relative inline-grid h-6 w-6 place-items-center rounded text-[11px] font-bold',
                              meta.cell
                            )}
                          >
                            {meta.letter}
                            {/* Self-marked (Worker GPS/office-network check-in, P2-M3) vs staff-marked. */}
                            {mark.source === 'self' && (
                              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-surface" />
                            )}
                          </span>
                        ) : (
                          <span className="text-muted/30">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
