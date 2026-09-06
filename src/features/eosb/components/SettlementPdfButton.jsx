/**
 * SettlementPdfButton — downloads a settlement's PDF, with its own loading
 * state. Mirrors QuotationPdfButton.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadSettlementPdf } from '../eosb.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function SettlementPdfButton({ id, employeeCode, size = 'md', variant = 'secondary' }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await downloadSettlementPdf(id, employeeCode);
    } catch (error) {
      toast.error(apiMessage(error, t('staffEosb.pdfButton.failedToast')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={variant} onClick={handle} isLoading={busy}>
      {t('staffEosb.pdfButton.label')}
    </Button>
  );
}
