/**
 * ExitDocumentsPage — staff review for Exit Re-Entry visa requests and
 * certificate requests (PRD Module 6). Two tabs, one page — see
 * docs/TABS-notes.md for why tabs replaced the original vertical stack.
 */
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Tabs, { useTabParam } from '../../../components/ui/Tabs.jsx';
import ExitReentryReviewPanel from '../components/ExitReentryReviewPanel.jsx';
import CertificateReviewPanel from '../components/CertificateReviewPanel.jsx';

export default function ExitDocumentsPage() {
  const navigate = useNavigate();

  const tabs = [
    { key: 'exit-reentry', label: 'Exit Re-Entry', content: <ExitReentryReviewPanel /> },
    { key: 'certificates', label: 'Certificates', content: <CertificateReviewPanel /> },
  ];
  const [activeTab, setActiveTab] = useTabParam(tabs, 'exit-reentry');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Exit & documents"
        description="Exit re-entry visa requests and official certificate requests."
        onBack={() => navigate(-1)}
      />
      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
    </div>
  );
}
