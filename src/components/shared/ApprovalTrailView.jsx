/**
 * ApprovalTrailView — read-only display of a workflow-governed request's
 * step-by-step progress and decision history. Renders nothing for a request
 * with no `workflow` — the legacy single-decision flow already shows
 * decidedBy/At/Note wherever it's used, nothing new to add there. Shared
 * across every request type's review screen.
 *
 * `pendingStatus` defaults to 'PendingReview' (Leave's own value) purely for
 * backward compatibility with existing callers that don't pass it — every
 * OTHER type's actual pending status is a different string (Timesheet:
 * 'Submitted'; SalaryAdvance/Reimbursement/ExitReentry/Certificate:
 * 'Pending'), so a caller that never passes this prop never shows the
 * "Step X of Y" in-progress badge, only the decided-so-far trail below it —
 * a real, still-open gap in those callers, not something this default
 * silently fixes for them.
 */
import Badge from '../ui/Badge.jsx';
import { formatDateTime } from '../../lib/utils.js';

export default function ApprovalTrailView({ request, pendingStatus = 'PendingReview' }) {
  if (!request.workflow) return null;

  const steps = request.steps ?? [];
  const trail = request.approvalTrail ?? [];
  const isPending = request.status === pendingStatus;
  const currentStep = steps[request.currentStep];

  return (
    <div className="mt-2 rounded-lg border border-border bg-bg/40 p-3 text-xs">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-muted">{request.workflowName}</p>
        {isPending && (
          <Badge variant="warning">
            Step {request.currentStep + 1} of {steps.length}
            {currentStep?.label ? `: ${currentStep.label}` : ''}
          </Badge>
        )}
      </div>
      {trail.length === 0 ? (
        <p className="text-muted">No steps decided yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {trail.map((entry, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="font-medium">{steps[entry.step]?.label || `Step ${entry.step + 1}`}</span>
              <span className="text-muted">·</span>
              <span>{entry.approvedBy?.name ?? 'Unknown'}</span>
              {entry.viaAdminOverride && <Badge>Admin override</Badge>}
              <Badge variant={entry.decision === 'Approved' ? 'success' : 'danger'}>{entry.decision}</Badge>
              <span className="text-muted">{formatDateTime(entry.decidedAt)}</span>
              {entry.note && <span className="italic text-muted">— {entry.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
