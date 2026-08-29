/**
 * ProfitCard — P2-M8's real profit section, replacing the old "profit needs
 * cost data" placeholder now that Invoices (P2-M6), finalized Payroll
 * (P2-M5) and Expenses (P2-M7) all exist. A month selector, that month's
 * Revenue/Payroll cost/Expenses/Net figures, and a 6-month trend as simple
 * diverging bars (no chart library — the stack is locked, same call as
 * StatusBreakdown).
 */
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import { formatMoney, cn } from '../../../lib/utils.js';

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short' });
}

function NetTile({ label, value, accent, hint }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent)}>{formatMoney(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A diverging bar chart: each month's net profit grows up (green) from a
 *  zero line if positive, or down (red) if negative — scaled to the largest
 *  absolute net in the trend. Pure divs, same "~20 lines, no library"
 *  approach as StatusBreakdown. */
function TrendBars({ trend }) {
  const maxAbs = Math.max(1, ...trend.map((m) => Math.abs(m.net)));
  return (
    <div className="flex h-32 items-stretch gap-2">
      {trend.map((m) => {
        const pct = Math.round((Math.abs(m.net) / maxAbs) * 100);
        const isNeg = m.net < 0;
        return (
          <div key={m.month} className="flex flex-1 flex-col items-center">
            <div className="flex w-full flex-1 flex-col justify-center" title={`${monthLabel(m.month)}: ${formatMoney(m.net)}`}>
              <div className="flex h-1/2 flex-col justify-end">
                {!isNeg && m.net > 0 && <div className="mx-auto w-2/3 rounded-t bg-success" style={{ height: `${pct}%` }} />}
              </div>
              <div className="h-px w-full bg-border" />
              <div className="flex h-1/2 flex-col justify-start">
                {isNeg && <div className="mx-auto w-2/3 rounded-b bg-danger" style={{ height: `${pct}%` }} />}
              </div>
            </div>
            <span className="mt-2 text-[11px] text-muted">{monthLabel(m.month)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProfitCard({ profit, month, onMonthChange }) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Profit</h2>
        <Input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-auto"
          aria-label="Select month"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NetTile label="Revenue" value={profit.revenue} accent="text-text" hint="Invoiced this month" />
        <NetTile label="Payroll cost" value={profit.payrollCost} accent="text-text" hint="Finalized run" />
        <NetTile label="Expenses" value={profit.expenses} accent="text-text" hint="Recorded this month" />
        <NetTile
          label="Net profit"
          value={profit.net}
          accent={profit.net >= 0 ? 'text-success' : 'text-danger'}
          hint="Revenue − payroll − expenses"
        />
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Last 6 months</p>
        <TrendBars trend={profit.trend} />
      </div>
    </Card>
  );
}
