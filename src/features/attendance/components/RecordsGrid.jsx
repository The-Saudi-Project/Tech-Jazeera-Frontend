/**
 * Records grid — the weekly/monthly view. Rows are workers, columns are days;
 * each cell shows the day's status as a coloured letter. The grid scrolls
 * horizontally inside its own container so the page never does.
 *
 * Writers (Admin/Manager/HR) can click any cell to correct that worker's
 * day — status, and optionally the actual check-in/check-out times (e.g. a
 * worker forgot to sign in/out, or a system issue lost their punch).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEmployees } from '../../employees/employees.api.js';
import { listAttendance, adjustAttendance } from '../attendance.api.js';
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
import { useAuth } from '../../auth/AuthContext.jsx';
import { ATTENDANCE_STATUS_META, ATTENDANCE_STATUSES, ATTENDANCE_WRITE_ROLES } from '../../../lib/constants.js';
import { cn, formatHours, apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Select from '../../../components/ui/Select.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';

/** ISO datetime -> "HH:MM" in the viewer's local time, for a time input. */
function toTimeInput(iso) {
  if (!iso) return '';
  return new Date(iso).toTimeString().slice(0, 5);
}

/** "YYYY-MM-DD" + "HH:MM" (local) -> ISO datetime, or null if no time given. */
function toIsoDateTime(dateKey, timeInput) {
  if (!timeInput) return null;
  return new Date(`${dateKey}T${timeInput}:00`).toISOString();
}

export default function RecordsGrid() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = ATTENDANCE_WRITE_ROLES.includes(user.role);

  const [mode, setMode] = useState('month'); // 'month' | 'week'
  const [ref, setRef] = useState(todayKey());
  const [editing, setEditing] = useState(null); // { employeeId, employeeName, date, status, checkIn, checkOut, note }

  const range = useMemo(() => (mode === 'month' ? monthRange(ref) : weekRange(ref)), [mode, ref]);

  const { data: employeeData, isPending: employeesLoading } = useQuery({
    queryKey: ['employees', { forAttendance: true }],
    queryFn: () => listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
  });
  const { data: records, isPending: recordsLoading } = useQuery({
    queryKey: ['attendance', 'range', range.from, range.to],
    queryFn: () => listAttendance({ from: range.from, to: range.to }),
  });

  // Fast lookup: `${employeeId}|${dateKey}` → { status, source, hoursWorked, checkInTime, checkOutTime, note }.
  const marks = useMemo(() => {
    const map = {};
    for (const r of records ?? []) {
      map[`${r.employee._id}|${r.date.slice(0, 10)}`] = {
        status: r.status,
        source: r.source,
        hoursWorked: r.hoursWorked,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        note: r.note,
      };
    }
    return map;
  }, [records]);

  const workers = (employeeData?.items ?? []).filter((e) => e.status !== 'Exited');

  const shift = (dir) => setRef((r) => (mode === 'month' ? addMonths(r, dir) : addDays(r, dir * 7)));

  function openEditor(worker, date) {
    if (!canEdit) return;
    const mark = marks[`${worker._id}|${date}`];
    setEditing({
      employeeId: worker._id,
      employeeName: worker.fullName,
      date,
      status: mark?.status ?? 'Present',
      checkIn: toTimeInput(mark?.checkInTime),
      checkOut: toTimeInput(mark?.checkOutTime),
      note: mark?.note ?? '',
    });
  }

  const adjustMutation = useMutation({
    mutationFn: adjustAttendance,
    onSuccess: () => {
      toast.success('Attendance updated.');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function saveEdit() {
    adjustMutation.mutate({
      employee: editing.employeeId,
      date: editing.date,
      status: editing.status,
      checkInTime: toIsoDateTime(editing.date, editing.checkIn),
      checkOutTime: toIsoDateTime(editing.date, editing.checkOut),
      note: editing.note,
    });
  }

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
          Self-marked by worker (hours shown once signed out)
        </span>
        {canEdit && <span>Click any cell to correct a day.</span>}
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
                    // A completed self-marked shift has real hours to show —
                    // that's more useful to a manager than a plain "P".
                    const hasHours = mark?.hoursWorked != null;
                    const cellText = hasHours ? formatHours(mark.hoursWorked) : meta?.letter;
                    const cellTitle = mark
                      ? [mark.status, hasHours && `${formatHours(mark.hoursWorked)} hrs`, mark.source === 'self' && 'self-marked']
                          .filter(Boolean)
                          .join(' · ')
                      : canEdit
                        ? 'Click to add'
                        : undefined;
                    return (
                      <td key={d} className={cn('p-0 text-center', isWeekend(d) && 'bg-bg/40')}>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => openEditor(w, d)}
                          title={cellTitle}
                          className={cn(
                            'flex h-10 w-full items-center justify-center',
                            canEdit && 'cursor-pointer hover:bg-primary/[0.06]'
                          )}
                        >
                          {meta ? (
                            <span
                              className={cn(
                                'relative inline-grid h-6 min-w-[1.6rem] place-items-center rounded px-1 font-bold',
                                hasHours ? 'text-[9px]' : 'text-[11px]',
                                meta.cell
                              )}
                            >
                              {cellText}
                              {/* Self-marked (Worker GPS/office-network check-in, P2-M3) vs staff-marked. */}
                              {mark.source === 'self' && (
                                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-surface" />
                              )}
                            </span>
                          ) : (
                            <span className="text-muted/30">·</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.employeeName} — ${editing.date}` : ''}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
            className="space-y-4"
          >
            <Select
              label="Status"
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}
            >
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Check-in time"
                type="time"
                value={editing.checkIn}
                onChange={(e) => setEditing({ ...editing, checkIn: e.target.value })}
              />
              <Input
                label="Check-out time"
                type="time"
                value={editing.checkOut}
                onChange={(e) => setEditing({ ...editing, checkOut: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted">
              Both times set the worked hours automatically. Leave either blank to clear the hours for this day —
              the status above is still saved on its own.
            </p>
            <Textarea
              label="Note (optional)"
              value={editing.note}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={adjustMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
