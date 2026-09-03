/**
 * FinancialRequestsPage — staff review for both salary advances and
 * reimbursement claims (PRD Module 4). One page, two sections, same
 * structure as LeavePage combining policy config and the review queue.
 */
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import AdvanceReviewPanel from '../components/AdvanceReviewPanel.jsx';
import ReimbursementReviewPanel from '../components/ReimbursementReviewPanel.jsx';

export default function FinancialRequestsPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Financial requests"
        description="Salary advances and expense reimbursement claims."
        onBack={() => navigate(-1)}
      />
      <AdvanceReviewPanel />
      <ReimbursementReviewPanel />
    </div>
  );
}
