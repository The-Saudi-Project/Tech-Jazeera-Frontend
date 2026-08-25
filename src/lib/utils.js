/**
 * Tiny shared utilities. Anything here must be used by 2+ features —
 * single-use helpers belong next to their caller.
 */

/** Join class names, skipping falsy values: cn('a', cond && 'b') → 'a b'. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

/**
 * Extract the server's human-readable message from a failed Axios call.
 * Our API always returns { success:false, message, details? } — validation
 * failures (validate.js) carry a generic top-level message ("Validation
 * failed.") plus per-field reasons in `details`. Prefer those: "Validation
 * failed." tells the user nothing about what to fix, while the field
 * messages (e.g. "Tier years and tier days must be set together.") do.
 * Falls back to the top-level message, then a generic string for
 * network-level failures where no response exists at all.
 */
export function apiMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data.details) && data.details.length > 0) {
    return [...new Set(data.details.map((d) => d.message))].join(' ');
  }
  return data.message ?? fallback;
}

/** Display format: "23 Jul 2026". Em-dash for missing values. */
export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Display format with time: "23 Jul 2026, 14:05". For logs where the exact
 *  moment matters, not just the day. Em-dash for missing values. */
export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO date → the "YYYY-MM-DD" format <input type="date"> requires. */
export function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

/** Whole days from now until a date; negative = already past. */
export function daysUntil(value) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

/** Format a number as SAR currency: 1234.5 → "SAR 1,234.50". */
export function formatMoney(value) {
  return `SAR ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact relative time: "just now", "5m ago", "3h ago", "2d ago", else a date. */
export function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}
