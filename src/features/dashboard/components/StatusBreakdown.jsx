/**
 * StatusBreakdown — a lightweight horizontal bar chart (proportional divs, no
 * charting library — the stack is locked and this is ~20 lines). Shows each
 * status's share of the total.
 */
import Card from '../../../components/ui/Card.jsx';
import { cn } from '../../../lib/utils.js';

const BAR_COLOR = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
  default: 'bg-muted',
};

export default function StatusBreakdown({ title, data, colors }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {total === 0 ? (
        <p className="text-sm text-muted">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(data).map(([label, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border/50">
                  <div
                    className={cn('h-full rounded-full', BAR_COLOR[colors[label]] ?? BAR_COLOR.default)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
