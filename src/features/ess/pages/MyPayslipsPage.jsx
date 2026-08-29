/**
 * MyPayslipsPage — a Worker's own payslip history (P2-M5). Only Finalized
 * runs ever appear here — a Draft is never visible outside the office.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMyPayslips, downloadMyPayslipPdf } from '../ess.api.js';
import { apiMessage, formatMoney } from '../../../lib/utils.js';
import { MONTH_NAMES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function MyPayslipsPage() {
  const toast = useToast();
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'payslips'],
    queryFn: listMyPayslips,
  });

  async function handleDownload(p) {
    setDownloadingId(p.runId);
    try {
      await downloadMyPayslipPdf(p.runId, `Payslip-${MONTH_NAMES[p.periodMonth - 1]}-${p.periodYear}.pdf`);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not generate the payslip.'));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My payslips" description="Your finalized monthly pay." />

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Could not load your payslips" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
      ) : data.length === 0 ? (
        <EmptyState title="No payslips yet" description="Your finalized monthly payslips will appear here." />
      ) : (
        <Card className="divide-y divide-border">
          {data.map((p) => (
            <div key={p.runId} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {MONTH_NAMES[p.periodMonth - 1]} {p.periodYear}
                </p>
                <p className="text-xs text-muted">Net pay {formatMoney(p.netPay)}</p>
              </div>
              <Button size="sm" variant="secondary" isLoading={downloadingId === p.runId} onClick={() => handleDownload(p)}>
                Download
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
