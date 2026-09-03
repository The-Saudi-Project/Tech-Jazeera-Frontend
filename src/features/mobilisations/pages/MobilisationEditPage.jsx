/**
 * MobilisationEditPage — edits a Draft or Rejected mobilisation's Section 1
 * fields. MobilisationDetailPage is the "view" (coordinators, submit,
 * Marketing Manager review, documents); this page is Section 1 only.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getMobilisation, updateMobilisation } from '../mobilisations.api.js';
import { mobilisationToForm } from '../mobilisations.schema.js';
import { listEmployees } from '../../employees/employees.api.js';
import { listClients } from '../../clients/clients.api.js';
import { listSubcontractors } from '../../subcontractors/subcontractors.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Button from '../../../components/ui/Button.jsx';
import MobilisationForm from '../components/MobilisationForm.jsx';

export default function MobilisationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: mobilisation, isPending, isError } = useQuery({
    queryKey: ['mobilisation', id],
    queryFn: () => getMobilisation(id),
  });
  const { data: workerData, isPending: workersLoading } = useQuery({
    queryKey: ['employees', { forMobilisation: true }],
    queryFn: () => listEmployees({ limit: 100 }),
  });
  const { data: clientData, isPending: clientsLoading } = useQuery({
    queryKey: ['clients', { active: true }],
    queryFn: () => listClients({ status: 'Active', approvalStatus: 'Approved', limit: 100 }),
  });
  const { data: subcontractorData, isPending: subcontractorsLoading } = useQuery({
    queryKey: ['subcontractors', { active: true }],
    queryFn: () => listSubcontractors({ status: 'Active', limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: (values) => updateMobilisation(id, values),
    onSuccess: () => {
      toast.success('Mobilisation updated.');
      queryClient.invalidateQueries({ queryKey: ['mobilisations'] });
      queryClient.invalidateQueries({ queryKey: ['mobilisation', id] });
      navigate(`/mobilisations/${id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const loading = isPending || workersLoading || clientsLoading || subcontractorsLoading;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !mobilisation) {
    return (
      <EmptyState
        title="Mobilisation not found"
        description="It may have been removed, or you don't have access to it."
        action={<Button variant="secondary" onClick={() => navigate('/mobilisations')}>Back to mobilisations</Button>}
      />
    );
  }

  if (!['Draft', 'Rejected'].includes(mobilisation.status)) {
    return (
      <EmptyState
        title="This mobilisation can no longer be edited"
        description={`Only a Draft or Rejected mobilisation can be edited — this one is ${mobilisation.status}.`}
        action={<Button variant="secondary" onClick={() => navigate(`/mobilisations/${id}`)}>Back to mobilisation</Button>}
      />
    );
  }

  const workers = (workerData?.items ?? []).filter((w) => w.status !== 'Exited' || w._id === mobilisation.worker);
  const clients = clientData?.items ?? [];
  const subcontractors = subcontractorData?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Edit mobilisation"
        description={`${mobilisation.workerName} — ${mobilisation.clientName}`}
        onBack={() => navigate(-1)}
      />
      <Card>
        <MobilisationForm
          workers={workers}
          clients={clients}
          subcontractors={subcontractors}
          defaultValues={mobilisationToForm(mobilisation)}
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => navigate(`/mobilisations/${id}`)}
          submitLabel="Save changes"
          submitting={mutation.isPending}
        />
      </Card>
    </div>
  );
}
