/**
 * Assign worker — loads the assignable workers and active clients, then hands
 * off to DeploymentForm. Accepts `?worker=<id>` to pre-select a worker (used
 * when arriving from an employee profile's "Assign" button).
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assignWorker } from '../deployments.api.js';
import { emptyPlacement } from '../deployments.schema.js';
import { listEmployees } from '../../employees/employees.api.js';
import { listClients } from '../../clients/clients.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Button from '../../../components/ui/Button.jsx';
import DeploymentForm from '../components/DeploymentForm.jsx';

export default function DeploymentNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedWorker = searchParams.get('worker') ?? '';

  // Assignable = unassigned, type: 'Client' employees who haven't exited the
  // company (an internal Own-type employee is never deployed to a client).
  // We filter Exited out client-side (the server also rejects them); On
  // Leave workers stay eligible, matching the server's rule.
  const { data: workerData, isPending: workersLoading } = useQuery({
    queryKey: ['employees', { assignable: true }],
    queryFn: () => listEmployees({ unassigned: 'true', type: 'Client', limit: 100 }),
  });
  // Only active, approved clients can receive deployments — a
  // Coordinator-submitted client not yet approved isn't real enough to
  // commit a worker to (see docs/PHASE2-PLAN.md).
  const { data: clientData, isPending: clientsLoading } = useQuery({
    queryKey: ['clients', { active: true }],
    queryFn: () => listClients({ status: 'Active', approvalStatus: 'Approved', limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: assignWorker,
    onSuccess: (deployment) => {
      toast.success('Worker deployed.');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', deployment.worker] });
      navigate(`/employees/${deployment.worker}`);
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const defaultValues = useMemo(
    () => ({ worker: preselectedWorker, ...emptyPlacement }),
    [preselectedWorker]
  );

  if (workersLoading || clientsLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const workers = (workerData?.items ?? []).filter((w) => w.status !== 'Exited');
  const clients = clientData?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Assign worker" description="Deploy a worker to a client site." />
      {workers.length === 0 ? (
        <EmptyState
          title="No assignable workers"
          description="Every active worker is already deployed, or there are no active workers yet."
          action={
            <Button variant="secondary" onClick={() => navigate('/deployments')}>
              Back to deployments
            </Button>
          }
        />
      ) : clients.length === 0 ? (
        <EmptyState
          title="No active clients"
          description="Add an active client with at least one site before deploying workers."
          action={<Button variant="secondary" onClick={() => navigate('/clients/new')}>Add client</Button>}
        />
      ) : (
        <Card>
          <DeploymentForm
            workers={workers}
            clients={clients}
            defaultValues={defaultValues}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => navigate(-1)}
            submitLabel="Deploy worker"
            submitting={mutation.isPending}
          />
        </Card>
      )}
    </div>
  );
}
