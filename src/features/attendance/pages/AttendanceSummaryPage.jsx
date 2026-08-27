/**
 * Attendance Summary page — per-worker status counts + Excel/PDF export.
 * Reached from the dashboard's "Marked today" stat, not from the Attendance
 * tab bar — it's a monthly/reporting view, not a daily-operations one.
 */
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Button from '../../../components/ui/Button.jsx';
import SummaryTab from '../components/SummaryTab.jsx';

export default function AttendanceSummaryPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Attendance Summary"
        description="Per-worker status counts over a date range, with Excel/PDF export."
        actions={
          <Link to="/attendance">
            <Button variant="secondary">Back to Attendance</Button>
          </Link>
        }
      />
      <SummaryTab />
    </div>
  );
}
