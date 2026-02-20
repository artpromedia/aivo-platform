import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

/**
 * Connect to the database with error handling.
 * Service will start even if DB is temporarily unavailable.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[auth-svc] Database connected');
  } catch (error) {
    console.warn(
      `[auth-svc] Database connection failed - service will start without DB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Disconnect from the database gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('[auth-svc] Database disconnected');
}

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
