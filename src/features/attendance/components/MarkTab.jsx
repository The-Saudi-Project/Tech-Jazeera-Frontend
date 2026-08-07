/**
 * Mark tab — daily attendance marking. Pick a date, set each worker's status
 * (prefilled from any existing marks for that day), and save. Saving is a
 * bulk upsert, so re-saving a day corrects it rather than duplicating.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEmployees } from '../../employees/employees.api.js';
import { markBulk, listAttendance } from '../attendance.api.js';
import { todayKey } from '../attendance.dates.js';
import { ATTENDANCE_STATUSES } from '../../../lib/constants.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function MarkTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayKey());
  // marks: { [employeeId]: { status, note } } — '' status means "leave as is".
  const [marks, setMarks] = useState({});

  const { data: employeeData, isPending: employeesLoading } = useQuery({
    queryKey: ['employees', { forAttendance: true }],
    queryFn: () => listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
  });
  const { data: existing, isFetching: existingLoading } = useQuery({
    queryKey: ['attendance', 'day', date],
    queryFn: () => listAttendance({ from: date, to: date }),
  });

  // Workers we mark: everyone who hasn't exited the company.
  const workers = useMemo(
    () => (employeeData?.items ?? []).filter((e) => e.status !== 'Exited'),
    [employeeData]
  );

  // (Re)seed the form whenever the day's existing records arrive.
  useEffect(() => {
    if (!existing) return;
    const seed = {};
    for (const rec of existing) seed[rec.employee._id] = { status: rec.status, note: rec.note ?? '' };
    setMarks(seed);
  }, [existing]);

  const setMark = (id, patch) => setMarks((m) => ({ ...m, [id]: { status: '', note: '', ...m[id], ...patch } }));
  const setAll = (status) =>
    setMarks(() => Object.fromEntries(workers.map((w) => [w._id, { status, note: marks[w._id]?.note ?? '' }])));

  const mutation = useMutation({
    mutationFn: () => {
      const records = workers
        .filter((w) => marks[w._id]?.status)
        .map((w) => ({ employee: w._id, status: marks[w._id].status, note: marks[w._id].note || undefined }));
      if (records.length === 0) return Promise.reject(new Error('Set at least one worker’s status.'));
      return markBulk({ date, records });
    },
    onSuccess: (res) => {
      toast.success(`Saved attendance for ${res.marked} worker(s).`);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => toast.error(error.response ? apiMessage(error) : error.message),
  });

  if (employeesLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:max-w-[200px]"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAll('Present')}>
            All Present
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Save attendance
          </Button>
        </div>
      </div>

      {workers.length === 0 ? (
        <EmptyState title="No workers to mark" description="Add employees first." />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-border">
            {workers.map((w) => (
              <div key={w._id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <div className="sm:w-56">
                  <p className="text-sm font-medium">{w.fullName}</p>
                  <p className="text-xs text-muted">{w.employeeId}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ATTENDANCE_STATUSES.map((s) => {
                    const active = marks[w._id]?.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMark(w._id, { status: active ? '' : s })}
                        className={
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ' +
                          (active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted hover:bg-bg')
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={marks[w._id]?.note ?? ''}
                  onChange={(e) => setMark(w._id, { note: e.target.value })}
                  placeholder="Note (optional)"
                  className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted/70 sm:max-w-xs"
                />
              </div>
            ))}
          </div>
        </Card>
      )}
      {existingLoading && <p className="text-xs text-muted">Loading existing marks…</p>}
    </div>
  );
}
