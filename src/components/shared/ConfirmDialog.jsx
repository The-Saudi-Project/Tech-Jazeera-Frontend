/**
 * ConfirmDialog — the mandatory gate in front of every destructive action.
 * Never wire a delete button straight to a mutation; route it through here.
 */
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onCancel} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
