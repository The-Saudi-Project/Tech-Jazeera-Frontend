/**
 * Document Center — the global, searchable list of every document, with
 * filters (owner type, category, search, expiring) and upload (owner picked
 * in the modal). Per-owner document sections live on the profiles; this is
 * the company-wide view.
 */
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listDocuments } from '../documents.api.js';
import { buildDocumentColumns } from '../components/documentColumns.jsx';
import DocumentUploadModal from '../components/DocumentUploadModal.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { DOCUMENT_CATEGORIES, DOCUMENT_OWNER_TYPES, DOCUMENT_WRITE_ROLES } from '../../../lib/constants.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Table from '../../../components/ui/Table.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function DocumentListPage() {
  const { user } = useAuth();
  const canWrite = DOCUMENT_WRITE_ROLES.includes(user.role);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    search: '',
    ownerType: '',
    category: '',
    expiring: false,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => (p.search === search ? p : { ...p, search, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending, isError } = useQuery({
    queryKey: ['documents', params],
    queryFn: () =>
      listDocuments({
        page: params.page,
        limit: params.limit,
        ...(params.search && { search: params.search }),
        ...(params.ownerType && { ownerType: params.ownerType }),
        ...(params.category && { category: params.category }),
        ...(params.expiring && { expiring: 'true' }),
      }),
    placeholderData: keepPreviousData,
  });

  const columns = buildDocumentColumns({ showOwner: true });
  const noFilters = !params.search && !params.ownerType && !params.category && !params.expiring;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Documents"
        description="Every uploaded document across employees and clients."
        actions={canWrite && <Button onClick={() => setUploading(true)}>Upload document</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search documents"
        />
        <Select
          value={params.ownerType}
          onChange={(e) => setParams((p) => ({ ...p, ownerType: e.target.value, page: 1 }))}
          className="sm:max-w-[160px]"
          aria-label="Filter by owner type"
        >
          <option value="">All owners</option>
          {DOCUMENT_OWNER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          value={params.category}
          onChange={(e) => setParams((p) => ({ ...p, category: e.target.value, page: 1 }))}
          className="sm:max-w-[200px]"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Button
          variant={params.expiring ? 'primary' : 'secondary'}
          onClick={() => setParams((p) => ({ ...p, expiring: !p.expiring, page: 1 }))}
        >
          Expiring soon
        </Button>
      </div>

      {isError ? (
        <EmptyState title="Could not load documents" description="Please try again." />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(d) => d._id}
            loading={isPending}
            emptyState={
              <EmptyState
                title={noFilters ? 'No documents yet' : 'No documents match'}
                description={
                  noFilters
                    ? 'Upload a document, or add them from an employee or client profile.'
                    : 'Try clearing the search or filters.'
                }
                action={noFilters && canWrite ? <Button onClick={() => setUploading(true)}>Upload document</Button> : null}
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

      <DocumentUploadModal open={uploading} onClose={() => setUploading(false)} />
    </div>
  );
}
