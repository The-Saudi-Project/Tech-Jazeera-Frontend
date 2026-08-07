/**
 * Card — the standard content surface. One place defines what "a panel"
 * looks like (background, border, radius, padding) for the entire app.
 */
import { cn } from '../../lib/utils.js';

export default function Card({ className, children }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-6 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
