/**
 * WorkerDeploymentPanel — the deployment section shown on an employee profile.
 * Owns its own data and mutations so the profile page stays thin.
 *
 * States:
 *  - active deployment  → current-placement card + Transfer / End actions
 *  - no active + not Exited → "not deployed" + Assign button
 *  - Exited employee    → a note (exited workers aren't deployed)
 * Below that, the worker's ended deployments render as history.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDeployments, transferDeployment, endDeployment } from '../deployments.api.js';
import { listClients } from '../../clients/clients.api.js';
import { emptyPlacement } from '../deployments.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { DEPLOYMENT_WRITE_ROLES } from '../../../lib/constants.js';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import DeploymentForm from './DeploymentForm.jsx';

function DetailRow({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children || '—'}</span>
    </div>
  );
}

export default function WorkerDeploymentPanel({ employee }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canWrite = DEPLOYMENT_WRITE_ROLES.includes(user.role);

  const [transferring, setTransferring] = useState(false);
  const [ending, setEnding] = useState(false);

  const workerId = employee._id;

  const { data, isPending } = useQuery({
    queryKey: ['deployments', { worker: workerId }],
    queryFn: () => listDeployments({ worker: workerId, limit: 100 }),
  });

  // Active clients (with sites) for the transfer form. Only fetched when the
  // transfer modal is open, to avoid a needless request on every profile view.
  const { data: clientData } = useQuery({
    queryKey: ['clients', { active: true }],
    queryFn: () => listClients({ status: 'Active', approvalStatus: 'Approved', limit: 100 }),
    enabled: transferring,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['deployments'] });
    queryClient.invalidateQueries({ queryKey: ['employee', workerId] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const transferMutation = useMutation({
    mutationFn: ({ id, values }) => transferDeployment(id, values),
    onSuccess: () => {
      toast.success(`${employee.fullName} transferred.`);
      setTransferring(false);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const endMutation = useMutation({
    mutationFn: (id) => endDeployment(id),
    onSuccess: () => {
      toast.success(`${employee.fullName} unassigned.`);
      setEnding(false);
      invalidate();
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setEnding(false);
    },
  });

  if (isPending) return <Skeleton className="h-40 w-full" />;

  const items = data?.items ?? [];
  const active = items.find((d) => d.status === 'Active') ?? null;
  const history = items.filter((d) => d.status !== 'Active');

  return (
    <>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Deployment</h2>
          {active && canWrite && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setTransferring(true)}>
                Transfer
              </Button>
              <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setEnding(true)}>
                End
              </Button>
            </div>
          )}
        </div>

        {active ? (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="success">Active</Badge>
              <Link to={`/clients/${active.client}`} className="font-medium hover:text-primary">
                {active.clientName}
              </Link>
            </div>
            <DetailRow label="Site">{active.site}</DetailRow>
            <DetailRow label="Shift">{active.shift}</DetailRow>
            <DetailRow label="Vehicle">{active.vehicle}</DetailRow>
            <DetailRow label="Driver">{active.driver}</DetailRow>
            <DetailRow label="Since">{formatDate(active.startDate)}</DetailRow>
          </div>
        ) : employee.status === 'Exited' ? (
          <p className="text-sm text-muted">Exited employees are not deployed.</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Not currently deployed.</p>
            {canWrite && (
              <Link to={`/deployments/new?worker=${workerId}`}>
                <Button size="sm">Assign to a client</Button>
              </Link>
            )}
          </div>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Deployment history
          </h2>
          <div className="divide-y divide-border">
            {history.map((d) => (
              <div key={d._id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">
                    {d.clientName} · {d.site}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(d.startDate)} → {formatDate(d.endDate)}
                  </p>
                </div>
                <Badge>{d.endReason ?? 'Ended'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transfer modal */}
      <Modal open={transferring} onClose={() => setTransferring(false)} title={`Transfer ${employee.fullName}`}>
        {clientData ? (
          <DeploymentForm
            clients={clientData.items ?? []}
            defaultValues={emptyPlacement}
            onSubmit={(values) => transferMutation.mutate({ id: active._id, values })}
            onCancel={() => setTransferring(false)}
            submitLabel="Transfer"
            submitting={transferMutation.isPending}
          />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </Modal>

      <ConfirmDialog
        open={ending}
        title="End deployment?"
        message={`${employee.fullName} will be unassigned from ${active?.clientName ?? 'the client'}. The deployment is kept in history.`}
        confirmLabel="End deployment"
        loading={endMutation.isPending}
        onConfirm={() => endMutation.mutate(active._id)}
        onCancel={() => setEnding(false)}
      />
    </>
  );
}
