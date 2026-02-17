/**
 * Ed-Fi Integration Module
 *
 * Consolidated Ed-Fi Data Standard state reporting module,
 * merged from the standalone edfi-svc into integration-svc.
 */

// Client
export { EdfiClient } from './client.js';
export type { EdfiClientConfig, EdfiClientOptions, EdfiApiVersion } from './client.js';

// Export service
export { ExportService } from './export-service.js';
export type {
  ExportConfig,
  ExportOptions,
  ExportProgress,
  LearnerDataSource,
  EdfiPrismaClient,
} from './export-service.js';

// Student transforms
export {
  transformToEdfiStudent,
  transformToEdfiStudentSchoolAssociation,
  transformToEdfiStudentSectionAssociations,
} from './student-transform.js';
export type { AivoLearner, TransformContext, TransformResult } from './student-transform.js';

// Routes
export { registerEdfiRoutes } from './routes.js';

// Types
export type {
  EdfiReference,
  EdfiDescriptor,
  EdfiStudent,
  EdfiStudentSchoolAssociation,
  EdfiStudentSectionAssociation,
  EdfiStaff,
  EdfiStaffSectionAssociation,
  EdfiSchool,
  EdfiLocalEducationAgency,
  EdfiCourse,
  EdfiSection,
  EdfiStudentAssessment,
  EdfiStudentSchoolAttendanceEvent,
  EdfiGrade,
  EdfiLearningStandard,
  EdfiApiError,
  EdfiBulkOperationStatus,
  EdfiTokenResponse,
  EdfiResource,
} from './types.js';
