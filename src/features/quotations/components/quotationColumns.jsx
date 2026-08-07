/**
 * Shared Table columns for quotations, used by the global list and the
 * client-profile panel. `showClient` adds the client column (the panel is
 * already scoped to one client, so it omits it).
 */
import { Link } from 'react-router-dom';
import { formatDate, formatMoney } from '../../../lib/utils.js';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import QuotationPdfButton from './QuotationPdfButton.jsx';

export const STATUS_VARIANT = { Draft: 'default', Approved: 'success', Rejected: 'danger' };

export function buildQuotationColumns({ showClient = false } = {}) {
  return [
    {
      key: 'quotationNumber',
      header: 'Number',
      render: (q) => (
        <Link to={`/quotations/${q._id}`} className="font-medium text-text hover:text-primary">
          {q.quotationNumber}
        </Link>
      ),
    },
    ...(showClient
      ? [{ key: 'clientName', header: 'Client', render: (q) => q.clientName }]
      : []),
    { key: 'date', header: 'Date', render: (q) => formatDate(q.date) },
    {
      key: 'status',
      header: 'Status',
      render: (q) => <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>,
    },
    {
      key: 'grandTotal',
      header: 'Total',
      className: 'text-right tabular-nums',
      render: (q) => formatMoney(q.grandTotal),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (q) => (
        <span className="flex justify-end gap-2">
          <Link to={`/quotations/${q._id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
          <QuotationPdfButton id={q._id} number={q.quotationNumber} size="sm" variant="ghost" />
        </span>
      ),
    },
  ];
}
