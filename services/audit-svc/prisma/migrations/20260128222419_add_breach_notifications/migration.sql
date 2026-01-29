-- CreateTable
CREATE TABLE "SecurityBreach" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "breachType" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL,
    "discoveredAt" TIMESTAMPTZ NOT NULL,
    "occurredAt" TIMESTAMPTZ,
    "containedAt" TIMESTAMPTZ,
    "affectedDataTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedUserCount" INTEGER NOT NULL DEFAULT 0,
    "affectedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "affectedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "technicalDetails" TEXT,
    "rootCause" TEXT,
    "impactAssessment" JSONB,
    "requiresNotification" BOOLEAN NOT NULL DEFAULT true,
    "notificationDeadline" TIMESTAMPTZ,
    "regulatorNotifiedAt" TIMESTAMPTZ,
    "regulatorNotifiedBy" UUID,
    "regulatorReference" TEXT,
    "regulatorResponse" TEXT,
    "subjectsNotifiedAt" TIMESTAMPTZ,
    "subjectsNotifiedBy" UUID,
    "notificationMethod" TEXT,
    "notificationContent" TEXT,
    "responseActions" JSONB,
    "remediationPlan" JSONB,
    "mitigationMeasures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lessonsLearned" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "isContained" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMPTZ,
    "incidentOwnerId" UUID,
    "responseTeam" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "legalReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "legalReviewedAt" TIMESTAMPTZ,
    "legalReviewedBy" UUID,
    "legalOpinion" TEXT,
    "attachments" JSONB,
    "relatedAuditLogIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportedById" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityBreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityBreach_tenantId_status_idx" ON "SecurityBreach"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SecurityBreach_tenantId_severity_idx" ON "SecurityBreach"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "SecurityBreach_tenantId_discoveredAt_idx" ON "SecurityBreach"("tenantId", "discoveredAt");

-- CreateIndex
CREATE INDEX "SecurityBreach_requiresNotification_regulatorNotifiedAt_idx" ON "SecurityBreach"("requiresNotification", "regulatorNotifiedAt");

-- CreateIndex
CREATE INDEX "SecurityBreach_requiresNotification_subjectsNotifiedAt_idx" ON "SecurityBreach"("requiresNotification", "subjectsNotifiedAt");
