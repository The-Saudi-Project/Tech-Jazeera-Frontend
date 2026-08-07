/**
 * Button — the one button component for the whole app. Variants cover every
 * button we'll need; no screen ever hand-styles a <button> again (that's how
 * UIs drift into inconsistency).
 */
import { cn } from '../../lib/utils.js';
import Spinner from './Spinner.jsx';

const variants = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-glow',
  secondary: 'bg-surface text-text border border-border shadow-xs hover:bg-bg hover:border-muted/40',
  ghost: 'text-muted hover:bg-border/40 hover:text-text',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
};

const sizes = {
  lg: 'h-11 px-5 text-sm',
  md: 'h-10 px-4 text-sm', // 40px tall — comfortably touch-friendly
  sm: 'h-8 px-3 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  type = 'button', // explicit: stray buttons inside forms must not submit
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-all duration-200 ease-out-expo active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
