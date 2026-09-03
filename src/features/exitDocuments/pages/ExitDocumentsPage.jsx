/**
 * ExitDocumentsPage — staff review for Exit Re-Entry visa requests and
 * certificate requests (PRD Module 6). One page, two sections, same
 * grouping as FinancialRequestsPage.
 */
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ExitReentryReviewPanel from '../components/ExitReentryReviewPanel.jsx';
import CertificateReviewPanel from '../components/CertificateReviewPanel.jsx';

export default function ExitDocumentsPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Exit & documents"
        description="Exit re-entry visa requests and official certificate requests."
        onBack={() => navigate(-1)}
      />
      <ExitReentryReviewPanel />
      <CertificateReviewPanel />
    </div>
  );
}
