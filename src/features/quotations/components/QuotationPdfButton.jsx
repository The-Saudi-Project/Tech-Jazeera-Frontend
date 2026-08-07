/**
 * QuotationPdfButton — downloads a quotation's PDF, with its own loading
 * state. Reused in the list rows and on the detail page.
 */
import { useState } from 'react';
import { downloadQuotationPdf } from '../quotations.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function QuotationPdfButton({ id, number, size = 'md', variant = 'secondary' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await downloadQuotationPdf(id, number);
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
