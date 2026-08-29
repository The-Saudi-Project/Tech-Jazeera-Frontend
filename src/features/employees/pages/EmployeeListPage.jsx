/**
 * Employee list — the workforce register. Search (debounced), status filter,
 * "expiring documents" filter, sortable columns, pagination, role-gated
 * actions. This page is the reference implementation of a list screen;
 * clients (M5) and the rest copy its shape.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEmployees, deleteEmployee } from '../employees.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_TYPES,
  EMPLOYEE_WRITE_ROLES,
  EMPLOYEE_DELETE_ROLES,
  EMPLOYEE_CREATE_ROLES,
  EXPIRY_WARNING_DAYS,
} from '../../../lib/constants.js';
import { apiMessage, daysUntil, formatDate } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Table from '../../../components/ui/Table.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

const STATUS_VARIANT = { Active: 'success', 'On Leave': 'warning', Exited: 'default' };

/** Worst document state across the five docs → one glanceable badge. */
function docsBadge(employee) {
  const expiries = [
    employee.passport?.expiry,
    employee.visa?.expiry,
    employee.iqama?.expiry,
    employee.medical?.expiry,
    employee.drivingLicense?.expiry,
  ].filter(Boolean);
  if (expiries.length === 0) return <Badge>No docs</Badge>;
  const worst = Math.min(...expiries.map(daysUntil));
  if (worst < 0) return <Badge variant="danger">Expired</Badge>;
  if (worst <= EXPIRY_WARNING_DAYS) return <Badge variant="warning">{worst}d left</Badge>;
  return <Badge variant="success">OK</Badge>;
}

export default function EmployeeListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canWrite = EMPLOYEE_WRITE_ROLES.includes(user.role);
  const canDelete = EMPLOYEE_DELETE_ROLES.includes(user.role);
  const canCreate = EMPLOYEE_CREATE_ROLES.includes(user.role);

  // `search` is what the user types; `params.search` is what we query with —
  // debounced 300ms so we don't fire a request per keystroke.
  const [search, setSearch] = useState('');
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    type: '',
    alerts: false,
    team: false, // P2-M2: Manager-only "my coordinators' employees" filter
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
    queryKey: ['employees', params],
    queryFn: () =>
      listEmployees({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
        ...(params.type && { type: params.type }),
        ...(params.alerts && { alerts: 'true' }),
        ...(params.team && { team: 'mine' }),
      }),
    placeholderData: keepPreviousData, // old page stays visible while the next loads
  });

  const [toDelete, setToDelete] = useState(null);
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteEmployee(id),
    onSuccess: () => {
      toast.success(`${toDelete.fullName} deleted.`);
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
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
      key: 'fullName',
      header: 'Employee',
      sortable: true,
      render: (e) => (
        <Link to={`/employees/${e._id}`} className="font-medium text-text hover:text-primary">
          {e.fullName}
          <span className="block text-xs font-normal text-muted">
            {e.employeeId} · {e.nationality}
          </span>
        </Link>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (e) => (
        <span>
          {e.designation}
          {e.department && <span className="block text-xs text-muted">{e.department}</span>}
        </span>
      ),
    },
    { key: 'mobile', header: 'Mobile', hideOnMobile: true, render: (e) => e.mobile },
    { key: 'type', header: 'Type', hideOnMobile: true, render: (e) => <Badge>{e.type}</Badge> },
    {
      key: 'joiningDate',
      header: 'Joined',
      sortable: true,
      render: (e) => formatDate(e.joiningDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>,
    },
    { key: 'docs', header: 'Documents', render: docsBadge },
    {
      key: 'createdBy',
      header: 'Added by',
      hideOnMobile: true,
      render: (e) =>
        e.createdBy ? (
          <span>
            {e.createdBy.name}
            {e.createdBy.role === 'Coordinator' && (
              <Badge variant="primary" className="ml-1.5">
                Coordinator
              </Badge>
            )}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (e) => (
        <span className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/employees/${e._id}`)}>
            View
          </Button>
          {canWrite && (
            <Button size="sm" variant="ghost" onClick={() => navigate(`/employees/${e._id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToDelete(e)}>
              Delete
            </Button>
          )}
        </span>
      ),
    },
  ];

  const noFilters = !params.search && !params.status && !params.type && !params.alerts && !params.team;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Employees"
        description="The company's workforce register."
        actions={canCreate && <Button onClick={() => navigate('/employees/new')}>Add employee</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          placeholder="Search name, ID, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search employees"
        />
        <Select
          value={params.status}
          onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          className="sm:max-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={params.type}
          onChange={(e) => setParams((p) => ({ ...p, type: e.target.value, page: 1 }))}
          className="sm:max-w-[180px]"
          aria-label="Filter by type"
        >
          <option value="">Own &amp; Client</option>
          {EMPLOYEE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Button
          variant={params.alerts ? 'primary' : 'secondary'}
          onClick={() => setParams((p) => ({ ...p, alerts: !p.alerts, page: 1 }))}
        >
          Expiring documents
        </Button>
        {user.role === 'Manager' && (
          <Button
            variant={params.team ? 'primary' : 'secondary'}
            onClick={() => setParams((p) => ({ ...p, team: !p.team, page: 1 }))}
          >
            My team
          </Button>
        )}
      </div>

      {isError ? (
        <EmptyState
          title="Could not load employees"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(e) => e._id}
            loading={isPending}
            sortBy={params.sortBy}
            sortOrder={params.sortOrder}
            onSort={toggleSort}
            onRowClick={(e) => navigate(`/employees/${e._id}`)}
            emptyState={
              <EmptyState
                title={noFilters ? 'No employees yet' : 'No employees match'}
                description={
                  noFilters
                    ? 'Add your first employee to start building the register.'
                    : 'Try clearing the search or filters.'
                }
                action={
                  noFilters && canCreate ? (
                    <Button onClick={() => navigate('/employees/new')}>Add employee</Button>
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
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={data.page <= 1}
                  onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <span className="tabular-nums">
                  {data.page} / {data.pages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={data.page >= data.pages}
                  onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </span>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete employee?"
        message={`${toDelete?.fullName} (${toDelete?.employeeId}) will be permanently removed. For staff who left the company, set status to "Exited" instead.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
