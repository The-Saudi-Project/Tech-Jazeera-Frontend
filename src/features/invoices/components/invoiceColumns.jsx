/**
 * Shared Table columns for invoices, used by the global list and the
 * client-profile panel. `showClient` adds the client column (the panel is
 * already scoped to one client, so it omits it).
 */
import { Link } from 'react-router-dom';
import { formatDate, formatMoney } from '../../../lib/utils.js';
import { INVOICE_STATUS_VARIANT } from '../../../lib/constants.js';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import InvoicePdfButton from './InvoicePdfButton.jsx';

export function buildInvoiceColumns({ showClient = false } = {}) {
  return [
    {
      key: 'invoiceNumber',
      header: 'Number',
      render: (inv) => (
        <Link to={`/invoices/${inv._id}`} className="font-medium text-text hover:text-primary">
          {inv.invoiceNumber}
        </Link>
      ),
    },
    ...(showClient ? [{ key: 'clientName', header: 'Client', render: (inv) => inv.clientName }] : []),
    { key: 'date', header: 'Date', hideOnMobile: true, render: (inv) => formatDate(inv.date) },
    { key: 'dueDate', header: 'Due', hideOnMobile: true, render: (inv) => formatDate(inv.dueDate) },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => <Badge variant={INVOICE_STATUS_VARIANT[inv.status]}>{inv.status}</Badge>,
    },
    {
      key: 'balanceDue',
      header: 'Balance due',
      className: 'text-right tabular-nums',
      render: (inv) => formatMoney(inv.balanceDue),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (inv) => (
        <span className="flex justify-end gap-2">
          <Link to={`/invoices/${inv._id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
          <InvoicePdfButton id={inv._id} number={inv.invoiceNumber} size="sm" variant="ghost" />
        </span>
      ),
    },
  ];
}
