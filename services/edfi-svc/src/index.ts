/**
 * Ed-Fi Integration Service
 *
 * Enables compliance with state education agency reporting requirements
 * via the Ed-Fi Data Standard.
 */

// Connectors
export { EdfiClient, type EdfiClientConfig, type EdfiApiVersion } from './connectors/edfi-client';

// Types
export * from './types/edfi-resources';

// Transforms
export * from './transforms/student-transform';

// Exports
export {
  ExportService,
  type ExportConfig,
  type ExportOptions,
  type ExportProgress,
} from './exports/export-service';

// API
export { registerRoutes } from './api/routes';
