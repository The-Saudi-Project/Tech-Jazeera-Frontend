/**
 * Assign worker — loads the assignable workers and active clients, then hands
 * off to DeploymentForm. Accepts `?worker=<id>` to pre-select a worker (used
 * when arriving from an employee profile's "Assign" button).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedWorker = searchParams.get('worker') ?? '';

  // Assignable = unassigned workforce employees (Client or Subcontracted)
  // who haven't exited the company (an internal Own-type employee is never
  // deployed to a client). Type isn't filtered server-side — filtered
  // client-side below alongside the Exited filter (the server also rejects
  // Exited); On Leave workers stay eligible, matching the server's rule.
  const { data: workerData, isPending: workersLoading } = useQuery({
    queryKey: ['employees', { assignable: true }],
    queryFn: () => listEmployees({ unassigned: 'true', limit: 100 }),
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
      toast.success(t('staffDeployments.new.deployedToast'));
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

  const workers = (workerData?.items ?? []).filter((w) => w.type !== 'Own' && w.status !== 'Exited');
  const clients = clientData?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t('staffDeployments.new.pageTitle')}
        description={t('staffDeployments.new.pageDescription')}
        onBack={() => navigate(-1)}
      />
      {workers.length === 0 ? (
        <EmptyState
          title={t('staffDeployments.new.noWorkersTitle')}
          description={t('staffDeployments.new.noWorkersDescription')}
          action={
            <Button variant="secondary" onClick={() => navigate('/deployments')}>
              {t('staffDeployments.new.backToDeployments')}
            </Button>
          }
        />
      ) : clients.length === 0 ? (
        <EmptyState
          title={t('staffDeployments.new.noClientsTitle')}
          description={t('staffDeployments.new.noClientsDescription')}
          action={<Button variant="secondary" onClick={() => navigate('/clients/new')}>{t('staffDeployments.new.addClient')}</Button>}
        />
      ) : (
        <Card>
          <DeploymentForm
            workers={workers}
            clients={clients}
            defaultValues={defaultValues}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => navigate(-1)}
            submitLabel={t('staffDeployments.new.submitLabel')}
            submitting={mutation.isPending}
          />
        </Card>
      )}
    </div>
  );
}
