/**
 * TapPointsSettings — Admin-only management of physical NFC tap points
 * (e.g. one per room). Each tap point's URL gets written to a real NFC chip
 * with any off-the-shelf NFC-writer phone app; a Worker's phone visiting
 * that URL toggles their check-in/check-out (see attendance.service.js's
 * selfTap() and client/.../ess/pages/TapPage.jsx).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTapPoints,
  createTapPoint,
  updateTapPoint,
  rotateTapPointToken,
  deleteTapPoint,
} from '../attendance.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Table from '../../../components/ui/Table.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';

function tapUrl(token) {
  return `${window.location.origin}/tap/${token}`;
}

export default function TapPointsSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(null); // { _id, name }
  const [confirm, setConfirm] = useState(null); // { id, kind: 'rotate'|'delete', title, message, confirmLabel }

  const { data: points, isPending } = useQuery({ queryKey: ['tap-points'], queryFn: listTapPoints });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { name: '' } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tap-points'] });

  const createMutation = useMutation({
    mutationFn: createTapPoint,
    onSuccess: () => {
      toast.success('Tap point created.');
      reset({ name: '' });
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => updateTapPoint(id, { name }),
    onSuccess: () => {
      toast.success('Renamed.');
      setRenaming(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => updateTapPoint(id, { active }),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, kind }) => (kind === 'rotate' ? rotateTapPointToken(id) : deleteTapPoint(id)),
    onSuccess: (_data, { kind }) => {
      toast.success(kind === 'rotate' ? 'Token rotated — rewrite the physical tag with the new URL.' : 'Tap point deleted.');
      setConfirm(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const copyUrl = async (token) => {
    try {
      await navigator.clipboard.writeText(tapUrl(token));
      toast.success('URL copied.');
    } catch {
      toast.error('Could not copy.');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.name}</span>
          {!r.active && <Badge variant="default">Disabled</Badge>}
        </div>
      ),
    },
    {
      key: 'url',
      header: 'Tap URL (write this to the chip)',
      render: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <code className="min-w-0 max-w-[16rem] truncate rounded-lg bg-bg px-2 py-1 text-xs">{tapUrl(r.token)}</code>
          <Button size="sm" variant="secondary" onClick={() => copyUrl(r.token)}>
            Copy
          </Button>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setRenaming({ _id: r._id, name: r.name })}>
            Rename
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toggleActiveMutation.mutate({ id: r._id, active: !r.active })}
          >
            {r.active ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setConfirm({
                id: r._id,
                kind: 'rotate',
                title: 'Rotate token?',
                message: `The current tag for "${r.name}" will stop working the moment you save — you'll need to rewrite the physical chip with the new URL.`,
                confirmLabel: 'Rotate',
              })
            }
          >
            Rotate
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              setConfirm({
                id: r._id,
                kind: 'delete',
                title: 'Delete tap point?',
                message: `"${r.name}" will stop working immediately. This doesn't affect any attendance already recorded.`,
                confirmLabel: 'Delete',
              })
            }
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Add a tap point</h2>
        <p className="mb-4 text-sm text-muted">
          Create one per physical location (e.g. a room entrance), then write its URL to an NFC tag with any
          NFC-writer app. A Worker's phone tapping the tag signs them in — or out, if they're already signed in —
          exactly like the Sign in/Sign out buttons in their My Attendance page.
        </p>
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input
              label="Name"
              placeholder="Room 1"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required.' })}
            />
          </div>
          <Button type="submit" isLoading={createMutation.isPending}>
            Add tap point
          </Button>
        </form>
      </Card>

      <Table
        columns={columns}
        rows={points ?? []}
        rowKey={(r) => r._id}
        loading={isPending}
        emptyState={<EmptyState title="No tap points yet" description="Add one above to generate its URL." />}
      />

      <Modal open={Boolean(renaming)} onClose={() => setRenaming(null)} title="Rename tap point">
        {renaming && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameMutation.mutate({ id: renaming._id, name: renaming.name });
            }}
            className="space-y-4"
          >
            <Input
              label="Name"
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={renameMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        loading={actionMutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => actionMutation.mutate({ id: confirm.id, kind: confirm.kind })}
      />
    </div>
  );
}
