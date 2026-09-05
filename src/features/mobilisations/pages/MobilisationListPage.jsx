/**
 * MobilisationListPage — every mobilisation this viewer can see (M1: their
 * own, as coordinator; Admin sees all). Row-clickable to edit, same "detail
 * view" until a proper detail page lands in M2/M3.
 */
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listMobilisations } from '../mobilisations.api.js';
import { formatDate } from '../../../lib/utils.js';
import { MOBILISATION_STATUSES, MOBILISATION_STATUS_VARIANT } from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function MobilisationListPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [params, setParams] = useState({ page: 1, limit: 20, search: '', status: '' });

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => (p.search === search ? p : { ...p, search, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['mobilisations', params],
    queryFn: () =>
      listMobilisations({
        page: params.page,
        limit: params.limit,
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
      }),
    placeholderData: keepPreviousData,
    // Same reasoning as the Leave review queue: a coordinator submitting or
    // a Marketing Manager deciding a mobilisation from another session has
    // no way to reach this already-open list otherwise.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const columns = [
    { key: 'workerName', header: 'Worker', render: (m) => m.workerName },
    { key: 'jobTitle', header: 'Job title', hideOnMobile: true, render: (m) => m.jobTitle },
    { key: 'clientName', header: 'Client', render: (m) => m.clientName },
    { key: 'mobilisationDate', header: 'Mobilisation date', hideOnMobile: true, render: (m) => formatDate(m.mobilisationDate) },
    {
      key: 'status',
      header: 'Status',
      render: (m) => <Badge variant={MOBILISATION_STATUS_VARIANT[m.status]}>{m.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (m) => (
        <span className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/mobilisations/${m._id}`)}>
            View
          </Button>
        </span>
      ),
    },
  ];

  const noFilters = !params.search && !params.status;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Mobilisations"
        description="Worker placements with client billing terms."
        onBack={() => navigate(-1)}
        actions={
          <Button size="sm" onClick={() => navigate('/mobilisations/new')}>
            New mobilisation
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          placeholder="Search worker, client, job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search mobilisations"
        />
        <Select
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="sm:max-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {MOBILISATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <EmptyState
          title="Could not load mobilisations"
          description="Please try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(m) => m._id}
            loading={isPending}
            onRowClick={(m) => navigate(`/mobilisations/${m._id}`)}
            emptyState={
              <EmptyState
                title={noFilters ? 'No mobilisations yet' : 'No mobilisations match'}
                description={noFilters ? 'Create your first mobilisation above.' : 'Try clearing the search or filters.'}
                action={noFilters && <Button variant="secondary" onClick={() => navigate('/mobilisations/new')}>New mobilisation</Button>}
              />
            }
          />

          {data && data.total > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <span>
                Showing {(data.page - 1) * params.limit + 1}–{Math.min(data.page * params.limit, data.total)} of {data.total}
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
