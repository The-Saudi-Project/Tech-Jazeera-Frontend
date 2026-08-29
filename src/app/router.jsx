/**
 * Route table + auth guard. Two worlds:
 *   - AuthLayout wraps guest screens (/login)
 *   - RequireAuth → DashboardLayout wraps everything signed-in
 *
 * RequireAuth is the guard: while the silent session-restore runs it shows a
 * full-screen spinner (NOT a redirect — bouncing a logged-in user to /login
 * for a half second on every reload is the classic mistake), then either
 * renders the app or redirects to /login.
 */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import EssLayout from './layouts/EssLayout.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import EmployeeListPage from '../features/employees/pages/EmployeeListPage.jsx';
import EmployeeNewPage from '../features/employees/pages/EmployeeNewPage.jsx';
import EmployeeProfilePage from '../features/employees/pages/EmployeeProfilePage.jsx';
import EmployeeEditPage from '../features/employees/pages/EmployeeEditPage.jsx';
import ClientListPage from '../features/clients/pages/ClientListPage.jsx';
import ClientNewPage from '../features/clients/pages/ClientNewPage.jsx';
import ClientProfilePage from '../features/clients/pages/ClientProfilePage.jsx';
import ClientEditPage from '../features/clients/pages/ClientEditPage.jsx';
import DeploymentListPage from '../features/deployments/pages/DeploymentListPage.jsx';
import DeploymentNewPage from '../features/deployments/pages/DeploymentNewPage.jsx';
import AttendancePage from '../features/attendance/pages/AttendancePage.jsx';
import AttendanceSummaryPage from '../features/attendance/pages/AttendanceSummaryPage.jsx';
import DocumentListPage from '../features/documents/pages/DocumentListPage.jsx';
import QuotationListPage from '../features/quotations/pages/QuotationListPage.jsx';
import QuotationNewPage from '../features/quotations/pages/QuotationNewPage.jsx';
import QuotationViewPage from '../features/quotations/pages/QuotationViewPage.jsx';
import QuotationEditPage from '../features/quotations/pages/QuotationEditPage.jsx';
import TimesheetProcessorPage from '../features/timesheetProcessor/pages/TimesheetProcessorPage.jsx';
import NfcCompanyListPage from '../features/nfc/pages/NfcCompanyListPage.jsx';
import NfcCompanyProfilePage from '../features/nfc/pages/NfcCompanyProfilePage.jsx';
import NfcCardListPage from '../features/nfc/pages/NfcCardListPage.jsx';
import NfcCardDetailPage from '../features/nfc/pages/NfcCardDetailPage.jsx';
import NfcAnalyticsPage from '../features/nfc/pages/NfcAnalyticsPage.jsx';
import UserListPage from '../features/users/pages/UserListPage.jsx';
import CoordinatorActivityPage from '../features/coordinatorActivity/pages/CoordinatorActivityPage.jsx';
import LeavePage from '../features/leave/pages/LeavePage.jsx';
import HolidayListPage from '../features/holidays/pages/HolidayListPage.jsx';
import SettlementListPage from '../features/eosb/pages/SettlementListPage.jsx';
import SettlementNewPage from '../features/eosb/pages/SettlementNewPage.jsx';
import SettlementViewPage from '../features/eosb/pages/SettlementViewPage.jsx';
import FinancialRequestsPage from '../features/financialRequests/pages/FinancialRequestsPage.jsx';
import AssetListPage from '../features/assets/pages/AssetListPage.jsx';
import ExitDocumentsPage from '../features/exitDocuments/pages/ExitDocumentsPage.jsx';
import TimesheetsPage from '../features/timesheets/pages/TimesheetsPage.jsx';
import AuditLogPage from '../features/audit/pages/AuditLogPage.jsx';
import MyProfilePage from '../features/ess/pages/MyProfilePage.jsx';
import MyDocumentsPage from '../features/ess/pages/MyDocumentsPage.jsx';
import MyLeavePage from '../features/ess/pages/MyLeavePage.jsx';
import MyRequestsPage from '../features/ess/pages/MyRequestsPage.jsx';
import MyExitDocumentsPage from '../features/ess/pages/MyExitDocumentsPage.jsx';
import MyAttendancePage from '../features/ess/pages/MyAttendancePage.jsx';
import Spinner from '../components/ui/Spinner.jsx';

function RequireAuth() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }
  if (status === 'guest') return <Navigate to="/login" replace />;
  return <Outlet />;
}

/**
 * P2-M2: a Worker's whole world is the ESS portal; every other role keeps
 * the full admin shell. Split here (not per-route guards) so a Worker never
 * even mounts the 20-item admin sidebar before being redirected.
 */
function RoleRouter() {
  const { user } = useAuth();
  return user.role === 'Worker' ? <Navigate to="/me" replace /> : <Outlet />;
}

function WorkerRouter() {
  const { user } = useAuth();
  return user.role === 'Worker' ? <Outlet /> : <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RoleRouter />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/employees', element: <EmployeeListPage /> },
              { path: '/employees/new', element: <EmployeeNewPage /> },
              { path: '/employees/:id', element: <EmployeeProfilePage /> },
              { path: '/employees/:id/edit', element: <EmployeeEditPage /> },
              { path: '/clients', element: <ClientListPage /> },
              { path: '/clients/new', element: <ClientNewPage /> },
              { path: '/clients/:id', element: <ClientProfilePage /> },
              { path: '/clients/:id/edit', element: <ClientEditPage /> },
              { path: '/deployments', element: <DeploymentListPage /> },
              { path: '/deployments/new', element: <DeploymentNewPage /> },
              { path: '/attendance', element: <AttendancePage /> },
              { path: '/attendance/summary', element: <AttendanceSummaryPage /> },
              { path: '/documents', element: <DocumentListPage /> },
              { path: '/quotations', element: <QuotationListPage /> },
              { path: '/quotations/new', element: <QuotationNewPage /> },
              { path: '/quotations/:id', element: <QuotationViewPage /> },
              { path: '/quotations/:id/edit', element: <QuotationEditPage /> },
              { path: '/timesheet-processor', element: <TimesheetProcessorPage /> },
              { path: '/team', element: <UserListPage /> },
              { path: '/coordinator-activity', element: <CoordinatorActivityPage /> },
              { path: '/leave', element: <LeavePage /> },
              { path: '/holidays', element: <HolidayListPage /> },
              { path: '/eosb', element: <SettlementListPage /> },
              // Before the /eosb/:id catch-all, or "new" is read as a settlement id.
              { path: '/eosb/new', element: <SettlementNewPage /> },
              { path: '/eosb/:id', element: <SettlementViewPage /> },
              { path: '/financial-requests', element: <FinancialRequestsPage /> },
              { path: '/assets', element: <AssetListPage /> },
              { path: '/exit-documents', element: <ExitDocumentsPage /> },
              { path: '/timesheets', element: <TimesheetsPage /> },
              { path: '/security-log', element: <AuditLogPage /> },
              { path: '/nfc', element: <NfcCompanyListPage /> },
              { path: '/nfc/cards', element: <NfcCardListPage /> },
              { path: '/nfc/cards/:id', element: <NfcCardDetailPage /> },
              // Before the /nfc/:id catch-all, or "analytics" is read as a company id.
              { path: '/nfc/analytics', element: <NfcAnalyticsPage /> },
              { path: '/nfc/:id', element: <NfcCompanyProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <WorkerRouter />,
        children: [
          {
            element: <EssLayout />,
            children: [
              { path: '/me', element: <MyProfilePage /> },
              { path: '/me/documents', element: <MyDocumentsPage /> },
              { path: '/me/attendance', element: <MyAttendancePage /> },
              { path: '/me/leave', element: <MyLeavePage /> },
              { path: '/me/requests', element: <MyRequestsPage /> },
              { path: '/me/exit-documents', element: <MyExitDocumentsPage /> },
            ],
          },
        ],
      },
    ],
  },
  // Unknown URL: send home — RequireAuth then sorts out login if needed.
  { path: '*', element: <Navigate to="/" replace /> },
]);
