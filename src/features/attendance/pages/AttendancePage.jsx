/**
 * Attendance page — three tabs: Mark (daily marking, writers only), Records
 * (week/month grid), and Summary (counts + export). Non-writers (e.g.
 * Accounts) see only the read tabs.
 */
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ATTENDANCE_WRITE_ROLES } from '../../../lib/constants.js';
import { cn } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import MarkTab from '../components/MarkTab.jsx';
import RecordsGrid from '../components/RecordsGrid.jsx';
import SummaryTab from '../components/SummaryTab.jsx';
import OfficeLocationSettings from '../components/OfficeLocationSettings.jsx';

export default function AttendancePage() {
  const { user } = useAuth();
  const canWrite = ATTENDANCE_WRITE_ROLES.includes(user.role);
  const isAdmin = user.role === 'Admin';

  const tabs = [
    ...(canWrite ? [{ key: 'mark', label: 'Mark' }] : []),
    { key: 'records', label: 'Records' },
    { key: 'summary', label: 'Summary' },
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

      {tab === 'mark' && <MarkTab />}
      {tab === 'records' && <RecordsGrid />}
      {tab === 'summary' && <SummaryTab />}
      {tab === 'office' && <OfficeLocationSettings />}
    </div>
  );
}
