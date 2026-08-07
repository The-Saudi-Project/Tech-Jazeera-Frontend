/**
 * Timesheet Processor — client constants & tiny time helpers. Mirrors the
 * server's status labels and 08:00 default; keep in sync with
 * server/src/modules/timesheetProcessor/timesheet.constants.js.
 */

/** Status → Badge variant, so the preview reads like the rest of the app. */
export const TIMESHEET_STATUS_META = {
  Present: { variant: 'success' },
  Overtime: { variant: 'warning' },
  Deficient: { variant: 'danger' },
  'Single Punch': { variant: 'primary' },
  'No Attendance': { variant: 'default' },
  Holiday: { variant: 'primary' },
  'Holiday (Worked)': { variant: 'warning' },
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Default required working time per day (matches the server default). */
export const DEFAULT_REQUIRED_HHMM = '08:00';

/** Both legacy .xls (device exports) and .xlsx are supported (see the server). */
export const TIMESHEET_ACCEPT = '.xls,.xlsx';

/** Minutes → "HH:MM" for display. */
export function minutesToHHMM(minutes) {
  const m = Math.max(0, Math.round(minutes ?? 0));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "HH:MM" → minutes, or null if malformed (for the required-hours override). */
export function hhmmToMinutes(text) {
  const m = typeof text === 'string' && text.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
