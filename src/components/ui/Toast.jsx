/**
 * Toast system — global, ~80 lines, no library (a dependency would buy us
 * nothing but bundle size here).
 *
 * Usage anywhere below the provider:
 *   const toast = useToast();
 *   toast.success('Employee created');
 *   toast.error('Could not save');
 *
 * Renders bottom-right, stacks, auto-dismisses after 4.5s, manual × too.
 * aria-live="polite" so screen readers announce new toasts.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '../../lib/utils.js';

const ToastContext = createContext(null);

let nextId = 0;

const styles = {
  success: 'border-success/30 text-success',
  error: 'border-danger/30 text-danger',
  info: 'border-border text-text',
};

const icons = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++nextId;
      setToasts((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  // Stable object so consumers can safely list `toast` in effect deps.
  const toast = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface p-4 shadow-lg',
              styles[t.type]
            )}
          >
            <span className="font-bold">{icons[t.type]}</span>
            <p className="flex-1 text-sm text-text">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
