/**
 * MobilisationSettingsPage — Admin-only. Two role checklists built from the
 * existing Approval Hierarchy's ApprovalRoles (no new role concept):
 *  - viewerRoles: full read-only access to every mobilisation once it
 *    leaves Draft (BDM's immediate "read on version" on submit; the whole
 *    MM/BDM/FM/COO/GM circle after approval — one mechanism for both).
 *  - selfMobiliseRoles: may create a mobilisation directly as its own
 *    primary coordinator, in addition to any Coordinator login.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMobilisationSettings, updateMobilisationSettings } from '../mobilisationSettings.api.js';
import { listApprovalRoles } from '../../approvals/approvals.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { PillChecklist } from '../../../components/ui/TogglePill.jsx';

export default function MobilisationSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isPending: settingsLoading } = useQuery({
    queryKey: ['mobilisation-settings'],
    queryFn: getMobilisationSettings,
  });
  const { data: roles, isPending: rolesLoading } = useQuery({
    queryKey: ['approval-roles'],
    queryFn: listApprovalRoles,
  });

  const [viewerRoles, setViewerRoles] = useState([]);
  const [selfMobiliseRoles, setSelfMobiliseRoles] = useState([]);

  useEffect(() => {
    if (!settings) return;
    setViewerRoles((settings.viewerRoles ?? []).map((r) => r._id));
    setSelfMobiliseRoles((settings.selfMobiliseRoles ?? []).map((r) => r._id));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateMobilisationSettings({ viewerRoles, selfMobiliseRoles }),
    onSuccess: () => {
      toast.success('Mobilisation settings saved.');
      queryClient.invalidateQueries({ queryKey: ['mobilisation-settings'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function toggle(setFn, list, id) {
    setFn(list.includes(id) ? list.filter((r) => r !== id) : [...list, id]);
  }

  const loading = settingsLoading || rolesLoading;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Mobilisation settings"
        description="Which approval roles can view every mobilisation, and which can create one directly."
        onBack={() => navigate(-1)}
      />

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (roles ?? []).length === 0 ? (
        <EmptyState
          title="No approval roles yet"
          description="Add a role (e.g. BDM, Marketing Manager) on the Approval Hierarchy page first."
        />
      ) : (
        <Card className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Full read-only visibility</h2>
            <p className="mt-1 mb-2 text-xs text-muted">
              These roles see every mobilisation once it's submitted (not while still a Draft), including all
              commercial fields — e.g. BDM, Marketing Manager, Financial Manager, COO, GM.
            </p>
            <PillChecklist
              items={roles}
              selected={viewerRoles}
              onToggle={(id) => toggle(setViewerRoles, viewerRoles, id)}
              emptyMessage="No approval roles configured yet — add one on the Approval Hierarchy page first."
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Can self-mobilise</h2>
            <p className="mt-1 mb-2 text-xs text-muted">
              Members of these roles can create a mobilisation directly as its primary coordinator — in addition to
              any Coordinator login.
            </p>
            <PillChecklist
              items={roles}
              selected={selfMobiliseRoles}
              onToggle={(id) => toggle(setSelfMobiliseRoles, selfMobiliseRoles, id)}
              emptyMessage="No approval roles configured yet — add one on the Approval Hierarchy page first."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
              Save
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
