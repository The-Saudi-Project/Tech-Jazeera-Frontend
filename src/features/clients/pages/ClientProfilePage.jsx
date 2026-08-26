/**
 * Client profile — tabbed view.
 *
 * Tabs, each backed by REAL data (no placeholder tabs):
 *   - Overview   — the client record, including its sites.
 *   - Workers    — employees currently assigned here (live query on the
 *                  employee endpoint filtered by client).
 *   - Documents  — this client's files (M8).
 *   - Quotations — priced offers to this client (M9).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClient, deleteClient } from '../clients.api.js';
import { listEmployees } from '../../employees/employees.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { CLIENT_DELETE_ROLES, CLIENT_APPROVAL_VARIANT } from '../../../lib/constants.js';
import { canDecideClient, canEditClient } from '../clients.permissions.js';
import { apiMessage, cn, formatDate } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DecideClientModal from '../components/DecideClientModal.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Table from '../../../components/ui/Table.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import DocumentsPanel from '../../documents/components/DocumentsPanel.jsx';
import QuotationsPanel from '../../quotations/components/QuotationsPanel.jsx';

const STATUS_VARIANT = { Active: 'success', Inactive: 'default' };

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children || '—'}</dd>
    </div>
  );
}

/** Overview tab — the client record. */
function OverviewTab({ client }) {
  return (
    <div className="space-y-6">
      {client.approvalStatus === 'Rejected' && (
        <Card className="border-danger/30 bg-danger/5">
          <div className="flex items-start gap-3">
            <Badge variant="danger">Rejected</Badge>
            <div>
              <p className="text-sm font-medium">This submission was rejected.</p>
              {client.decisionNote && <p className="mt-1 text-sm text-muted">{client.decisionNote}</p>}
              {client.decidedBy?.name && (
                <p className="mt-1 text-xs text-muted">
                  By {client.decidedBy.name}, {formatDate(client.decidedAt)}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
      {client.approvalStatus === 'Pending' && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <Badge variant="warning">Pending approval</Badge>
            <p className="text-sm text-muted">Not usable for deployments or quotations yet.</p>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Company details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Contact person">{client.contactPerson}</Field>
          <Field label="Phone">{client.phone}</Field>
          <Field label="Email">{client.email}</Field>
          <Field label="Industry">{client.industry}</Field>
          <Field label="VAT number">{client.vatNumber}</Field>
          <Field label="Commercial Registration">{client.crNumber}</Field>
          <Field label="Address">{client.address}</Field>
          <Field label="Added by">
            {client.createdBy?.name && (
              <>
                {client.createdBy.name}
                {client.createdBy.role === 'Coordinator' && (
                  <Badge variant="primary" className="ml-1.5">
                    Coordinator
                  </Badge>
                )}
              </>
            )}
          </Field>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Sites {client.sites?.length ? `(${client.sites.length})` : ''}
        </h2>
        {client.sites?.length ? (
          <div className="divide-y divide-border">
            {client.sites.map((site) => (
              <div key={site._id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium">{site.name}</p>
                <p className="text-xs text-muted">
                  {[site.city, site.address].filter(Boolean).join(' · ') || 'No location details'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No sites recorded for this client.</p>
        )}
      </Card>

      {client.notes && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
        </Card>
      )}
    </div>
  );
}

/** Workers tab — live query of employees assigned to this client. */
function WorkersTab({ clientId }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['employees', { client: clientId }],
    queryFn: () => listEmployees({ client: clientId, limit: 100 }),
  });

  const columns = [
    {
      key: 'fullName',
      header: 'Worker',
      render: (e) => (
        <Link to={`/employees/${e._id}`} className="font-medium text-text hover:text-primary">
          {e.fullName}
          <span className="block text-xs font-normal text-muted">{e.employeeId}</span>
        </Link>
      ),
    },
    { key: 'designation', header: 'Designation', render: (e) => e.designation },
    { key: 'currentSite', header: 'Site', render: (e) => e.currentSite || '—' },
    { key: 'status', header: 'Status', render: (e) => <Badge>{e.status}</Badge> },
  ];

  if (isError) {
    return <EmptyState title="Could not load workers" description="Please try again." />;
  }

  return (
    <Table
      columns={columns}
      rows={data?.items ?? []}
      rowKey={(e) => e._id}
      loading={isPending}
      emptyState={
        <EmptyState
          title="No workers assigned"
          description="Workers assigned to this client through deployments will appear here."
        />
      }
    />
  );
}

export default function ClientProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deciding, setDeciding] = useState(false);

  const canDelete = CLIENT_DELETE_ROLES.includes(user.role);

  const { data: client, isPending, isError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(id),
    onSuccess: () => {
      toast.success(`${client.companyName} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate('/clients', { replace: true });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setConfirmingDelete(false);
    },
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        title="Client not found"
        description="The record may have been deleted."
        action={
          <Link to="/clients">
            <Button variant="secondary">Back to clients</Button>
          </Link>
        }
      />
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'workers', label: 'Workers' },
    { key: 'documents', label: 'Documents' },
    { key: 'quotations', label: 'Quotations' },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={client.companyName}
        description={client.industry}
        actions={
          <>
            <Badge variant={STATUS_VARIANT[client.status]} className="mr-1">
              {client.status}
            </Badge>
            {client.approvalStatus !== 'Approved' && (
              <Badge variant={CLIENT_APPROVAL_VARIANT[client.approvalStatus]} className="mr-1">
                {client.approvalStatus}
              </Badge>
            )}
            {canDecideClient(user, client) && <Button onClick={() => setDeciding(true)}>Review</Button>}
            {canEditClient(user, client) && (
              <Button variant="secondary" onClick={() => navigate(`/clients/${id}/edit`)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab client={client} />}
      {tab === 'workers' && <WorkersTab clientId={id} />}
      {tab === 'documents' && (
        <DocumentsPanel ownerType="Client" ownerId={id} ownerName={client.companyName} />
      )}
      {tab === 'quotations' && <QuotationsPanel clientId={id} />}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete client?"
        message={`${client.companyName} will be permanently removed. Set status to "Inactive" instead if you just want to archive it.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />

      <DecideClientModal client={deciding ? client : null} onClose={() => setDeciding(false)} />
    </div>
  );
}
