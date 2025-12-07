import type { Role } from '@aivo/ts-rbac';

export type FieldClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SENSITIVE';

export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: Role[];
  /**
   * Learner ids the caller is allowed to access directly (e.g., parent/teacher roster).
   * Populated by the calling service from its own data (assignments, relationships).
   */
  relatedLearnerIds?: string[];
}
