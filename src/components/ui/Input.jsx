/**
 * Input — label + field + error message as one unit, so no screen can ever
 * render a field without its label (accessibility) or forget to show its
 * validation error.
 *
 * forwardRef is required: react-hook-form's `register` works by attaching a
 * ref, so `<Input {...register('email')} />` must pass that ref through to
 * the real <input>.
 */
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils.js';

const Input = forwardRef(function Input(
  { label, error, type = 'text', className, autoComplete = 'off', ...props },
  ref
) {
  const id = useId(); // stable unique id so the label targets this input
  const errorId = `${id}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        type={type}
        // Off by default — Chrome keys autofill suggestions by `name` alone,
        // shared across the whole origin, so a generic field name like
        // "name" (every entity's name field) or "reason" surfaces unrelated
        // saved values from completely different forms. Fields that
        // genuinely want browser/password-manager autofill (login, change
        // password) pass their own explicit token (e.g. autoComplete="email")
        // which overrides this default.
        autoComplete={autoComplete}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text shadow-xs',
          'placeholder:text-muted/70 transition-colors',
          error
            ? 'border-danger'
            : 'border-border hover:border-muted/50 focus:border-primary'
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
