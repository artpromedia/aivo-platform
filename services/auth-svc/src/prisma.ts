import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export types for convenience
export {
  UserStatus,
  UserRoleEnum,
  IdpProtocol,
  ConsentType,
  ConsentStatus,
  ConsentPurpose,
  TrustTier,
  TrustTrend,
  ComplianceEventType,
  ComplianceSeverity,
  ThresholdContextType,
  VerificationLevel,
} from '../generated/prisma-client/index.js';

export type {
  User,
  UserRole,
  IdpConfig,
  SsoAttempt,
  Tenant,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  FailedLoginAttempt,
  Consent,
  ConsentHistory,
  AgeVerification,
  MfaConfig,
  MfaChallenge,
  TrustScore,
  TrustScoreHistory,
  TrustThreshold,
  SkillPodComplianceRecord,
  Prisma,
} from '../generated/prisma-client/index.js';
