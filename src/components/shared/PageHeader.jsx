/**
 * PageHeader — consistent top-of-page block: title, optional description,
 * optional action buttons. Stacks on mobile, inline on larger screens.
 *
 * `onBack`, when given, renders a plain back-arrow icon button immediately
 * to the left of the title — the "return to where I came from" affordance
 * belongs next to the page's name, not lost among unrelated action buttons
 * on the right (Edit/Delete/etc., passed via `actions`).
 */
import Button from '../ui/Button.jsx';

export default function PageHeader({ title, description, onBack, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-surface to-border/50 text-text shadow-sm transition-all duration-200 hover:from-border/50 hover:to-border hover:shadow-md active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
