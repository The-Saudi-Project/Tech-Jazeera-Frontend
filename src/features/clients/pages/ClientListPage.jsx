/**
 * Client list — the customer register. Same shape as the employee list
 * (debounced search, status filter, sortable, paginated, role-gated) so the
 * two screens stay consistent and share the reusable Table.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listClients, deleteClient } from '../clients.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { CLIENT_STATUSES, CLIENT_WRITE_ROLES, CLIENT_DELETE_ROLES } from '../../../lib/constants.js';
import { apiMessage } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

const STATUS_VARIANT = { Active: 'success', Inactive: 'default' };

export default function ClientListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canWrite = CLIENT_WRITE_ROLES.includes(user.role);
  const canDelete = CLIENT_DELETE_ROLES.includes(user.role);

  const [search, setSearch] = useState('');
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => (p.search === search ? p : { ...p, search, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending, isError } = useQuery({
    queryKey: ['clients', params],
    queryFn: () =>
      listClients({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
      }),
    placeholderData: keepPreviousData,
  });

  const [toDelete, setToDelete] = useState(null);
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteClient(id),
    onSuccess: () => {
      toast.success(`${toDelete.companyName} deleted.`);
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    // The 409 "has assigned workers" guard surfaces here as a clear toast.
    onError: (error) => {
      toast.error(apiMessage(error));
      setToDelete(null);
    },
  });

  function toggleSort(key) {
    setParams((p) => ({
      ...p,
      sortBy: key,
      sortOrder: p.sortBy === key && p.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  }

  const columns = [
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      render: (c) => (
        <Link to={`/clients/${c._id}`} className="font-medium text-text hover:text-primary">
          {c.companyName}
          {c.contactPerson && (
            <span className="block text-xs font-normal text-muted">{c.contactPerson}</span>
          )}
        </Link>
      ),
    },
    { key: 'industry', header: 'Industry', render: (c) => c.industry || '—' },
    { key: 'phone', header: 'Phone', hideOnMobile: true, render: (c) => c.phone || '—' },
    {
      key: 'sites',
      header: 'Sites',
      render: (c) => (c.sites?.length ? <Badge variant="primary">{c.sites.length}</Badge> : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <span className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/clients/${c._id}`)}>
            View
          </Button>
          {canWrite && (
            <Button size="sm" variant="ghost" onClick={() => navigate(`/clients/${c._id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToDelete(c)}>
              Delete
            </Button>
          )}
        </span>
      ),
    },
  ];

  const noFilters = !params.search && !params.status;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Clients"
        description="Companies we supply manpower and trade to."
        actions={canWrite && <Button onClick={() => navigate('/clients/new')}>Add client</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search clients"
        />
        <Select
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="sm:max-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <EmptyState
          title="Could not load clients"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(c) => c._id}
            loading={isPending}
            sortBy={params.sortBy}
            sortOrder={params.sortOrder}
            onSort={toggleSort}
            onRowClick={(c) => navigate(`/clients/${c._id}`)}
            emptyState={
              <EmptyState
                title={noFilters ? 'No clients yet' : 'No clients match'}
                description={
                  noFilters
                    ? 'Add your first client to start tracking companies and sites.'
                    : 'Try clearing the search or filters.'
                }
                action={
                  noFilters && canWrite ? (
                    <Button onClick={() => navigate('/clients/new')}>Add client</Button>
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

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete client?"
        message={`${toDelete?.companyName} will be permanently removed. Set status to "Inactive" instead if you just want to archive it.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
