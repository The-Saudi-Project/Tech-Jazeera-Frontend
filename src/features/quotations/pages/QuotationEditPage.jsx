/**
 * Edit quotation — loads it, maps to form values, saves a patch (server
 * recomputes totals).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuotation, updateQuotation } from '../quotations.api.js';
import { quotationToForm } from '../quotations.schema.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import QuotationForm from '../components/QuotationForm.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function QuotationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: quotation, isPending, isError } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(id),
  });

  const mutation = useMutation({
    mutationFn: (values) => updateQuotation(id, values),
    onSuccess: (updated) => {
      toast.success(`${updated.quotationNumber} updated.`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      navigate(`/quotations/${id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (isError) {
    return <EmptyState title="Quotation not found" description="It may have been deleted." />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit ${quotation.quotationNumber}`} description={quotation.clientName} />
      <QuotationForm
        defaultValues={quotationToForm(quotation)}
        onSubmit={(values) => mutation.mutate(values)}
        submitLabel="Save changes"
        submitting={mutation.isPending}
      />
    </div>
  );
}
