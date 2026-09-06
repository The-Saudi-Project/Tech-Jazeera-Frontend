/**
 * BackButton — the shared rounded back-arrow icon button. Used inline next
 * to a page title (see PageHeader's `onBack`) and standalone on a "record
 * not found" EmptyState fallback that has no PageHeader of its own.
 */
export default function BackButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-surface to-border/50 text-text shadow-sm transition-all duration-200 hover:from-border/50 hover:to-border hover:shadow-md active:scale-95 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
