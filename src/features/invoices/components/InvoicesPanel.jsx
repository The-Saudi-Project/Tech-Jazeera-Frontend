/**
 * InvoicesPanel — the Invoices tab on a client profile: that client's
 * invoices. Unlike Quotations, there's no "New invoice" button here —
 * an invoice is always created FROM an approved quotation (see
 * QuotationViewPage), not started standalone.
 */
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listInvoices } from '../invoices.api.js';
import { buildInvoiceColumns } from './invoiceColumns.jsx';
import Card from '../../../components/ui/Card.jsx';
import Table from '../../../components/ui/Table.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function InvoicesPanel({ clientId }) {
  const { t } = useTranslation();
  const { data, isPending } = useQuery({
    queryKey: ['invoices', { client: clientId }],
    queryFn: () => listInvoices({ client: clientId, limit: 100 }),
  });

  const columns = buildInvoiceColumns({ t });

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffInvoices.panel.title')}</h2>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(inv) => inv._id}
          emptyState={
            <EmptyState
              title={t('staffInvoices.panel.emptyTitle')}
              description={t('staffInvoices.panel.emptyDescription')}
            />
          }
        />
      )}
    </Card>
  );
}
