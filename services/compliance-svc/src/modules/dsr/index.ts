/**
 * DSR Module – barrel export
 *
 * Data Subject Requests: GDPR Article 17 (erasure) & Article 20 (portability).
 * Includes v1 and v2 route plugins, background worker, and scheduler.
 */

// Route plugins (register with Fastify)
export { registerDsrRoutes } from './routes/dsr.js';
export { registerDsrRoutesV2 } from './routes/dsr-v2.js';

// Services
export { DeletionOrchestrator, createInternalDeletionHandler } from './services/deletion-orchestrator.js';
export { GdprExporter, createExportHandlers } from './services/gdpr-exporter.js';
export {
  sendCompletionNotification,
  sendSubmissionConfirmation,
  sendGracePeriodReminder,
  sendExportReadyNotification,
} from './services/notification-service.js';

// Core
export { createDsrWorker } from './worker.js';
export { startGracePeriodScheduler, stopGracePeriodScheduler } from './scheduler.js';

// Types (re-export key types for external consumers)
export type {
  DsrRequest,
  DsrRequestType,
  DsrRequestStatus,
  DsrJobStatus,
  DsrCreateResponse,
  DsrRequestSummary,
} from './types.js';
export { DSR_CONFIG } from './types.js';
