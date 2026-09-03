/**
 * Deployment register — every placement, current and historical, with status
 * and client filters. This is the read/overview screen; assigning happens on
 * a dedicated page, and transfer/end happen on the worker's profile (the
 * natural place to manage one worker's placement).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listDeployments } from '../deployments.api.js';
import { listClients } from '../../clients/clients.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { DEPLOYMENT_STATUSES, DEPLOYMENT_WRITE_ROLES } from '../../../lib/constants.js';
import { formatDate } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

const STATUS_VARIANT = { Active: 'success', Ended: 'default' };

export default function DeploymentListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = DEPLOYMENT_WRITE_ROLES.includes(user.role);

  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    status: '',
    client: '',
    sortOrder: 'desc',
  });

  // Clients for the filter dropdown (also confirms whether any client exists).
  const { data: clientData } = useQuery({
    queryKey: ['clients', 'all-for-filter'],
    queryFn: () => listClients({ limit: 100 }),
    staleTime: 60_000,
  });

  const { data, isPending, isError } = useQuery({
    queryKey: ['deployments', params],
    queryFn: () =>
      listDeployments({
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
        ...(params.status && { status: params.status }),
        ...(params.client && { client: params.client }),
      }),
    placeholderData: keepPreviousData,
  });

  const columns = [
    {
      key: 'worker',
      header: 'Worker',
      render: (d) => (
        <Link to={`/employees/${d.worker?._id}`} className="font-medium text-text hover:text-primary">
          {d.worker?.fullName ?? 'Unknown'}
          <span className="block text-xs font-normal text-muted">{d.worker?.employeeId}</span>
        </Link>
      ),
    },
    {
      key: 'client',
      header: 'Client / Site',
      render: (d) => (
        <span>
          {d.clientName}
          <span className="block text-xs text-muted">{d.site}</span>
        </span>
      ),
    },
    { key: 'shift', header: 'Shift', hideOnMobile: true, render: (d) => d.shift },
    {
      key: 'startDate',
      header: 'Period',
      render: (d) => (
        <span className="text-sm">
          {formatDate(d.startDate)}
          {d.endDate && <span className="text-muted"> → {formatDate(d.endDate)}</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge variant={STATUS_VARIANT[d.status]}>
          {d.status}
          {d.endReason ? ` · ${d.endReason}` : ''}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Deployments"
        description="Where every worker is placed — current and past."
        onBack={() => navigate(-1)}
        actions={canWrite && <Button onClick={() => navigate('/deployments/new')}>Assign worker</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Select
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="sm:max-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {DEPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={params.client}
          onChange={(e) => setParams((p) => ({ ...p, client: e.target.value, page: 1 }))}
          className="sm:max-w-xs"
          aria-label="Filter by client"
        >
          <option value="">All clients</option>
          {(clientData?.items ?? []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.companyName}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <EmptyState title="Could not load deployments" description="Please try again." />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(d) => d._id}
            loading={isPending}
            onRowClick={(d) => d.worker?._id && navigate(`/employees/${d.worker._id}`)}
            emptyState={
              <EmptyState
                title={params.status || params.client ? 'No deployments match' : 'No deployments yet'}
                description={
                  params.status || params.client
                    ? 'Try clearing the filters.'
                    : 'Assign a worker to a client site to create the first deployment.'
                }
                action={
                  !params.status && !params.client && canWrite ? (
                    <Button onClick={() => navigate('/deployments/new')}>Assign worker</Button>
                  ) : null
                }
              />
            }
          />

          {data && data.total > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <span>
                Showing {(data.page - 1) * params.limit + 1}–
                {Math.min(data.page * params.limit, data.total)} of {data.total}
              </span>
              <span className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}>
                  Previous
                </Button>
                <span className="tabular-nums">
                  {data.page} / {data.pages}
                </span>
                <Button size="sm" variant="secondary" disabled={data.page >= data.pages} onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}>
                  Next
                </Button>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
