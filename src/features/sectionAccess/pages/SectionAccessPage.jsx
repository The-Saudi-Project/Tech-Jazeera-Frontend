/**
 * SectionAccessPage — Admin-only. The generic "who else can open this
 * section" control panel (see server/sectionAccess.model.js): each governed
 * section (Payroll, Expenses today — more can adopt the same mechanism
 * later without a new page) gets two independent grants — literal login
 * roles, and admin-named ApprovalRoles (e.g. a "Financial Manager" or "COO"
 * role) for a grant tied to a real person regardless of their login role.
 * Admin always has full access to every section; this page only controls
 * who ELSE gets in.
 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listSectionAccess, updateSectionAccess } from '../sectionAccess.api.js';
import { listApprovalRoles } from '../../approvals/approvals.api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { SECTION_ACCESS_GRANTABLE_ROLES } from '../../../lib/constants.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { PillChecklist } from '../../../components/ui/TogglePill.jsx';

function SectionCard({ section, approvalRoles, approvalRolesLoading }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [roles, setRoles] = useState(section.allowedRoles ?? []);
  const [approvalRoleIds, setApprovalRoleIds] = useState((section.allowedApprovalRoles ?? []).map((r) => r._id));

  useEffect(() => {
    setRoles(section.allowedRoles ?? []);
    setApprovalRoleIds((section.allowedApprovalRoles ?? []).map((r) => r._id));
  }, [section]);

  const saveMutation = useMutation({
    mutationFn: () => updateSectionAccess(section.sectionKey, { allowedRoles: roles, allowedApprovalRoles: approvalRoleIds }),
    onSuccess: () => {
      toast.success(`${section.label} access saved.`);
      queryClient.invalidateQueries({ queryKey: ['section-access'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function toggleRole(role) {
    setRoles((list) => (list.includes(role) ? list.filter((r) => r !== role) : [...list, role]));
  }
  function toggleApprovalRole(id) {
    setApprovalRoleIds((list) => (list.includes(id) ? list.filter((r) => r !== id) : [...list, id]));
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{section.label}</h2>
        <p className="mt-1 text-xs text-muted">{section.description}</p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium text-text">Login roles</h3>
        <PillChecklist
          items={SECTION_ACCESS_GRANTABLE_ROLES}
          selected={roles}
          onToggle={toggleRole}
          getId={(r) => r}
          getLabel={(r) => r}
        />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium text-text">Approval roles</h3>
        <p className="mb-2 text-xs text-muted">
          Any member of these gets in too, regardless of their login role — e.g. a "Financial Manager" or "COO" role
          you've named on the Approval Hierarchy page.
        </p>
        {approvalRolesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <PillChecklist
            items={approvalRoles ?? []}
            selected={approvalRoleIds}
            onToggle={toggleApprovalRole}
            emptyMessage="No approval roles configured yet — add one on the Approval Hierarchy page first."
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function SectionAccessPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: sections, isPending, isError, error, refetch } = useQuery({
    queryKey: ['section-access'],
    queryFn: listSectionAccess,
  });
  const { data: approvalRoles, isPending: approvalRolesLoading } = useQuery({
    queryKey: ['approval-roles'],
    queryFn: listApprovalRoles,
  });

  if (user.role !== 'Admin') return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Section Access"
        description="Admin always has full access everywhere. Choose who else can open a governed section — by login role, or by an approval role you've named (e.g. Financial Manager, COO)."
        onBack={() => navigate(-1)}
      />

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load section access settings"
          description={apiMessage(error) || 'Please try again.'}
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <SectionCard
              key={section.sectionKey}
              section={section}
              approvalRoles={approvalRoles}
              approvalRolesLoading={approvalRolesLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
