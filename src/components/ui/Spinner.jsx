/**
 * Spinner — inline SVG loading indicator (no icon library; it's 12 lines).
 * Sized by the caller via className; inherits currentColor so it adapts to
 * any button/text color automatically.
 */
import { cn } from '../../lib/utils.js';

export default function Spinner({ className }) {
  return (
    <svg
      className={cn('animate-spin', className ?? 'h-5 w-5')}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
