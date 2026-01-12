/**
 * API Services Index
 *
 * Re-exports all API services for convenient imports
 */

export { api, API_BASE_URL, type APIError, type RequestConfig } from './client';
export { classesApi } from './classes';
export { studentsApi } from './students';
export { assignmentsApi } from './assignments';
export { gradesApi } from './grades';
export { reportsApi } from './reports';
export { messagesApi } from './messages';
export { calendarApi } from './calendar';

// Professional Development
export {
  pdProgramsApi,
  pdEnrollmentsApi,
  pdRequirementsApi,
  pdCertificatesApi,
  pdReportsApi,
  calculateProgress,
  isRequirementAtRisk,
  getStatusColor,
  formatCreditHours,
  formatDuration,
  type PDProgram,
  type PDModule,
  type PDEnrollment,
  type PDRequirement,
  type PDCertificate,
  type PDComplianceStatus,
  type PDProgress,
  type PDProgramStatus,
  type PDEnrollmentStatus,
  type PDRequirementStatus,
} from './professional-development';
