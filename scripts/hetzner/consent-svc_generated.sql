DO $$ BEGIN CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'REVOKED', 'EXPIRED', '@@map("consent_status")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ConsentType" AS ENUM ('COPPA', 'FERPA', 'MARKETING', 'DATA_SHARING', 'ANALYTICS', 'THIRD_PARTY', 'AI_FEATURES', 'COMMUNICATION', '@@map("consent_type_enum")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ConsentSource" AS ENUM ('PARENT_PORTAL', 'EMAIL_LINK', 'PAPER_FORM', 'IN_PERSON', 'BULK_IMPORT', 'SCHOOL_ADMIN', 'API', '@@map("consent_source")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Consent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "parent_id" UUID,
    "consent_type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING'::"ConsentStatus",
    "consented_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "consent_source" "ConsentSource" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "document_version" TEXT,
    "legal_guardian_name" TEXT,
    "relationship" TEXT,
    "signature_data" TEXT,
    "notes" TEXT,
    "metadataJson" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS "ConsentAuditLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "consent_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "performed_by" UUID NOT NULL,
    "performed_by_role" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "reason" TEXT,
    "metadataJson" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS "consent_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "parent_email" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "parental_consent_links" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "parent_email" TEXT NOT NULL,
    "consent_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "token" TEXT NOT NULL UNIQUE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "reminder_sent_at" TIMESTAMPTZ,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ConsentVerificationMethod" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "method_type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
    "config" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS "ConsentStatusCache" (
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "has_coppa_consent" BOOLEAN NOT NULL DEFAULT FALSE,
    "has_ferpa_consent" BOOLEAN NOT NULL DEFAULT FALSE,
    "has_marketing_consent" BOOLEAN NOT NULL DEFAULT FALSE,
    "has_data_sharing_consent" BOOLEAN NOT NULL DEFAULT FALSE,
    "has_ai_features" BOOLEAN NOT NULL DEFAULT FALSE,
    "consentSummary" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS "tenant_coppa_settings" (
    "tenant_id" UUID PRIMARY KEY,
    "require_verifiable_consent" BOOLEAN NOT NULL DEFAULT TRUE,
    "default_consent_expiry_days" INTEGER NOT NULL DEFAULT 365,
    "allowed_verification_methods" TEXT[] NOT NULL DEFAULT '["EMAIL", "PHONE"]',
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "reminder_days" INTEGER[] NOT NULL DEFAULT '[7, 3, 1]',
    "graceperiod_days" INTEGER NOT NULL DEFAULT 30,
    "custom_consent_document" TEXT,
    "custom_privacy_policy" TEXT,
    "notification_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);