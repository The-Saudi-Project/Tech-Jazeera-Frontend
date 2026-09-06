/**
 * Card — the standard content surface. One place defines what "a panel"
 * looks like (background, border, radius, padding) for the entire app.
 */
import { cn } from '../../lib/utils.js';

export default function Card({ className, children }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-surface/80 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md',
        className
      )}
    >
      {children}
    </div>
  );
}
