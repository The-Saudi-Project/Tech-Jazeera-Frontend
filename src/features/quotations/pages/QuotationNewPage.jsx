/**
 * New quotation — header + QuotationForm + create mutation. Accepts
 * `?client=<id>` to pre-select a client (from a client profile's Quotations tab).
 */
import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createQuotation } from '../quotations.api.js';
import { emptyQuotationForm } from '../quotations.schema.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import QuotationForm from '../components/QuotationForm.jsx';

export default function QuotationNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetClient = searchParams.get('client') ?? '';

  const defaultValues = useMemo(
    () => ({ ...emptyQuotationForm, client: presetClient || emptyQuotationForm.client }),
    [presetClient]
  );

  const mutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: (quotation) => {
      toast.success(`${quotation.quotationNumber} created.`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${quotation._id}`, { replace: true });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New quotation" description="Build a priced offer for a client." />
      <QuotationForm
        defaultValues={defaultValues}
        onSubmit={(values) => mutation.mutate(values)}
        submitLabel="Create quotation"
        submitting={mutation.isPending}
      />
    </div>
  );
}
