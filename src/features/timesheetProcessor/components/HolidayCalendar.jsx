/**
 * HolidayCalendar — a month grid where the admin clicks days to mark holidays.
 *
 * Controlled: `value` is a Set of day-of-month numbers, `onChange` receives the
 * next Set. A holiday day requires 0 hours (no deficiency) and any work on it is
 * overtime; that rule lives on the server, this only collects the dates.
 *
 * All date math is in UTC so the weekday/first-of-month never drifts by a day.
 */
import { cn } from '../../../lib/utils.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function HolidayCalendar({ year, month, value, onChange }) {
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const toggle = (day) => {
    const next = new Set(value);
    next.has(day) ? next.delete(day) : next.add(day);
    onChange(next);
  };

  const markAllFridays = () => {
    const next = new Set(value);
    for (const d of days) {
      if (new Date(Date.UTC(year, month - 1, d)).getUTCDay() === 5) next.add(d);
    }
    onChange(next);
  };

  return (
    <div className="max-w-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text">
          Holidays <span className="font-normal text-muted">({value.size} selected)</span>
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={markAllFridays}
            className="text-xs font-medium text-primary hover:underline"
          >
            Mark all Fridays
          </button>
          {value.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-xs font-medium text-muted hover:text-text hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3 shadow-xs">
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-xs font-medium text-muted">
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((d) => {
            const active = value.has(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggle(d)}
                aria-pressed={active}
                className={cn(
                  'aspect-square rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary font-semibold text-white shadow-xs'
                    : 'text-text hover:bg-border/50'
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Click a day to mark it a holiday: 0 required hours, no deficiency, and working it counts as overtime.
      </p>
    </div>
  );
}
