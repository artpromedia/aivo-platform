-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'DATA_MODIFICATION', 'CONFIGURATION', 'SECURITY', 'COMPLIANCE', 'SYSTEM', 'USER_ACTION', 'API_ACCESS');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'PARTIAL', 'DENIED', 'ERROR');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('JSON', 'CSV', 'PARQUET');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" TEXT NOT NULL DEFAULT '1.0',
    "tenantId" UUID NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "outcome" "AuditOutcome" NOT NULL,
    "actorId" UUID,
    "actorType" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actorRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actorIpAddress" TEXT,
    "actorUserAgent" TEXT,
    "actorSessionId" UUID,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetName" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestId" TEXT,
    "requestMethod" TEXT,
    "requestPath" TEXT,
    "sourceService" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "previousState" JSONB,
    "newState" JSONB,
    "dataClassification" TEXT,
    "complianceFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retentionPolicy" TEXT,
    "checksum" TEXT NOT NULL,
    "previousHash" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAccessLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "accessorId" UUID NOT NULL,
    "accessorEmail" TEXT,
    "accessorRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessorIp" TEXT,
    "accessType" TEXT NOT NULL,
    "queryFilters" JSONB,
    "recordCount" INTEGER NOT NULL,
    "dataFromDate" TIMESTAMP(3),
    "dataToDate" TIMESTAMP(3),
    "requestId" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditExport" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "requestedByEmail" TEXT,
    "filters" JSONB NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "format" "ExportFormat" NOT NULL DEFAULT 'JSON',
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "recordCount" INTEGER,
    "fileSizeBytes" BIGINT,
    "fileUrl" TEXT,
    "checksum" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AuditExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPolicy" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventTypes" TEXT[],
    "categories" "AuditCategory"[],
    "minSeverity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "retentionDays" INTEGER NOT NULL DEFAULT 2555,
    "alertOnSeverity" "AuditSeverity",
    "alertWebhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,

    CONSTRAINT "AuditPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityCheckpoint" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "fromEventId" UUID NOT NULL,
    "toEventId" UUID NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAlert" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL,
    "sourceEventIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventType" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" UUID,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_eventId_key" ON "AuditLog"("eventId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_occurredAt_idx" ON "AuditLog"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_category_idx" ON "AuditLog"("tenantId", "category");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_eventType_idx" ON "AuditLog"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_actorId_idx" ON "AuditLog"("tenantId", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_targetType_targetId_idx" ON "AuditLog"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_severity_idx" ON "AuditLog"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_outcome_idx" ON "AuditLog"("tenantId", "outcome");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_checksum_idx" ON "AuditLog"("checksum");

-- CreateIndex
CREATE INDEX "AuditAccessLog_tenantId_accessedAt_idx" ON "AuditAccessLog"("tenantId", "accessedAt");

-- CreateIndex
CREATE INDEX "AuditAccessLog_tenantId_accessorId_idx" ON "AuditAccessLog"("tenantId", "accessorId");

-- CreateIndex
CREATE INDEX "AuditExport_tenantId_status_idx" ON "AuditExport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AuditExport_tenantId_requestedById_idx" ON "AuditExport"("tenantId", "requestedById");

-- CreateIndex
CREATE INDEX "AuditExport_tenantId_requestedAt_idx" ON "AuditExport"("tenantId", "requestedAt");

-- CreateIndex
CREATE INDEX "AuditExport_expiresAt_idx" ON "AuditExport"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditPolicy_tenantId_idx" ON "AuditPolicy"("tenantId");

-- CreateIndex
CREATE INDEX "AuditPolicy_isActive_idx" ON "AuditPolicy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPolicy_tenantId_name_key" ON "AuditPolicy"("tenantId", "name");

-- CreateIndex
CREATE INDEX "IntegrityCheckpoint_tenantId_createdAt_idx" ON "IntegrityCheckpoint"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrityCheckpoint_fromEventId_idx" ON "IntegrityCheckpoint"("fromEventId");

-- CreateIndex
CREATE INDEX "IntegrityCheckpoint_toEventId_idx" ON "IntegrityCheckpoint"("toEventId");

-- CreateIndex
CREATE INDEX "AuditAlert_tenantId_isAcknowledged_isResolved_idx" ON "AuditAlert"("tenantId", "isAcknowledged", "isResolved");

-- CreateIndex
CREATE INDEX "AuditAlert_tenantId_severity_idx" ON "AuditAlert"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "AuditAlert_tenantId_createdAt_idx" ON "AuditAlert"("tenantId", "createdAt");
