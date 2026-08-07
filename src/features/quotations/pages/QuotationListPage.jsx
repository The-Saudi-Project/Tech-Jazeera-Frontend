/**
 * Quotations list — every quotation with status filter and search (by number
 * or client name). Same shape as the other list screens.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listQuotations } from '../quotations.api.js';
import { buildQuotationColumns } from '../components/quotationColumns.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { QUOTATION_STATUSES, QUOTATION_WRITE_ROLES } from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function QuotationListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = QUOTATION_WRITE_ROLES.includes(user.role);

  const [search, setSearch] = useState('');
  const [params, setParams] = useState({ page: 1, limit: 20, search: '', status: '' });

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => (p.search === search ? p : { ...p, search, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending, isError } = useQuery({
    queryKey: ['quotations', params],
    queryFn: () =>
      listQuotations({
        page: params.page,
        limit: params.limit,
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
      }),
    placeholderData: keepPreviousData,
  });

  const columns = buildQuotationColumns({ showClient: true });
  const noFilters = !params.search && !params.status;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Quotations"
        description="Priced offers to clients."
        actions={canWrite && <Button onClick={() => navigate('/quotations/new')}>New quotation</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          placeholder="Search number or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search quotations"
        />
        <Select
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="sm:max-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {QUOTATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <EmptyState title="Could not load quotations" description="Please try again." />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(q) => q._id}
            loading={isPending}
            onRowClick={(q) => navigate(`/quotations/${q._id}`)}
            emptyState={
              <EmptyState
                title={noFilters ? 'No quotations yet' : 'No quotations match'}
                description={
                  noFilters ? 'Create your first quotation for a client.' : 'Try clearing the search or filters.'
                }
                action={noFilters && canWrite ? <Button onClick={() => navigate('/quotations/new')}>New quotation</Button> : null}
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
