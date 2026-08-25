/**
 * WorkerLoginPanel (P2-M1) — the admin-only "Account" card on an employee
 * profile. It shows whether the employee has a login and lets Admin/HR create
 * one. On creation the server returns a one-time temporary password, which we
 * surface in a modal for the admin to copy and hand over — it is never shown
 * again (only its hash is stored).
 *
 * Rendered only for ACCOUNT_PROVISION_ROLES by the parent, so this component
 * assumes the viewer may provision.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployeeLogin, resetEmployeeLoginPassword } from '../employees.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';

export default function WorkerLoginPanel({ employee }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  // Holds the just-created credentials for the one-time reveal modal.
  const [created, setCreated] = useState(null);

  const mutation = useMutation({
    mutationFn: () => createEmployeeLogin(employee._id),
    onSuccess: (data) => {
      setCreated(data);
      // Flip the card to "has login" — getEmployee now returns a login summary.
      queryClient.invalidateQueries({ queryKey: ['employee', employee._id] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  // Same reveal modal, reused: the reset response is just { tempPassword },
  // so `user.email` is filled in from the login already known to this card.
  const resetMutation = useMutation({
    mutationFn: () => resetEmployeeLoginPassword(employee._id),
    onSuccess: (data) => setCreated({ user: { email: employee.login.email }, ...data, reset: true }),
    onError: (error) => toast.error(apiMessage(error)),
  });

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      toast.success('Temporary password copied.');
    } catch {
      toast.error('Could not copy — select and copy it manually.');
    }
  }

  const login = employee.login;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Account</h2>
        {login ? (
          <Badge variant={login.isActive ? 'success' : 'default'}>
            {login.isActive ? 'Login active' : 'Login disabled'}
          </Badge>
        ) : (
          <Badge variant="default">No login</Badge>
        )}
      </div>

      {login ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted">Sign-in email: </span>
              <span className="font-medium">{login.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">Role:</span>
              <Badge variant="primary">{login.role}</Badge>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => resetMutation.mutate()} isLoading={resetMutation.isPending}>
            Reset password
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            This employee has no login. Create one so they can sign in with their
            own credentials.
          </p>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Create worker login
          </Button>
        </div>
      )}

      {/* One-time credential reveal. `created` is cleared on close. */}
      <Modal open={!!created} onClose={() => setCreated(null)} title={created?.reset ? 'Password reset' : 'Worker login created'}>
        {created && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {created.reset ? (
                <>
                  Their old password no longer works. Hand this new one to{' '}
                  <span className="font-medium text-text">{employee.fullName}</span> — it's shown{' '}
                  <span className="font-medium text-text">once</span>, copy it now.
                </>
              ) : (
                <>
                  Hand these to <span className="font-medium text-text">{employee.fullName}</span>.
                  The temporary password is shown <span className="font-medium text-text">once</span> —
                  copy it now.
                </>
              )}
            </p>
            <div className="rounded-lg border border-border bg-bg p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Email</p>
              <p className="mt-0.5 font-medium">{created.user.email}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Temporary password</p>
              <p className="mt-0.5 select-all break-all font-mono text-base font-semibold">
                {created.tempPassword}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={copyPassword}>
                Copy password
              </Button>
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
