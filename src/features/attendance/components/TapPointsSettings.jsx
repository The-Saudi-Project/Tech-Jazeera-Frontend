/**
 * TapPointsSettings — Admin-only management of physical NFC tap points
 * (e.g. one per room entrance, one per exit). Each tap point's URL gets
 * written to a real NFC chip with any off-the-shelf NFC-writer app; a
 * Worker's phone visiting that URL attempts a check-in or check-out
 * depending on the tap point's fixed direction (see attendance.service.js's
 * selfTap() and client/.../ess/pages/TapPage.jsx) — direction is set here,
 * not inferred from the worker's current state.
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
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Table from '../../../components/ui/Table.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';

function tapUrl(token) {
  return `${window.location.origin}/tap/${token}`;
}

const DIRECTION_LABEL = { in: 'Sign in', out: 'Sign out' };

export default function TapPointsSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // { _id, name, direction }
  const [confirm, setConfirm] = useState(null); // { id, kind: 'rotate'|'delete', title, message, confirmLabel }

  const { data: points, isPending } = useQuery({ queryKey: ['tap-points'], queryFn: listTapPoints });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { name: '', direction: 'in' } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tap-points'] });

  const createMutation = useMutation({
    mutationFn: createTapPoint,
    onSuccess: () => {
      toast.success('Tap point created.');
      reset({ name: '', direction: 'in' });
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, name, direction }) => updateTapPoint(id, { name, direction }),
    onSuccess: () => {
      toast.success('Saved.');
      setEditing(null);
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
      key: 'direction',
      header: 'Direction',
      render: (r) => (
        <Badge variant={r.direction === 'in' ? 'success' : 'warning'}>{DIRECTION_LABEL[r.direction]}</Badge>
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
          <Button size="sm" variant="secondary" onClick={() => setEditing({ _id: r._id, name: r.name, direction: r.direction })}>
            Edit
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
          Create one per physical tag — typically one for entry and one for exit at each location — then write its
          URL to an NFC tag with any NFC-writer app. A tag's direction is fixed: a "Sign in" tag always attempts to
          sign the Worker in, a "Sign out" tag always attempts to sign them out, whichever tag they actually tap. If
          they tap the wrong one for their current state, they'll see the same message the button in their My
          Attendance page would show.
        </p>
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input
              label="Name"
              placeholder="Discussion Room In"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required.' })}
            />
          </div>
          <div className="sm:w-40">
            <Select label="Direction" {...register('direction')}>
              <option value="in">Sign in</option>
              <option value="out">Sign out</option>
            </Select>
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

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit tap point">
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate({ id: editing._id, name: editing.name, direction: editing.direction });
            }}
            className="space-y-4"
          >
            <Input
              label="Name"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              autoFocus
            />
            <Select
              label="Direction"
              value={editing.direction}
              onChange={(e) => setEditing({ ...editing, direction: e.target.value })}
            >
              <option value="in">Sign in</option>
              <option value="out">Sign out</option>
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={editMutation.isPending}>
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
