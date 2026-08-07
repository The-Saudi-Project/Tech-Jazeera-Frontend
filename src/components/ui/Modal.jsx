/**
 * Modal — overlay dialog rendered in a portal (so ancestor overflow/z-index
 * can never clip it). Closes on backdrop click and Escape.
 *
 * Layout: a flex column capped at 90vh — the header (title + close) stays
 * pinned while the body scrolls. This is why a tall dialog (a document preview
 * with a long version list) never pushes its content off-screen.
 *
 * `size` picks the max width; default 'md' preserves every existing caller.
 * The backdrop is the app's one intentional use of glass: a frosted scrim that
 * pushes the page back without hiding it.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils.js';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

export default function Modal({ open, onClose, title, size = 'md', children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Lock background scroll while the dialog is up.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative my-auto flex max-h-[90vh] w-full flex-col overflow-hidden',
          'rounded-2xl border border-border bg-surface shadow-xl animate-dialog-in',
          sizeClasses[size] || sizeClasses.md
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-border/50 hover:text-text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
