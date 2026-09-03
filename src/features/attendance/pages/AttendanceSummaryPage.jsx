/**
 * Attendance Summary page — per-worker status counts + Excel/PDF export.
 * Reached from the dashboard's "Marked today" stat, not from the Attendance
 * tab bar — it's a monthly/reporting view, not a daily-operations one.
 */
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import SummaryTab from '../components/SummaryTab.jsx';

export default function AttendanceSummaryPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Attendance Summary"
        description="Per-worker status counts over a date range, with Excel/PDF export."
        // Fixed destination, not browser history — this page is only ever
        // reached from the Dashboard's "Marked today" stat (see the file
        // comment), so "back" here means the related Attendance page, not
        // wherever the visitor actually came from.
        onBack={() => navigate('/attendance')}
      />
      <SummaryTab />
    </div>
  );
}
