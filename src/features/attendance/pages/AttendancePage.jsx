/**
 * Attendance page — tabs: Records (week/month grid, everyone's Present/
 * Absent/Leave/Sick/Off — click-to-correct for writers, plus the "mark all
 * present" bulk action folded in from the old Mark tab), Sign In/Out (one
 * merged sign-in/sign-out log + self-punch card), and Office Location
 * (Admin-only geofence config). Summary lives at /attendance/summary,
 * reachable from the dashboard, not in this tab bar.
 */
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { cn } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import RecordsGrid from '../components/RecordsGrid.jsx';
import SignInOutTab from '../components/SignInOutTab.jsx';
import OfficeLocationSettings from '../components/OfficeLocationSettings.jsx';

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'Admin';

  const tabs = [
    { key: 'records', label: 'Records' },
    { key: 'signinout', label: 'Sign In/Out' },
    // P2-M3: Worker self-mark geofence config — Admin-only, it's a security setting.
    ...(isAdmin ? [{ key: 'office', label: 'Office Location' }] : []),
  ];
  const [tab, setTab] = useState(tabs[0].key);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Attendance" description="Mark daily attendance and review sign-in/sign-out." />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'records' && <RecordsGrid />}
      {tab === 'signinout' && <SignInOutTab />}
      {tab === 'office' && <OfficeLocationSettings />}
    </div>
  );
}
