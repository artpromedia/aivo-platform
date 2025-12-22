/**
 * NATS Event Publisher for Research Service
 *
 * Publishes domain events for research governance actions.
 */

// Event payload types
export interface ProjectCreatedPayload {
  projectId: string;
  tenantId: string;
  title: string;
  type: string;
  piEmail: string;
  createdByUserId: string;
  timestamp: string;
}

export interface ProjectApprovedPayload {
  projectId: string;
  tenantId: string;
  title: string;
  approvedByUserId: string;
  timestamp: string;
}

export interface ProjectRejectedPayload {
  projectId: string;
  tenantId: string;
  title: string;
  rejectedByUserId: string;
  reason: string;
  timestamp: string;
}

export interface ExportRequestedPayload {
  exportJobId: string;
  projectId: string;
  tenantId: string;
  datasetDefinitionId: string;
  cohortId: string;
  format: string;
  requestedByUserId: string;
  timestamp: string;
}

export interface ExportCompletedPayload {
  exportJobId: string;
  projectId: string;
  tenantId: string;
  rowCount: number;
  fileSizeBytes: number;
  storagePath: string;
  checksum?: string;
  timestamp: string;
}

export interface ExportFailedPayload {
  exportJobId: string;
  projectId: string;
  tenantId: string;
  errorCode: string;
  errorMessage: string;
  timestamp: string;
}

export interface AccessGrantedPayload {
  grantId: string;
  projectId: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  scope: string;
  grantedByUserId: string;
  timestamp: string;
}

export interface AccessRevokedPayload {
  grantId: string;
  projectId: string;
  tenantId: string;
  userId: string;
  revokedByUserId: string;
  reason?: string;
  timestamp: string;
}

// Placeholder NATS publisher functions
// In production, these would use the @aivo/events library

export async function publishProjectCreated(payload: ProjectCreatedPayload): Promise<void> {
  console.log('[NATS] research.project.created', JSON.stringify(payload));
}

export async function publishProjectApproved(payload: ProjectApprovedPayload): Promise<void> {
  console.log('[NATS] research.project.approved', JSON.stringify(payload));
}

export async function publishProjectRejected(payload: ProjectRejectedPayload): Promise<void> {
  console.log('[NATS] research.project.rejected', JSON.stringify(payload));
}

export async function publishExportRequested(payload: ExportRequestedPayload): Promise<void> {
  console.log('[NATS] research.export.requested', JSON.stringify(payload));
}

export async function publishExportCompleted(payload: ExportCompletedPayload): Promise<void> {
  console.log('[NATS] research.export.completed', JSON.stringify(payload));
}

export async function publishExportFailed(payload: ExportFailedPayload): Promise<void> {
  console.log('[NATS] research.export.failed', JSON.stringify(payload));
}

export async function publishAccessGranted(payload: AccessGrantedPayload): Promise<void> {
  console.log('[NATS] research.access.granted', JSON.stringify(payload));
}

export async function publishAccessRevoked(payload: AccessRevokedPayload): Promise<void> {
  console.log('[NATS] research.access.revoked', JSON.stringify(payload));
}
