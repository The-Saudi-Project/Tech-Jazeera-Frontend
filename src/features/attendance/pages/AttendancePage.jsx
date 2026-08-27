/**
 * Attendance page — tabs: My Attendance (Coordinator/HR/Accounts' own
 * sign-in/out — Admin/Manager are exempt, Workers use the ESS portal
 * instead), Mark (daily marking, writers only), Records (week/month grid),
 * Summary (counts + export), Sign In/Out (flat time log of Employee/Worker
 * attendance), Staff Attendance (oversight of everyone's self-marked
 * Coordinator/HR/Accounts sign-ins — Admin/Manager/HR only), and Office
 * Location (Admin-only). Non-writers (e.g. Accounts) see only the read tabs.
 */
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ATTENDANCE_WRITE_ROLES, STAFF_SELF_ATTENDANCE_ROLES } from '../../../lib/constants.js';
import { cn } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import MyAttendanceTab from '../components/MyAttendanceTab.jsx';
import MarkTab from '../components/MarkTab.jsx';
import RecordsGrid from '../components/RecordsGrid.jsx';
import SummaryTab from '../components/SummaryTab.jsx';
import TimeLogTab from '../components/TimeLogTab.jsx';
import StaffAttendanceTab from '../components/StaffAttendanceTab.jsx';
import OfficeLocationSettings from '../components/OfficeLocationSettings.jsx';

export default function AttendancePage() {
  const { user } = useAuth();
  const canWrite = ATTENDANCE_WRITE_ROLES.includes(user.role);
  const isAdmin = user.role === 'Admin';
  const selfAttendance = STAFF_SELF_ATTENDANCE_ROLES.includes(user.role);

  const tabs = [
    ...(selfAttendance ? [{ key: 'mine', label: 'My Attendance' }] : []),
    ...(canWrite ? [{ key: 'mark', label: 'Mark' }] : []),
    { key: 'records', label: 'Records' },
    { key: 'summary', label: 'Summary' },
    { key: 'timelog', label: 'Sign In/Out' },
    // Oversight of Coordinator/HR/Accounts self-attendance — same circle
    // that already sees the Employee-based tabs above.
    ...(canWrite ? [{ key: 'staffAttendance', label: 'Staff Attendance' }] : []),
    // P2-M3: Worker self-mark geofence config — Admin-only, it's a security setting.
    ...(isAdmin ? [{ key: 'office', label: 'Office Location' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0].key);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Attendance" description="Mark daily attendance, review the grid, and export summaries." />

      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mine' && <MyAttendanceTab />}
      {tab === 'mark' && <MarkTab />}
      {tab === 'records' && <RecordsGrid />}
      {tab === 'summary' && <SummaryTab />}
      {tab === 'timelog' && <TimeLogTab />}
      {tab === 'staffAttendance' && <StaffAttendanceTab />}
      {tab === 'office' && <OfficeLocationSettings />}
    </div>
  );
}
