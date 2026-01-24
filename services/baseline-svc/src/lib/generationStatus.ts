/**
 * Generation Status Tracker
 *
 * SPRINT 5: Provides real-time generation status for UX feedback
 * Allows frontend to show progress during baseline assessment generation
 *
 * @module generationStatus
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerationStatus {
  profileId: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  domains: DomainGenerationStatus[];
  totalQuestions: number;
  generatedQuestions: number;
  progressPercent: number;
  estimatedRemainingMs?: number;
  error?: string;
}

export interface DomainGenerationStatus {
  domain: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  startedAt?: Date;
  completedAt?: Date;
  questionCount: number;
  source: 'AI' | 'CURATED' | 'STATIC' | 'PENDING';
  durationMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STATUS STORE
// Note: In production, this should use Redis for multi-instance support
// ═══════════════════════════════════════════════════════════════════════════════

const statusStore = new Map<string, GenerationStatus>();

// Clean up old entries after 30 minutes
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const MAX_AGE_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [profileId, status] of statusStore) {
    if (now - status.updatedAt.getTime() > MAX_AGE_MS) {
      statusStore.delete(profileId);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize generation status for a profile
 */
export function initializeGenerationStatus(
  profileId: string,
  domains: string[]
): GenerationStatus {
  const now = new Date();
  const status: GenerationStatus = {
    profileId,
    status: 'GENERATING',
    startedAt: now,
    updatedAt: now,
    domains: domains.map((domain) => ({
      domain,
      status: 'PENDING',
      questionCount: 0,
      source: 'PENDING',
    })),
    totalQuestions: 0,
    generatedQuestions: 0,
    progressPercent: 0,
    estimatedRemainingMs: 15000, // Initial estimate: 15 seconds
  };

  statusStore.set(profileId, status);
  return status;
}

/**
 * Update domain generation status
 */
export function updateDomainStatus(
  profileId: string,
  domain: string,
  update: Partial<DomainGenerationStatus>
): GenerationStatus | null {
  const status = statusStore.get(profileId);
  if (!status) return null;

  const domainStatus = status.domains.find((d) => d.domain === domain);
  if (domainStatus) {
    Object.assign(domainStatus, update);
  }

  // Recalculate progress
  const completedDomains = status.domains.filter((d) =>
    d.status === 'COMPLETED' || d.status === 'FAILED'
  ).length;
  status.progressPercent = Math.round((completedDomains / status.domains.length) * 100);
  status.generatedQuestions = status.domains.reduce((sum, d) => sum + d.questionCount, 0);
  status.updatedAt = new Date();

  // Estimate remaining time based on completed domains
  if (completedDomains > 0 && completedDomains < status.domains.length) {
    const elapsedMs = Date.now() - status.startedAt.getTime();
    const msPerDomain = elapsedMs / completedDomains;
    const remainingDomains = status.domains.length - completedDomains;
    status.estimatedRemainingMs = Math.round(msPerDomain * remainingDomains);
  }

  return status;
}

/**
 * Mark generation as completed
 */
export function completeGeneration(
  profileId: string,
  totalQuestions: number
): GenerationStatus | null {
  const status = statusStore.get(profileId);
  if (!status) return null;

  status.status = 'COMPLETED';
  status.completedAt = new Date();
  status.updatedAt = new Date();
  status.totalQuestions = totalQuestions;
  status.generatedQuestions = totalQuestions;
  status.progressPercent = 100;
  status.estimatedRemainingMs = 0;

  return status;
}

/**
 * Mark generation as failed
 */
export function failGeneration(
  profileId: string,
  error: string
): GenerationStatus | null {
  const status = statusStore.get(profileId);
  if (!status) return null;

  status.status = 'FAILED';
  status.updatedAt = new Date();
  status.error = error;
  status.estimatedRemainingMs = undefined;

  return status;
}

/**
 * Get current generation status
 */
export function getGenerationStatus(profileId: string): GenerationStatus | null {
  return statusStore.get(profileId) || null;
}

/**
 * Clean up generation status
 */
export function clearGenerationStatus(profileId: string): void {
  statusStore.delete(profileId);
}

export default {
  initializeGenerationStatus,
  updateDomainStatus,
  completeGeneration,
  failGeneration,
  getGenerationStatus,
  clearGenerationStatus,
};
