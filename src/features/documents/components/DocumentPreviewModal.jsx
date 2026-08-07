/**
 * DocumentPreviewModal — previews a document's current version inline.
 *
 * The file is fetched as an authenticated Blob (see documents.api) and shown
 * from an object URL: PDFs in an <iframe>, images in an <img>. Formats the
 * browser can't render inline (Word/Excel) show a download prompt instead.
 * The object URL is revoked when the modal closes to avoid leaking memory.
 */
import { useEffect, useState } from 'react';
import { fetchFileBlob, downloadDocumentFile } from '../documents.api.js';
import { currentVersion } from '../documents.schema.js';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import ExpiryBadge from '../../../components/shared/ExpiryBadge.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/** Bytes → "1.2 MB" / "340 KB". */
function fileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function DocumentPreviewModal({ doc, open, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const version = doc ? currentVersion(doc) : null;

  useEffect(() => {
    if (!open || !doc) return undefined;
    let objectUrl;
    let cancelled = false;
    setUrl(null);
    setError(null);
    fetchFileBlob(doc._id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => !cancelled && setError(apiMessage(e, 'Could not load the file.')));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, doc]);

  if (!open || !doc) return null;

  const isPdf = version.mimeType === 'application/pdf';
  const isImage = version.mimeType.startsWith('image/');

  return (
    <Modal open={open} onClose={onClose} title={doc.title} size="xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Preview — the star of the dialog */}
        <div className="grid h-[52vh] min-w-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg lg:h-[70vh] lg:flex-1">
          {error ? (
            <p className="p-6 text-sm text-danger">{error}</p>
          ) : !url ? (
            <Spinner className="h-6 w-6 text-primary" />
          ) : isPdf ? (
            <iframe title={doc.title} src={url} className="h-full w-full" />
          ) : isImage ? (
            <img src={url} alt={doc.title} className="max-h-full w-auto object-contain" />
          ) : (
            <p className="p-6 text-center text-sm text-muted">
              This file type can’t be previewed in the browser.
              <br />
              Download it to view.
            </p>
          )}
        </div>

        {/* Details + version history */}
        <div className="space-y-5 lg:w-80 lg:shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{doc.category}</Badge>
              <ExpiryBadge date={doc.expiryDate} />
            </div>
            <Button
              variant="primary"
              className="mt-3 w-full"
              onClick={() => downloadDocumentFile(doc._id, version.version, version.originalName)}
            >
              Download current version
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Versions ({doc.versions.length})
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {[...doc.versions].reverse().map((v) => (
                <div key={v.version} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      v{v.version} · {v.originalName}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(v.uploadedAt)} · {fileSize(v.size)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadDocumentFile(doc._id, v.version, v.originalName)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
