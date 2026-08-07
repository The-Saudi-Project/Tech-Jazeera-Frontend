/**
 * Summary tab — per-worker status counts over a date range, with Excel/PDF
 * export. Defaults to the current month.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSummary, downloadExport } from '../attendance.api.js';
import { monthRange, todayKey } from '../attendance.dates.js';
import { ATTENDANCE_STATUSES } from '../../../lib/constants.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Table from '../../../components/ui/Table.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function SummaryTab() {
  const toast = useToast();
  const thisMonth = monthRange(todayKey());
  const [from, setFrom] = useState(thisMonth.from);
  const [to, setTo] = useState(thisMonth.to);
  const [exporting, setExporting] = useState(null); // 'xlsx' | 'pdf' | null

  const { data, isPending, isError } = useQuery({
    queryKey: ['attendance', 'summary', from, to],
    queryFn: () => getSummary({ from, to }),
    enabled: Boolean(from && to && from <= to),
  });

  async function handleExport(format) {
    setExporting(format);
    try {
      await downloadExport({ format, from, to });
    } catch (error) {
      toast.error(apiMessage(error, 'Export failed.'));
    } finally {
      setExporting(null);
    }
  }

  const columns = [
    {
      key: 'fullName',
      header: 'Worker',
      render: (r) => (
        <span>
          {r.fullName}
          <span className="block text-xs text-muted">{r.employeeId}</span>
        </span>
      ),
    },
    ...ATTENDANCE_STATUSES.map((s) => ({
      key: s,
      header: s,
      className: 'text-center tabular-nums',
      render: (r) => r[s] || 0,
    })),
    {
      key: 'total',
      header: 'Total',
      className: 'text-center font-semibold tabular-nums',
      render: (r) => r.total,
    },
  ];

  const rows = data?.rows ?? [];
  const rangeValid = from && to && from <= to;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:max-w-[170px]" />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-[170px]" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleExport('xlsx')}
            isLoading={exporting === 'xlsx'}
            disabled={!rangeValid || rows.length === 0}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('pdf')}
            isLoading={exporting === 'pdf'}
            disabled={!rangeValid || rows.length === 0}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {!rangeValid ? (
        <EmptyState title="Pick a valid range" description="The “from” date must be on or before the “to” date." />
      ) : isError ? (
        <EmptyState title="Could not load summary" description="Please try again." />
      ) : (
        <Table
          columns={columns}
          rows={rows}
          rowKey={(r) => r.employee}
          loading={isPending}
          emptyState={
            <EmptyState
              title="No attendance in this range"
              description="Mark attendance for these dates to see a summary."
            />
          }
        />
      )}
    </div>
  );
}
