-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserRoleEnum" AS ENUM ('PARENT', 'LEARNER', 'TEACHER', 'THERAPIST', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "IdpProtocol" AS ENUM ('SAML', 'OIDC');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PARENTAL', 'STUDENT', 'USER', 'MARKETING', 'ANALYTICS', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('ACCOUNT_CREATION', 'EDUCATIONAL_SERVICES', 'PERSONALIZATION', 'ANALYTICS', 'MARKETING', 'THIRD_PARTY_SHARING', 'RESEARCH', 'AI_PROCESSING');

-- CreateEnum
CREATE TYPE "TrustTier" AS ENUM ('EMERGING', 'ESTABLISHED', 'TRUSTED', 'HIGHLY_TRUSTED', 'ELITE');

-- CreateEnum
CREATE TYPE "TrustTrend" AS ENUM ('RISING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "ComplianceEventType" AS ENUM ('DATA_TRANSFER_ATTEMPT', 'UNAUTHORIZED_APP', 'POLICY_VIOLATION', 'SESSION_ANOMALY', 'SCREENSHOT_ATTEMPT', 'SCREEN_SHARE_ATTEMPT');

-- CreateEnum
CREATE TYPE "ComplianceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ThresholdContextType" AS ENUM ('JOB', 'TENANT', 'POD_TEMPLATE', 'GLOBAL');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('NONE', 'EMAIL', 'BASIC', 'ENHANCED', 'PREMIUM');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "acceptedMarketing" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "country" VARCHAR(2),
    "timezone" VARCHAR(50),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "curriculum_framework" TEXT,
    "date_format" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "time_format" TEXT NOT NULL DEFAULT '12h',
    "first_day_of_week" INTEGER NOT NULL DEFAULT 0,
    "number_format" TEXT NOT NULL DEFAULT 'en-US',
    "detected_country" VARCHAR(2),
    "detected_language" VARCHAR(10),
    "detected_timezone" VARCHAR(50),
    "detection_method" TEXT,
    "detected_at" TIMESTAMP(3),
    "language_overridden" BOOLEAN NOT NULL DEFAULT false,
    "country_overridden" BOOLEAN NOT NULL DEFAULT false,
    "currency_overridden" BOOLEAN NOT NULL DEFAULT false,
    "curriculum_overridden" BOOLEAN NOT NULL DEFAULT false,
    "timezone_overridden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRoleEnum" NOT NULL,
    "contextJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdpConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "protocol" "IdpProtocol" NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoUrl" TEXT,
    "sloUrl" TEXT,
    "x509Certificate" TEXT,
    "metadataXml" TEXT,
    "clientId" TEXT,
    "clientSecretRef" TEXT,
    "authorizationEndpoint" TEXT,
    "tokenEndpoint" TEXT,
    "userinfoEndpoint" TEXT,
    "jwksUri" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['openid', 'profile', 'email']::TEXT[],
    "emailClaim" TEXT NOT NULL DEFAULT 'email',
    "nameClaim" TEXT NOT NULL DEFAULT 'name',
    "firstNameClaim" TEXT NOT NULL DEFAULT 'given_name',
    "lastNameClaim" TEXT NOT NULL DEFAULT 'family_name',
    "roleClaim" TEXT NOT NULL DEFAULT 'role',
    "externalIdClaim" TEXT NOT NULL DEFAULT 'sub',
    "roleMapping" JSONB NOT NULL DEFAULT '{}',
    "autoProvisionUsers" BOOLEAN NOT NULL DEFAULT false,
    "defaultRole" "UserRoleEnum" NOT NULL DEFAULT 'TEACHER',
    "loginHintTemplate" TEXT,
    "allowedUserTypes" "UserRoleEnum"[] DEFAULT ARRAY['TEACHER', 'THERAPIST', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN']::"UserRoleEnum"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SsoAttempt" (
    "id" UUID NOT NULL,
    "idpConfigId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userIdentifier" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "userId" UUID,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SsoAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoRequired" BOOLEAN NOT NULL DEFAULT false,
    "fallbackAdminEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "platform" TEXT,
    "refreshTokenHash" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByIp" TEXT,
    "changedReason" TEXT,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedLoginAttempt" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "purposes" "ConsentPurpose"[],
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "grantedById" UUID,
    "grantedByEmail" TEXT,
    "grantedByIp" TEXT,
    "termsVersion" TEXT NOT NULL DEFAULT '1.0',
    "termsDocument" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentHistory" (
    "id" UUID NOT NULL,
    "consentId" UUID NOT NULL,
    "previousStatus" "ConsentStatus" NOT NULL,
    "newStatus" "ConsentStatus" NOT NULL,
    "changedById" UUID,
    "changedByIp" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "verifiedAge" INTEGER,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "coppaApplicable" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaConfig" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT NOT NULL DEFAULT 'totp',
    "totpSecretEncrypted" TEXT,
    "totpVerifiedAt" TIMESTAMP(3),
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "backupCodesGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "code" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustScore" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 50,
    "reviewScore" INTEGER NOT NULL DEFAULT 0,
    "complianceScore" INTEGER NOT NULL DEFAULT 100,
    "verificationScore" INTEGER NOT NULL DEFAULT 0,
    "tenureScore" INTEGER NOT NULL DEFAULT 0,
    "activityScore" INTEGER NOT NULL DEFAULT 0,
    "reviewWeight" INTEGER NOT NULL DEFAULT 40,
    "complianceWeight" INTEGER NOT NULL DEFAULT 25,
    "verificationWeight" INTEGER NOT NULL DEFAULT 20,
    "tenureWeight" INTEGER NOT NULL DEFAULT 10,
    "activityWeight" INTEGER NOT NULL DEFAULT 5,
    "tier" "TrustTier" NOT NULL DEFAULT 'EMERGING',
    "trend" "TrustTrend" NOT NULL DEFAULT 'STABLE',
    "previousScore" INTEGER,
    "scoreChangeAmount" INTEGER,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "factors" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustScoreHistory" (
    "id" UUID NOT NULL,
    "trustScoreId" UUID NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "reviewScore" INTEGER NOT NULL,
    "complianceScore" INTEGER NOT NULL,
    "verificationScore" INTEGER NOT NULL,
    "tenureScore" INTEGER NOT NULL,
    "activityScore" INTEGER NOT NULL,
    "tier" "TrustTier" NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPodComplianceRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "eventType" "ComplianceEventType" NOT NULL,
    "severity" "ComplianceSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    "resolutionNotes" TEXT,
    "scoreImpact" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillPodComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustThreshold" (
    "id" UUID NOT NULL,
    "contextType" "ThresholdContextType" NOT NULL,
    "contextId" UUID,
    "minimumScore" INTEGER NOT NULL DEFAULT 0,
    "minimumTier" "TrustTier",
    "requireVerification" BOOLEAN NOT NULL DEFAULT false,
    "minimumVerificationLevel" "VerificationLevel",
    "requireMfa" BOOLEAN NOT NULL DEFAULT false,
    "minimumReviews" INTEGER,
    "minimumCompletedJobs" INTEGER,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScimToken" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScimToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationSession" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "targetTenantId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "readOnly" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "adminIpAddress" TEXT,
    "adminUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScimSyncLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestBody" JSONB,
    "statusCode" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScimSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_externalId_key" ON "User"("tenantId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_tenantId_idx" ON "user_preferences"("tenantId");

-- CreateIndex
CREATE INDEX "user_preferences_language_idx" ON "user_preferences"("language");

-- CreateIndex
CREATE INDEX "user_preferences_country_idx" ON "user_preferences"("country");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "IdpConfig_tenantId_idx" ON "IdpConfig"("tenantId");

-- CreateIndex
CREATE INDEX "IdpConfig_enabled_idx" ON "IdpConfig"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "IdpConfig_tenantId_protocol_key" ON "IdpConfig"("tenantId", "protocol");

-- CreateIndex
CREATE INDEX "SsoAttempt_tenantId_idx" ON "SsoAttempt"("tenantId");

-- CreateIndex
CREATE INDEX "SsoAttempt_idpConfigId_idx" ON "SsoAttempt"("idpConfigId");

-- CreateIndex
CREATE INDEX "SsoAttempt_initiatedAt_idx" ON "SsoAttempt"("initiatedAt");

-- CreateIndex
CREATE INDEX "SsoAttempt_success_idx" ON "SsoAttempt"("success");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_domain_idx" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordHistory_userId_idx" ON "PasswordHistory"("userId");

-- CreateIndex
CREATE INDEX "PasswordHistory_tenantId_idx" ON "PasswordHistory"("tenantId");

-- CreateIndex
CREATE INDEX "PasswordHistory_changedAt_idx" ON "PasswordHistory"("changedAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "FailedLoginAttempt_email_tenantId_idx" ON "FailedLoginAttempt"("email", "tenantId");

-- CreateIndex
CREATE INDEX "FailedLoginAttempt_ipAddress_idx" ON "FailedLoginAttempt"("ipAddress");

-- CreateIndex
CREATE INDEX "FailedLoginAttempt_attemptedAt_idx" ON "FailedLoginAttempt"("attemptedAt");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_tenantId_idx" ON "Consent"("tenantId");

-- CreateIndex
CREATE INDEX "Consent_status_idx" ON "Consent"("status");

-- CreateIndex
CREATE INDEX "Consent_expiresAt_idx" ON "Consent"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consent_userId_consentType_tenantId_key" ON "Consent"("userId", "consentType", "tenantId");

-- CreateIndex
CREATE INDEX "ConsentHistory_consentId_idx" ON "ConsentHistory"("consentId");

-- CreateIndex
CREATE INDEX "ConsentHistory_createdAt_idx" ON "ConsentHistory"("createdAt");

-- CreateIndex
CREATE INDEX "AgeVerification_userId_idx" ON "AgeVerification"("userId");

-- CreateIndex
CREATE INDEX "AgeVerification_tenantId_idx" ON "AgeVerification"("tenantId");

-- CreateIndex
CREATE INDEX "AgeVerification_isMinor_idx" ON "AgeVerification"("isMinor");

-- CreateIndex
CREATE UNIQUE INDEX "AgeVerification_userId_tenantId_key" ON "AgeVerification"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "MfaConfig_userId_idx" ON "MfaConfig"("userId");

-- CreateIndex
CREATE INDEX "MfaConfig_tenantId_idx" ON "MfaConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MfaConfig_userId_tenantId_key" ON "MfaConfig"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "MfaChallenge_userId_idx" ON "MfaChallenge"("userId");

-- CreateIndex
CREATE INDEX "MfaChallenge_sessionId_idx" ON "MfaChallenge"("sessionId");

-- CreateIndex
CREATE INDEX "MfaChallenge_expiresAt_idx" ON "MfaChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrustScore_userId_key" ON "TrustScore"("userId");

-- CreateIndex
CREATE INDEX "TrustScore_tier_idx" ON "TrustScore"("tier");

-- CreateIndex
CREATE INDEX "TrustScore_trend_idx" ON "TrustScore"("trend");

-- CreateIndex
CREATE INDEX "TrustScore_overallScore_idx" ON "TrustScore"("overallScore");

-- CreateIndex
CREATE INDEX "TrustScoreHistory_trustScoreId_idx" ON "TrustScoreHistory"("trustScoreId");

-- CreateIndex
CREATE INDEX "TrustScoreHistory_createdAt_idx" ON "TrustScoreHistory"("createdAt");

-- CreateIndex
CREATE INDEX "SkillPodComplianceRecord_userId_idx" ON "SkillPodComplianceRecord"("userId");

-- CreateIndex
CREATE INDEX "SkillPodComplianceRecord_sessionId_idx" ON "SkillPodComplianceRecord"("sessionId");

-- CreateIndex
CREATE INDEX "SkillPodComplianceRecord_eventType_idx" ON "SkillPodComplianceRecord"("eventType");

-- CreateIndex
CREATE INDEX "SkillPodComplianceRecord_severity_idx" ON "SkillPodComplianceRecord"("severity");

-- CreateIndex
CREATE INDEX "SkillPodComplianceRecord_isResolved_idx" ON "SkillPodComplianceRecord"("isResolved");

-- CreateIndex
CREATE INDEX "SkillPodComplianceRecord_createdAt_idx" ON "SkillPodComplianceRecord"("createdAt");

-- CreateIndex
CREATE INDEX "TrustThreshold_contextType_idx" ON "TrustThreshold"("contextType");

-- CreateIndex
CREATE INDEX "TrustThreshold_isActive_idx" ON "TrustThreshold"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrustThreshold_contextType_contextId_key" ON "TrustThreshold"("contextType", "contextId");

-- CreateIndex
CREATE UNIQUE INDEX "ScimToken_tokenHash_key" ON "ScimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ScimToken_tenantId_idx" ON "ScimToken"("tenantId");

-- CreateIndex
CREATE INDEX "ScimToken_tokenHash_idx" ON "ScimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ImpersonationSession_adminUserId_idx" ON "ImpersonationSession"("adminUserId");

-- CreateIndex
CREATE INDEX "ImpersonationSession_targetUserId_idx" ON "ImpersonationSession"("targetUserId");

-- CreateIndex
CREATE INDEX "ImpersonationSession_targetTenantId_idx" ON "ImpersonationSession"("targetTenantId");

-- CreateIndex
CREATE INDEX "ImpersonationSession_expiresAt_idx" ON "ImpersonationSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ScimSyncLog_tenantId_idx" ON "ScimSyncLog"("tenantId");

-- CreateIndex
CREATE INDEX "ScimSyncLog_processedAt_idx" ON "ScimSyncLog"("processedAt");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoAttempt" ADD CONSTRAINT "SsoAttempt_idpConfigId_fkey" FOREIGN KEY ("idpConfigId") REFERENCES "IdpConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentHistory" ADD CONSTRAINT "ConsentHistory_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "Consent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreHistory" ADD CONSTRAINT "TrustScoreHistory_trustScoreId_fkey" FOREIGN KEY ("trustScoreId") REFERENCES "TrustScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
