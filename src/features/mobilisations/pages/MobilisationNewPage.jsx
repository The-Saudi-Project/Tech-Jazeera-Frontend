/**
 * MobilisationNewPage — loads the workers/clients/subcontractors pickers,
 * then hands off to MobilisationForm. Always creates a Draft; inviting
 * co-coordinators and submitting for review happen on MobilisationDetailPage.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createMobilisation } from '../mobilisations.api.js';
import { emptyMobilisationForm } from '../mobilisations.schema.js';
import { listEmployees } from '../../employees/employees.api.js';
import { listClients } from '../../clients/clients.api.js';
import { listSubcontractors } from '../../subcontractors/subcontractors.api.js';
import { listJobTitles } from '../../jobTitles/jobTitles.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import MobilisationForm from '../components/MobilisationForm.jsx';

export default function MobilisationNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

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
  const { data: jobTitleData, isPending: jobTitlesLoading } = useQuery({
    queryKey: ['job-titles'],
    queryFn: () => listJobTitles({ activeOnly: 'true' }),
  });

  const mutation = useMutation({
    mutationFn: createMobilisation,
    onSuccess: (mobilisation) => {
      toast.success('Mobilisation created.');
      queryClient.invalidateQueries({ queryKey: ['mobilisations'] });
      navigate(`/mobilisations/${mobilisation._id}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function handleSubmit(values) {
    mutation.mutate(values);
  }

  if (workersLoading || clientsLoading || subcontractorsLoading || jobTitlesLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const workers = (workerData?.items ?? []).filter((w) => w.status !== 'Exited');
  const clients = clientData?.items ?? [];
  const subcontractors = subcontractorData?.items ?? [];
  const jobTitles = jobTitleData ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New mobilisation"
        description="Place a worker with a client and record its billing terms."
        onBack={() => navigate(-1)}
      />
      <Card>
        <MobilisationForm
          workers={workers}
          clients={clients}
          subcontractors={subcontractors}
          jobTitles={jobTitles}
          defaultValues={emptyMobilisationForm}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/mobilisations')}
          submitLabel="Save draft"
          submitting={mutation.isPending}
        />
      </Card>
    </div>
  );
}
