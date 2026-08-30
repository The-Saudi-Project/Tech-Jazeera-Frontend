/**
 * MyPayslipsPage — a Worker's own payslip history (P2-M5). Only Finalized
 * runs ever appear here — a Draft is never visible outside the office.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listMyPayslips, downloadMyPayslipPdf } from '../ess.api.js';
import { apiMessage, formatMoney } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function MyPayslipsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'payslips'],
    queryFn: listMyPayslips,
  });

  function monthName(p) {
    return `${t(`common.months.${p.periodMonth}`)} ${p.periodYear}`;
  }

  async function handleDownload(p) {
    setDownloadingId(p.runId);
    try {
      await downloadMyPayslipPdf(p.runId, `Payslip-${monthName(p)}.pdf`);
    } catch (error) {
      toast.error(apiMessage(error, t('payslips.downloadError')));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('payslips.title')} description={t('payslips.description')} />

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title={t('payslips.loadError')} description={t('common.checkConnection')} action={<Button variant="secondary" onClick={() => refetch()}>{t('common.retry')}</Button>} />
      ) : data.length === 0 ? (
        <EmptyState title={t('payslips.empty')} description={t('payslips.emptyDescription')} />
      ) : (
        <Card className="divide-y divide-border">
          {data.map((p) => (
            <div key={p.runId} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{monthName(p)}</p>
                <p className="text-xs text-muted">{t('payslips.netPay', { amount: formatMoney(p.netPay) })}</p>
              </div>
              <Button size="sm" variant="secondary" isLoading={downloadingId === p.runId} onClick={() => handleDownload(p)}>
                {t('payslips.download')}
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
