-- CreateEnum
CREATE TYPE "CaregiverRelationshipType" AS ENUM ('PARENT', 'GUARDIAN', 'GRANDPARENT', 'FOSTER_PARENT', 'OTHER_FAMILY', 'AUTHORIZED_CAREGIVER');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'EMAIL_VERIFIED', 'SCHOOL_VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('SCHOOL_ADMIN_APPROVAL', 'VERIFICATION_CODE_FROM_SCHOOL', 'DOCUMENT_UPLOAD', 'EXISTING_FAMILY_LINK');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "caregiver_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "relationship" "CaregiverRelationshipType" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationCode" TEXT NOT NULL,
    "codeExpiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "caregiverId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_link_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registrationId" TEXT NOT NULL,
    "learnerEmail" TEXT,
    "studentId" TEXT,
    "learnerFirstName" TEXT,
    "learnerLastName" TEXT,
    "learnerDateOfBirth" TIMESTAMP(3),
    "schoolName" TEXT,
    "schoolId" TEXT,
    "verificationMethod" "VerificationMethod" NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "schoolVerifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "rejectionReason" TEXT,
    "learnerId" TEXT,
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_link_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_verification_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'parent_link',
    "issuedById" TEXT NOT NULL,
    "claimedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registrationId" TEXT,
    "linkRequestId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'system',
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_registrations_verificationCode_key" ON "caregiver_registrations"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_registrations_caregiverId_key" ON "caregiver_registrations"("caregiverId");

-- CreateIndex
CREATE INDEX "caregiver_registrations_email_idx" ON "caregiver_registrations"("email");

-- CreateIndex
CREATE INDEX "caregiver_registrations_verificationCode_idx" ON "caregiver_registrations"("verificationCode");

-- CreateIndex
CREATE INDEX "caregiver_registrations_status_idx" ON "caregiver_registrations"("status");

-- CreateIndex
CREATE INDEX "caregiver_registrations_tenantId_idx" ON "caregiver_registrations"("tenantId");

-- CreateIndex
CREATE INDEX "learner_link_requests_registrationId_idx" ON "learner_link_requests"("registrationId");

-- CreateIndex
CREATE INDEX "learner_link_requests_learnerEmail_idx" ON "learner_link_requests"("learnerEmail");

-- CreateIndex
CREATE INDEX "learner_link_requests_studentId_idx" ON "learner_link_requests"("studentId");

-- CreateIndex
CREATE INDEX "learner_link_requests_schoolId_idx" ON "learner_link_requests"("schoolId");

-- CreateIndex
CREATE INDEX "learner_link_requests_verificationStatus_idx" ON "learner_link_requests"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "school_verification_codes_code_key" ON "school_verification_codes"("code");

-- CreateIndex
CREATE INDEX "school_verification_codes_code_idx" ON "school_verification_codes"("code");

-- CreateIndex
CREATE INDEX "school_verification_codes_schoolId_idx" ON "school_verification_codes"("schoolId");

-- CreateIndex
CREATE INDEX "school_verification_codes_learnerId_idx" ON "school_verification_codes"("learnerId");

-- CreateIndex
CREATE INDEX "school_verification_codes_expiresAt_idx" ON "school_verification_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "registration_audit_logs_registrationId_idx" ON "registration_audit_logs"("registrationId");

-- CreateIndex
CREATE INDEX "registration_audit_logs_linkRequestId_idx" ON "registration_audit_logs"("linkRequestId");

-- CreateIndex
CREATE INDEX "registration_audit_logs_action_idx" ON "registration_audit_logs"("action");

-- CreateIndex
CREATE INDEX "registration_audit_logs_createdAt_idx" ON "registration_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "learner_link_requests" ADD CONSTRAINT "learner_link_requests_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "caregiver_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
