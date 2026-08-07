/**
 * DocumentUploadModal — upload a new document.
 *
 * Two modes:
 *  - fixedOwner given (on an employee/client profile): owner is locked, no picker.
 *  - fixedOwner omitted (global Documents page): the user picks owner type and
 *    then the specific employee/client.
 *
 * Text fields use react-hook-form + Zod; the File and (when applicable) the
 * owner are tracked separately and validated on submit, then everything is
 * assembled into FormData for the multipart POST.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '../documents.api.js';
import { documentFormSchema, emptyDocumentForm } from '../documents.schema.js';
import { listEmployees } from '../../employees/employees.api.js';
import { listClients } from '../../clients/clients.api.js';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_OWNER_TYPES,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_MB,
} from '../../../lib/constants.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function DocumentUploadModal({ open, onClose, fixedOwner, onUploaded }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  // Owner pickers (only used when there's no fixedOwner).
  const [ownerType, setOwnerType] = useState('Employee');
  const [ownerId, setOwnerId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(documentFormSchema), defaultValues: emptyDocumentForm });

  // Owner options for the global picker.
  const { data: ownerOptions } = useQuery({
    queryKey: ['ownerPicker', ownerType],
    queryFn: () =>
      ownerType === 'Employee'
        ? listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' })
        : listClients({ limit: 100, sortBy: 'companyName', sortOrder: 'asc' }),
    enabled: open && !fixedOwner,
  });

  const closeAndReset = () => {
    reset(emptyDocumentForm);
    setFile(null);
    setFileError(null);
    setOwnerId('');
    onClose();
  };

  const mutation = useMutation({
    mutationFn: (values) => {
      const owner = fixedOwner ?? { type: ownerType, id: ownerId };
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', values.title);
      fd.append('category', values.category);
      fd.append('ownerType', owner.type);
      fd.append('owner', owner.id);
      if (values.expiryDate) fd.append('expiryDate', values.expiryDate);
      return uploadDocument(fd);
    },
    onSuccess: () => {
      toast.success('Document uploaded.');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onUploaded?.();
      closeAndReset();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function onSubmit(values) {
    setFileError(null);
    if (!file) {
      setFileError('Choose a file to upload.');
      return;
    }
    if (file.size > DOCUMENT_MAX_MB * 1024 * 1024) {
      setFileError(`File is too large (maximum ${DOCUMENT_MAX_MB} MB).`);
      return;
    }
    if (!fixedOwner && !ownerId) {
      setFileError('Select who this document belongs to.');
      return;
    }
    mutation.mutate(values);
  }

  const items = ownerOptions?.items ?? [];

  return (
    <Modal open={open} onClose={closeAndReset} title="Upload document">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {fixedOwner ? (
          <p className="rounded-lg bg-bg p-2.5 text-sm text-muted">
            For <span className="font-medium text-text">{fixedOwner.name}</span>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Owner type"
              value={ownerType}
              onChange={(e) => {
                setOwnerType(e.target.value);
                setOwnerId('');
              }}
            >
              {DOCUMENT_OWNER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select label="Owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Select…</option>
              {items.map((o) => (
                <option key={o._id} value={o._id}>
                  {ownerType === 'Employee' ? `${o.fullName} (${o.employeeId})` : o.companyName}
                </option>
              ))}
            </Select>
          </div>
        )}

        <Input label="Title *" placeholder="e.g. Passport copy" error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" error={errors.category?.message} {...register('category')}>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input label="Expiry date" type="date" error={errors.expiryDate?.message} {...register('expiryDate')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">File *</label>
          <input
            type="file"
            accept={DOCUMENT_ACCEPT}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setFileError(null);
            }}
            className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover"
          />
          <p className="text-xs text-muted">PDF, images, Word or Excel · up to {DOCUMENT_MAX_MB} MB</p>
          {fileError && <p className="text-sm text-danger">{fileError}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={closeAndReset} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  );
}
