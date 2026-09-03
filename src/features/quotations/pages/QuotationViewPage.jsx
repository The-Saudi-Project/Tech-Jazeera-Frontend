/**
 * Quotation detail — a read view of the quotation with its line items and
 * totals, plus actions: edit, duplicate, download PDF, delete. Status-changing
 * happens via edit.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getQuotation, duplicateQuotation, deleteQuotation } from '../quotations.api.js';
import { STATUS_VARIANT } from '../components/quotationColumns.jsx';
import QuotationPdfButton from '../components/QuotationPdfButton.jsx';
import { listInvoices, createInvoice } from '../../invoices/invoices.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { QUOTATION_WRITE_ROLES, QUOTATION_DELETE_ROLES, INVOICE_WRITE_ROLES } from '../../../lib/constants.js';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

/** Amount a line contributes to the total (net + its tax). */
function lineAmount(li) {
  const gross = li.quantity * li.unitPrice;
  const net = gross - gross * ((li.discount ?? 0) / 100);
  return net + net * ((li.taxRate ?? 0) / 100);
}

export default function QuotationViewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canWrite = QUOTATION_WRITE_ROLES.includes(user.role);
  const canDelete = QUOTATION_DELETE_ROLES.includes(user.role);
  const canInvoice = INVOICE_WRITE_ROLES.includes(user.role);

  const { data: q, isPending, isError } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(id),
  });

  // Whether this quotation already has an invoice — governs "Create
  // invoice" vs "View invoice" below. Only relevant once Approved.
  const { data: existingInvoices } = useQuery({
    queryKey: ['invoices', { quotation: id }],
    queryFn: () => listInvoices({ quotation: id, limit: 1 }),
    enabled: !!q && q.status === 'Approved',
  });
  const existingInvoice = existingInvoices?.items?.[0] ?? null;

  const createInvoiceMutation = useMutation({
    mutationFn: () => createInvoice({ quotation: id }),
    onSuccess: (invoice) => {
      toast.success(`${invoice.invoiceNumber} created.`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/invoices/${invoice._id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateQuotation(id),
    onSuccess: (copy) => {
      toast.success(`Duplicated as ${copy.quotationNumber}.`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${copy._id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuotation(id),
    onSuccess: () => {
      toast.success(`${q.quotationNumber} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations', { replace: true });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setConfirmingDelete(false);
    },
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        title="Quotation not found"
        description="It may have been deleted."
        action={
          <Link to="/quotations">
            <Button variant="secondary">Back to quotations</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={q.quotationNumber}
        description={q.clientName}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Badge variant={STATUS_VARIANT[q.status]} className="mr-1">
              {q.status}
            </Badge>
            <QuotationPdfButton id={q._id} number={q.quotationNumber} />
            {q.status === 'Approved' && canInvoice && existingInvoice && (
              <Link to={`/invoices/${existingInvoice._id}`}>
                <Button variant="secondary">View invoice</Button>
              </Link>
            )}
            {q.status === 'Approved' && canInvoice && !existingInvoice && (
              <Button isLoading={createInvoiceMutation.isPending} onClick={() => createInvoiceMutation.mutate()}>
                Create invoice
              </Button>
            )}
            {canWrite && (
              <>
                <Button variant="secondary" onClick={() => navigate(`/quotations/${id}/edit`)}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => duplicateMutation.mutate()} isLoading={duplicateMutation.isPending}>
                  Duplicate
                </Button>
              </>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">Date</span>
            {formatDate(q.date)}
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">Valid until</span>
            {q.validUntil ? formatDate(q.validUntil) : '—'}
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-medium">Type</th>
                <th className="py-2 pr-2 font-medium">Description</th>
                <th className="py-2 pr-2 text-right font-medium">Qty</th>
                <th className="py-2 pr-2 text-right font-medium">Unit</th>
                <th className="py-2 pr-2 text-right font-medium">Disc%</th>
                <th className="py-2 pr-2 text-right font-medium">Tax%</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {q.lineItems.map((li, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2">{li.type}</td>
                  <td className="py-2 pr-2">{li.description}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{li.quantity}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatMoney(li.unitPrice)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{li.discount ?? 0}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{li.taxRate ?? 0}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(lineAmount(li))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(q.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Discount</span>
            <span className="tabular-nums">−{formatMoney(q.discountTotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>VAT / Tax</span>
            <span className="tabular-nums">{formatMoney(q.taxTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{formatMoney(q.grandTotal)}</span>
          </div>
        </div>

        {q.notes && (
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">Notes</span>
            <p className="mt-1 whitespace-pre-wrap text-sm">{q.notes}</p>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete quotation?"
        message={`${q.quotationNumber} will be permanently removed.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
