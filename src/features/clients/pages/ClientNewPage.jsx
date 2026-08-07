/**
 * New client — header + ClientForm + create mutation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createClient } from '../clients.api.js';
import { emptyClientForm, formToPayload } from '../clients.schema.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ClientForm from '../components/ClientForm.jsx';

export default function ClientNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values) => createClient(formToPayload(values)),
    onSuccess: (client) => {
      toast.success(`${client.companyName} added.`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate(`/clients/${client._id}`, { replace: true });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add client" description="Create a new client company." />
      <ClientForm
        defaultValues={emptyClientForm}
        onSubmit={(values) => mutation.mutate(values)}
        submitLabel="Create client"
        submitting={mutation.isPending}
      />
    </div>
  );
}
