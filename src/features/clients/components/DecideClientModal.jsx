/**
 * DecideClientModal — approve or reject a Coordinator's pending client
 * submission. Approve is one click (no note needed); Reject needs a short
 * note first, so the Coordinator knows exactly what to fix before
 * resubmitting (see client.service.js decideClient / updateClient).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { decideClient } from '../clients.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';

export default function DecideClientModal({ client, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => decideClient(client._id, payload),
    onSuccess: (_, payload) => {
      toast.success(payload.status === 'Approved' ? `${client.companyName} approved.` : `${client.companyName} rejected.`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function handleClose() {
    setRejecting(false);
    setNote('');
    onClose();
  }

  return (
    <Modal open={Boolean(client)} onClose={mutation.isPending ? () => {} : handleClose} title="Review client submission">
      {client && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg p-3">
            <p className="font-medium">{client.companyName}</p>
            <p className="text-xs text-muted">
              Submitted by {client.createdBy?.name ?? 'a Coordinator'}
              {client.industry && ` · ${client.industry}`}
            </p>
            {(client.contactPerson || client.phone || client.email) && (
              <p className="mt-1 text-xs text-muted">
                {[client.contactPerson, client.phone, client.email].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {rejecting ? (
            <>
              <Textarea
                label="What needs fixing? *"
                placeholder="e.g. Missing VAT number, please confirm the CR number."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setRejecting(false)} disabled={mutation.isPending}>
                  Back
                </Button>
                <Button
                  variant="danger"
                  disabled={!note.trim()}
                  isLoading={mutation.isPending}
                  onClick={() => mutation.mutate({ status: 'Rejected', decisionNote: note.trim() })}
                >
                  Confirm rejection
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setRejecting(true)} disabled={mutation.isPending}>
                Reject
              </Button>
              <Button
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate({ status: 'Approved' })}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
