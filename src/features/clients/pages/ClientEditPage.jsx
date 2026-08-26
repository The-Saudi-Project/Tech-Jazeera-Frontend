/**
 * Edit client — loads the record, maps it to form values, saves a patch.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getClient, updateClient } from '../clients.api.js';
import { clientToForm, formToPayload } from '../clients.schema.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ClientForm from '../components/ClientForm.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function ClientEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: client, isPending, isError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id),
  });

  const mutation = useMutation({
    mutationFn: (values) => updateClient(id, formToPayload(values)),
    onSuccess: (updated) => {
      toast.success(`${updated.companyName} updated.`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      navigate(`/clients/${id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (isError) {
    return <EmptyState title="Client not found" description="The record may have been deleted." />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${client.companyName}`} />
      <ClientForm
        defaultValues={clientToForm(client)}
        onSubmit={(values) => mutation.mutate(values)}
        submitLabel="Save changes"
        submitting={mutation.isPending}
        client={client}
      />
    </div>
  );
}
