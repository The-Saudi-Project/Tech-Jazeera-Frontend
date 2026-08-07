/**
 * Textarea — multi-line sibling of Input (labels/errors handled identically).
 */
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils.js';

const Textarea = forwardRef(function Textarea({ label, error, className, rows = 4, ...props }, ref) {
  const id = useId();

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text shadow-xs',
          'placeholder:text-muted/70 transition-colors',
          error
            ? 'border-danger'
            : 'border-border hover:border-muted/50 focus:border-primary'
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
});

export default Textarea;
