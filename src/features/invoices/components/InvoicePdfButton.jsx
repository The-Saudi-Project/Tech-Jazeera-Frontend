/**
 * InvoicePdfButton — downloads an invoice's PDF, with its own loading
 * state. Mirrors QuotationPdfButton.
 */
import { useState } from 'react';
import { downloadInvoicePdf } from '../invoices.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function InvoicePdfButton({ id, number, size = 'md', variant = 'secondary' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await downloadInvoicePdf(id, number);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not generate the PDF.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={variant} onClick={handle} isLoading={busy}>
      PDF
    </Button>
  );
}
