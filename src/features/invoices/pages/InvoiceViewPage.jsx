/**
 * Invoice detail — line items, totals, payment history, and recording a
 * new payment. Line items/totals are read-only (frozen at creation, unlike
 * a Quotation); only payments and delete (before any payment) are actions.
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoice, recordPayment, deleteInvoice } from '../invoices.api.js';
import InvoicePdfButton from '../components/InvoicePdfButton.jsx';
import { paymentFormSchema, emptyPaymentForm } from '../invoices.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import { INVOICE_STATUS_VARIANT, INVOICE_WRITE_ROLES, INVOICE_DELETE_ROLES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

/** Amount a line contributes to the total (net + its tax) — same math as the PDF/server. */
function lineAmount(li) {
  const gross = li.quantity * li.unitPrice;
  const net = gross - gross * ((li.discount ?? 0) / 100);
  return net + net * ((li.taxRate ?? 0) / 100);
}

export default function InvoiceViewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite = INVOICE_WRITE_ROLES.includes(user.role);
  const canDelete = INVOICE_DELETE_ROLES.includes(user.role);

  const [recordingPayment, setRecordingPayment] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: inv, isPending, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(paymentFormSchema), defaultValues: emptyPaymentForm });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoice', id] });

  const paymentMutation = useMutation({
    mutationFn: (values) => recordPayment(id, values),
    onSuccess: (updated) => {
      toast.success(`Payment recorded — invoice ${updated.status.toLowerCase()}.`);
      setRecordingPayment(false);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(id),
    onSuccess: () => {
      toast.success(`${inv.invoiceNumber} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/invoices', { replace: true });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setConfirmingDelete(false);
    },
  });

  function openRecordPayment() {
    reset(emptyPaymentForm);
    setRecordingPayment(true);
  }

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
        title="Invoice not found"
        description="It may have been deleted."
        action={<Link to="/invoices"><Button variant="secondary">Back to invoices</Button></Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={inv.invoiceNumber}
        description={inv.clientName}
        actions={
          <>
            <Badge variant={INVOICE_STATUS_VARIANT[inv.status]} className="mr-1">
              {inv.status}
            </Badge>
            <InvoicePdfButton id={inv._id} number={inv.invoiceNumber} />
            {canWrite && inv.status !== 'Paid' && <Button onClick={openRecordPayment}>Record payment</Button>}
            {canDelete && inv.payments.length === 0 && (
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
            {formatDate(inv.date)}
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">Due date</span>
            {inv.dueDate ? formatDate(inv.dueDate) : '—'}
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">From quotation</span>
            <Link to={`/quotations/${inv.quotation}`} className="text-primary hover:underline">
              {inv.quotationNumber}
            </Link>
          </div>
        </div>

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
              {inv.lineItems.map((li, i) => (
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

        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(inv.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Discount</span>
            <span className="tabular-nums">−{formatMoney(inv.discountTotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>VAT / Tax</span>
            <span className="tabular-nums">{formatMoney(inv.taxTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{formatMoney(inv.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Paid</span>
            <span className="tabular-nums">{formatMoney(inv.amountPaid)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <span>Balance due</span>
            <span className="tabular-nums">{formatMoney(inv.balanceDue)}</span>
          </div>
        </div>

        {inv.notes && (
          <div>
            <span className="block text-xs uppercase tracking-wide text-muted">Notes</span>
            <p className="mt-1 whitespace-pre-wrap text-sm">{inv.notes}</p>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Payments</h2>
        {inv.payments.length === 0 ? (
          <EmptyState title="No payments yet" description="Record a payment as it's received." />
        ) : (
          <Card className="divide-y divide-border">
            {inv.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{formatMoney(p.amount)}</p>
                  <p className="text-xs text-muted">
                    {formatDate(p.date)}
                    {p.method && ` · ${p.method}`}
                    {p.reference && ` · ${p.reference}`}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Modal open={recordingPayment} onClose={() => setRecordingPayment(false)} title="Record a payment">
        <form onSubmit={handleSubmit((values) => paymentMutation.mutate(values))} noValidate className="space-y-4">
          <p className="text-sm text-muted">
            Balance due: <span className="font-semibold text-text">{formatMoney(inv.balanceDue)}</span>
          </p>
          <Input label="Amount *" type="number" step="0.01" min="0.01" error={errors.amount?.message} {...register('amount')} />
          <Input label="Date *" type="date" error={errors.date?.message} {...register('date')} />
          <Input label="Method" placeholder="Bank Transfer, Cheque, Cash…" error={errors.method?.message} {...register('method')} />
          <Input label="Reference" placeholder="Optional" error={errors.reference?.message} {...register('reference')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRecordingPayment(false)} disabled={paymentMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={paymentMutation.isPending}>
              Save payment
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete invoice?"
        message={`${inv.invoiceNumber} will be permanently removed.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
