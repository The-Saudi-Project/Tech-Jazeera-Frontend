/**
 * Client-wide constants. The API origin can be overridden per environment
 * (VITE_API_URL in client/.env) without touching code — required when the
 * app is deployed and the API is no longer on localhost.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

/** Mirrors server/src/modules/employees/employee.service.js — keep in sync. */
export const EXPIRY_WARNING_DAYS = 30;

/** Mirrors the Employee model's status enum. */
export const EMPLOYEE_STATUSES = ['Active', 'On Leave', 'Exited'];
/** 'Own' = internal staff (reports to a Manager). 'Client' = this company's
 *  own workforce supplied to clients (mapped to a Coordinator and/or a
 *  Manager). 'Subcontracted' = a worker sourced from an outside
 *  Subcontractor (their employer of record) and placed with a client — full
 *  compliance/attendance record, but never this company's own Payroll. */
export const EMPLOYEE_TYPES = ['Own', 'Client', 'Subcontracted'];
export const EMPLOYEE_TYPE_LABELS = {
  Own: 'Own — internal staff',
  Client: 'Client — supplied workforce',
  Subcontracted: 'Subcontracted — sourced from a subcontractor',
};
/** The "not internal staff" set — mirrors employee.model.js's WORKFORCE_TYPES. */
export const WORKFORCE_TYPES = ['Client', 'Subcontracted'];

/** Mirror of the server's route guards — used only to hide UI the API would
 *  reject anyway. The server is the real enforcement. */
export const EMPLOYEE_WRITE_ROLES = ['Admin', 'Manager', 'HR'];
export const EMPLOYEE_DELETE_ROLES = ['Admin', 'HR'];
/** Who may reach the "Add employee" form — write roles plus self-service
 *  Coordinator (adds only to their own team, no approval needed). */
export const EMPLOYEE_CREATE_ROLES = ['Admin', 'Manager', 'HR', 'Coordinator'];

/** Who may provision a login for an employee. Mirror of the server guard on
 *  POST /employees/:id/user — the server enforces. */
export const ACCOUNT_PROVISION_ROLES = ['Admin', 'HR'];
/** Every role a login can be provisioned with from an Employee's profile —
 *  any role except Admin, which has no Employee. Server-side this list is
 *  derived from ROLES automatically; kept as an explicit array here since
 *  this file isn't shared with the server. */
export const EMPLOYEE_LOGIN_ROLES = ['Manager', 'HR', 'Accounts', 'Coordinator', 'Staff', 'Worker'];

/** P2-M2: roles this app assigns to a Coordinator's team-scoped queries. */
export const COORDINATOR_ROLE = 'Coordinator';
/** Mirror of user.routes.js — who may edit staff logins vs just view them. */
export const STAFF_USER_MANAGE_ROLES = ['Admin'];
export const STAFF_USER_VIEW_ROLES = ['Admin', 'Manager', 'HR'];
/** Every role a staff login can be assigned (Worker is provisioned the same
 *  way, from an employee's profile, but isn't "staff" — see rbac.js). */
export const STAFF_ASSIGNABLE_ROLES = ['Admin', 'Manager', 'HR', 'Accounts', 'Coordinator'];
/** Roles eligible to be an Employee's manager (mirrors MANAGER_ELIGIBLE_ROLES
 *  on the server) — used by both the Coordinator-manager and Employee-manager
 *  pickers. */
export const MANAGER_ELIGIBLE_ROLES = ['Admin', 'Manager'];

/** Mirrors leaveType.model.js / leaveRequest.model.js (P2-M2). */
export const LEAVE_RECURRENCES = ['Annual', 'ContractCycle', 'Sick', 'Manual'];
export const LEAVE_RECURRENCE_LABELS = {
  Annual: 'Annual (recurring)',
  ContractCycle: 'Contract-cycle (one-time per cycle)',
  Sick: 'Sick (tiered pay)',
  Manual: 'Manual review only',
};
/** Article 117's statutory default — pre-filled when a new 'Sick' leave
 *  type is created, but a real editable field, not a hardcoded rate (a
 *  company may pay more generously). See leaveType.model.js. */
export const DEFAULT_SICK_PAY_TIERS = [
  { days: '30', payPercent: '100' },
  { days: '60', payPercent: '75' },
  { days: '30', payPercent: '0' },
];
export const LEAVE_REQUEST_STATUSES = ['AutoApproved', 'PendingReview', 'Approved', 'Rejected', 'Cancelled'];
export const LEAVE_REQUEST_STATUS_LABELS = {
  AutoApproved: 'Auto-approved',
  PendingReview: 'Pending review',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
};
export const LEAVE_STATUS_VARIANT = {
  AutoApproved: 'success',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'default',
};
/** Mirror of leave.routes.js guards — who configures policy vs who decides requests. */
export const LEAVE_TYPE_MANAGE_ROLES = ['Admin', 'Manager'];
export const LEAVE_DECIDE_ROLES = ['Admin', 'Manager', 'HR', 'Coordinator'];

/** Mirror of holiday.routes.js guards — read-open to everyone authenticated. */
export const HOLIDAY_MANAGE_ROLES = ['Admin', 'Manager', 'HR'];

/** Mirror of settlement.model.js. */
export const EXIT_REASONS = ['Resignation', 'TerminationByEmployer', 'EndOfContract'];
export const EXIT_REASON_LABELS = {
  Resignation: 'Resignation',
  TerminationByEmployer: 'Termination by employer',
  EndOfContract: 'End of contract',
};
/** Mirror of settlement.routes.js guards — view is wider than write (Accounts
 *  needs the figure to pay it; only HR/Manager/Admin compute one). */
export const EOSB_VIEW_ROLES = ['Admin', 'Manager', 'HR', 'Accounts'];
export const EOSB_WRITE_ROLES = ['Admin', 'Manager', 'HR'];

/** Mirrors advance.model.js / reimbursement.model.js. */
export const ADVANCE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Closed'];
export const ADVANCE_STATUS_VARIANT = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'default',
  Closed: 'primary',
};
export const REIMBURSEMENT_CATEGORIES = ['Travel', 'Fuel', 'Meals', 'Medical', 'Tools', 'Other'];
export const REIMBURSEMENT_STATUSES = ['Pending', 'Approved', 'Rejected', 'Paid'];
export const REIMBURSEMENT_STATUS_VARIANT = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Paid: 'primary',
};
/** Mirror of financialRequests.routes.js guards. Approving is Admin/Manager/HR;
 *  handling the actual money (repayments, marking paid) also includes Accounts. */
export const FINANCIAL_REQUEST_VIEW_ROLES = ['Admin', 'Manager', 'HR', 'Accounts'];
export const FINANCIAL_REQUEST_DECIDE_ROLES = ['Admin', 'Manager', 'HR'];
export const FINANCIAL_REQUEST_MONEY_ROLES = ['Admin', 'Manager', 'HR', 'Accounts'];
/** UX hint only — the server's real allowlist/limit is middleware/upload.js. */
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const RECEIPT_MAX_MB = 10;

/** Mirrors exitReentry.model.js / certificate.model.js. */
export const VISA_TYPES = ['Single', 'Multiple'];
export const EXIT_REENTRY_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Issued'];
export const EXIT_REENTRY_STATUS_VARIANT = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'default',
  Issued: 'primary',
};
export const CERTIFICATE_TYPES = ['SalaryCertificate', 'ServiceCertificate', 'ChamberOfCommerceAttestation'];
export const CERTIFICATE_TYPE_LABELS = {
  SalaryCertificate: 'Salary Certificate',
  ServiceCertificate: 'Service Certificate',
  ChamberOfCommerceAttestation: 'Chamber of Commerce Attestation',
};
export const CERTIFICATE_TYPES_WITH_PDF = ['SalaryCertificate', 'ServiceCertificate'];
export const CERTIFICATE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Issued'];
export const CERTIFICATE_STATUS_VARIANT = { Pending: 'warning', Approved: 'success', Rejected: 'danger', Issued: 'primary' };
/** Mirror of exitDocuments.routes.js guards — an HR/compliance-only module. */
export const EXIT_DOCUMENTS_ROLES = ['Admin', 'Manager', 'HR'];

/** Mirrors asset.model.js / assetAssignment.model.js. */
export const ASSET_CATEGORIES = ['Vehicle', 'Laptop', 'Mobile Device', 'Tool', 'Other'];
export const ASSET_STATUSES = ['Available', 'Assigned', 'Maintenance', 'Retired'];
export const ASSET_STATUS_VARIANT = { Available: 'success', Assigned: 'primary', Maintenance: 'warning', Retired: 'default' };
/** Mirror of asset.routes.js guards. */
export const ASSET_WRITE_ROLES = ['Admin', 'Manager', 'HR'];
export const ASSET_DELETE_ROLES = ['Admin', 'HR'];

/** Mirrors timesheet.model.js. Same write circle as Attendance. */
export const TIMESHEET_STATUSES = ['Submitted', 'Approved', 'Rejected'];
export const TIMESHEET_STATUS_VARIANT = { Submitted: 'warning', Approved: 'success', Rejected: 'danger' };
/** Same roles as ATTENDANCE_WRITE_ROLES (defined below) — deciding a
 *  timesheet is the same supervisory circle as correcting an attendance day. */
export const TIMESHEET_DECIDE_ROLES = ['Admin', 'Manager', 'HR'];

/** Mirrors payrollRun.model.js / payroll.routes.js guards. */
export const PAYROLL_STATUSES = ['Draft', 'Finalized'];
export const PAYROLL_STATUS_VARIANT = { Draft: 'warning', Finalized: 'success' };
export const PAYROLL_VIEW_ROLES = ['Admin', 'Manager', 'HR', 'Accounts'];
export const PAYROLL_WRITE_ROLES = ['Admin', 'Manager', 'Accounts'];
export const PAYROLL_FINALIZE_ROLES = ['Admin', 'Manager'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Mirrors invoice.model.js / invoice.routes.js guards — same commercial-
 *  document circle as Quotation. */
export const INVOICE_STATUSES = ['Unpaid', 'Partially Paid', 'Paid'];
export const INVOICE_STATUS_VARIANT = { Unpaid: 'danger', 'Partially Paid': 'warning', Paid: 'success' };
export const INVOICE_WRITE_ROLES = ['Admin', 'Manager', 'Accounts'];
export const INVOICE_DELETE_ROLES = ['Admin', 'Manager'];

/** Mirrors expense.model.js / expense.routes.js guards. Internal cost data —
 *  a narrower view circle than Invoices, same as Payroll/EOSB. */
export const EXPENSE_CATEGORIES = ['Rent', 'Fuel', 'Salaries-external', 'Purchases', 'Utilities', 'Other'];
export const EXPENSE_VIEW_ROLES = ['Admin', 'Manager', 'HR', 'Accounts'];
export const EXPENSE_WRITE_ROLES = ['Admin', 'Manager', 'Accounts'];
export const EXPENSE_DELETE_ROLES = ['Admin', 'Manager'];

/** Mirrors subcontractor.model.js's status enum. */
export const SUBCONTRACTOR_STATUSES = ['Active', 'Inactive'];
/** Mirror of subcontractor.routes.js guards — same circle as Client. */
export const SUBCONTRACTOR_WRITE_ROLES = ['Admin', 'Manager'];
export const SUBCONTRACTOR_DELETE_ROLES = ['Admin', 'Manager'];

/** Mirrors mobilisation.model.js's status enum. */
export const MOBILISATION_STATUSES = ['Draft', 'PendingReview', 'Approved', 'Rejected'];
export const MOBILISATION_STATUS_VARIANT = {
  Draft: 'default',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};
export const MOBILISATION_DOCUMENT_CATEGORIES = ['Contract', 'IDCopy', 'Other'];
export const MOBILISATION_DOCUMENT_CATEGORY_LABELS = { Contract: 'Contract', IDCopy: 'ID Copy', Other: 'Other' };
/** Configuring MobilisationSettings (viewer/self-mobilise roles) is
 *  Admin-only — server enforces; this only hides the nav link/route. */
export const MOBILISATION_SETTINGS_MANAGE_ROLES = ['Admin'];

/** Mirrors the Client model's status enum. */
export const CLIENT_STATUSES = ['Active', 'Inactive'];

/** Mirror of the client route guards (server enforces). */
export const CLIENT_WRITE_ROLES = ['Admin', 'Manager'];
export const CLIENT_DELETE_ROLES = ['Admin', 'Manager'];
/** Who may reach the "Add client" form — write roles plus self-service
 *  Coordinator (their submission starts Pending approval). */
export const CLIENT_CREATE_ROLES = ['Admin', 'Manager', 'Coordinator'];

/** Mirrors the Client model's approvalStatus enum — separate from `status`
 *  above. A Coordinator-created client starts Pending until decided. */
export const CLIENT_APPROVAL_STATUSES = ['Approved', 'Pending', 'Rejected'];
export const CLIENT_APPROVAL_VARIANT = { Approved: 'success', Pending: 'warning', Rejected: 'danger' };
/** Mirror of the client decide-route guard (server enforces the finer
 *  "must be THIS coordinator's manager" rule). */
export const CLIENT_DECIDE_ROLES = ['Admin', 'Manager'];

/** Who sees the Coordinator Activity oversight page. */
export const COORDINATOR_ACTIVITY_VIEW_ROLES = ['Admin', 'Manager', 'HR'];

/** Mirrors approvalWorkflow.model.js's APPROVAL_REQUEST_TYPES. */
export const APPROVAL_REQUEST_TYPES = ['Leave', 'SalaryAdvance', 'Reimbursement', 'Timesheet'];
export const APPROVAL_REQUEST_TYPE_LABELS = {
  Leave: 'Leave',
  SalaryAdvance: 'Salary Advance',
  Reimbursement: 'Reimbursement',
  Timesheet: 'Timesheet',
};
/** Configuring the hierarchy itself (roles/workflows) is Admin-only — the
 *  server enforces this; the mirror only hides the nav link/route for
 *  everyone else. */
export const APPROVALS_MANAGE_ROLES = ['Admin'];

/** Mirrors the Deployment model enums. */
export const DEPLOYMENT_SHIFTS = ['Day', 'Night', 'Rotating'];
export const DEPLOYMENT_STATUSES = ['Active', 'Ended'];

/** Mirror of the deployment route guards (server enforces). */
export const DEPLOYMENT_WRITE_ROLES = ['Admin', 'Manager'];

/** Mirrors the Attendance model enum, with display metadata used by the
 *  marking grid and summary. `letter` labels grid cells; `variant` is the
 *  Badge variant; `cell` is the grid-cell colour. */
export const ATTENDANCE_STATUS_META = {
  Present: { letter: 'P', variant: 'success', cell: 'bg-success/15 text-success' },
  Absent: { letter: 'A', variant: 'danger', cell: 'bg-danger/15 text-danger' },
  Leave: { letter: 'L', variant: 'warning', cell: 'bg-warning/15 text-warning' },
  Sick: { letter: 'S', variant: 'primary', cell: 'bg-primary/15 text-primary' },
  Off: { letter: 'F', variant: 'default', cell: 'bg-border/60 text-muted' },
};
export const ATTENDANCE_STATUSES = Object.keys(ATTENDANCE_STATUS_META);

/** Display-only inference for a company Holiday date in the records grid —
 *  deliberately NOT part of ATTENDANCE_STATUS_META so it can never become a
 *  selectable value in the manual status dropdown (see holiday.model.js: a
 *  holiday is never written to Attendance itself). Cell styling matches the
 *  grid's shared "inferred" treatment (see RecordsGrid.jsx), not its own color. */
export const HOLIDAY_DISPLAY_META = { letter: 'H' };

/** Mirrors Employee.weeklyOffDay's 0=Sun..6=Sat convention (Date#getUTCDay()). */
export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Mirror of the attendance write guard (server enforces). */
export const ATTENDANCE_WRITE_ROLES = ['Admin', 'Manager', 'HR'];
/** Who clocks their own attendance in/out (mirrors staffAttendance.routes.js).
 *  Admin/Manager are exempt by design; Workers have their own equivalent via
 *  the ESS portal. */
export const STAFF_SELF_ATTENDANCE_ROLES = ['Coordinator', 'HR', 'Accounts'];

/** Mirrors the Document model enums. */
export const DOCUMENT_OWNER_TYPES = ['Employee', 'Client'];
export const DOCUMENT_CATEGORIES = [
  'Passport',
  'Visa',
  'Iqama',
  'Medical',
  'Driving License',
  'Contract',
  'Certificate',
  'Commercial Registration',
  'VAT Certificate',
  'Agreement',
  'Invoice',
  'Other',
];

/** Mirror of the document route guards (server enforces). */
export const DOCUMENT_WRITE_ROLES = ['Admin', 'Manager', 'HR'];
export const DOCUMENT_DELETE_ROLES = ['Admin', 'Manager', 'HR'];

/** Upload limits, mirrored from server/src/middleware/upload.js. */
export const DOCUMENT_MAX_MB = 10;
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx';

/** Profile-photo upload limits, mirrored from server/src/modules/auth/avatar.upload.js. */
export const AVATAR_MAX_MB = 2;
export const AVATAR_ACCEPT = '.jpg,.jpeg,.png,.webp';

/** Mirrors the Quotation model enums. */
export const QUOTATION_STATUSES = ['Draft', 'Approved', 'Rejected'];
export const QUOTATION_LINE_TYPES = ['Labour', 'Trading'];

/** Mirror of the quotation route guards (server enforces). */
export const QUOTATION_WRITE_ROLES = ['Admin', 'Manager', 'Accounts'];
export const QUOTATION_DELETE_ROLES = ['Admin', 'Manager'];

/** Default KSA VAT rate for new line items. */
export const DEFAULT_TAX_RATE = 15;
