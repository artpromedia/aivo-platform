-- CreateEnum
CREATE TYPE "SisProviderType" AS ENUM ('CLEVER', 'CLASSLINK', 'ONEROSTER_API', 'ONEROSTER_CSV', 'GOOGLE_WORKSPACE', 'MICROSOFT_ENTRA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "integration_status" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL', 'FAILURE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SisEntityType" AS ENUM ('SCHOOL', 'CLASS', 'TEACHER', 'STUDENT', 'ENROLLMENT');

-- CreateEnum
CREATE TYPE "external_user_role_hint" AS ENUM ('STUDENT', 'TEACHER', 'ADMINISTRATOR', 'AIDE', 'PARENT', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "external_enrollment_role" AS ENUM ('STUDENT', 'TEACHER', 'AIDE');

-- CreateEnum
CREATE TYPE "identity_conflict_type" AS ENUM ('EMAIL_MISMATCH', 'DUPLICATE_EMAIL', 'NAME_MISMATCH', 'ROLE_CONFLICT', 'MULTI_TENANT', 'ORPHANED_MAPPING', 'MERGE_CANDIDATE');

-- CreateEnum
CREATE TYPE "identity_conflict_status" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED_MERGED', 'RESOLVED_KEPT_SEPARATE', 'RESOLVED_MANUAL', 'DISMISSED');

-- CreateEnum
CREATE TYPE "relationship_type" AS ENUM ('PARENT', 'GUARDIAN', 'MOTHER', 'FATHER', 'STEPMOTHER', 'STEPFATHER', 'GRANDPARENT', 'AUNT', 'UNCLE', 'FOSTER_PARENT', 'OTHER');

-- CreateTable
CREATE TABLE "sis_providers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_type" "SisProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "config_json" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "integration_status" "integration_status" NOT NULL DEFAULT 'DISCONNECTED',
    "secrets_ref" VARCHAR(512),
    "sso_enabled" BOOLEAN NOT NULL DEFAULT false,
    "domain_filter" TEXT[],
    "auto_provision_users" BOOLEAN NOT NULL DEFAULT false,
    "auto_provision_learners" BOOLEAN NOT NULL DEFAULT false,
    "default_role" VARCHAR(50) NOT NULL DEFAULT 'TEACHER',
    "oauth_metadata" JSONB,
    "last_connection_check" TIMESTAMP(3),
    "connection_error" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "sync_schedule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_sync_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "stats_json" TEXT,
    "error_message" TEXT,
    "error_log" TEXT,
    "triggered_by" TEXT,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_raw_schools" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "raw_json" TEXT NOT NULL,
    "name" TEXT,
    "school_number" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "aivo_school_id" TEXT,
    "last_sync_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_raw_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_raw_classes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "school_external_id" TEXT,
    "raw_json" TEXT NOT NULL,
    "name" TEXT,
    "course_code" TEXT,
    "grade" TEXT,
    "subject" TEXT,
    "term_start" TIMESTAMP(3),
    "term_end" TIMESTAMP(3),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "aivo_classroom_id" TEXT,
    "last_sync_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_raw_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_raw_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "raw_json" TEXT NOT NULL,
    "sis_role" TEXT NOT NULL,
    "email" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "student_number" TEXT,
    "grade" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "aivo_user_id" TEXT,
    "last_sync_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_raw_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_raw_enrollments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_id" TEXT,
    "user_external_id" TEXT NOT NULL,
    "class_external_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "raw_json" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_raw_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_field_mappings" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "entity_type" "SisEntityType" NOT NULL,
    "source_field" TEXT NOT NULL,
    "target_field" TEXT NOT NULL,
    "transform_fn" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_sync_queue" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "entity_type" "SisEntityType" NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "process_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_school_mappings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_school_id" VARCHAR(512) NOT NULL,
    "aivo_school_id" UUID NOT NULL,
    "external_name" TEXT,
    "external_metadata" JSONB,
    "first_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_run_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_school_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_class_mappings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_class_id" VARCHAR(512) NOT NULL,
    "aivo_classroom_id" UUID NOT NULL,
    "external_school_id" VARCHAR(512),
    "external_name" TEXT,
    "external_metadata" JSONB,
    "first_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_run_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_class_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_user_mappings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_user_id" VARCHAR(512) NOT NULL,
    "aivo_user_id" UUID NOT NULL,
    "role_hint" "external_user_role_hint" NOT NULL,
    "aivo_learner_id" UUID,
    "external_email" VARCHAR(512),
    "external_username" VARCHAR(255),
    "student_number" VARCHAR(100),
    "staff_id" VARCHAR(100),
    "external_name" TEXT,
    "external_metadata" JSONB,
    "first_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_run_id" VARCHAR(255),
    "has_conflict" BOOLEAN NOT NULL DEFAULT false,
    "conflict_type" VARCHAR(100),
    "conflict_details" JSONB,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_user_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_enrollment_mappings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_enrollment_id" VARCHAR(512),
    "external_user_id" VARCHAR(512) NOT NULL,
    "external_class_id" VARCHAR(512) NOT NULL,
    "enrollment_role" "external_enrollment_role" NOT NULL,
    "aivo_user_id" UUID,
    "aivo_classroom_id" UUID,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "start_date" DATE,
    "end_date" DATE,
    "external_metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "first_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_run_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_enrollment_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_conflicts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "sync_run_id" VARCHAR(255),
    "conflict_type" "identity_conflict_type" NOT NULL,
    "status" "identity_conflict_status" NOT NULL DEFAULT 'OPEN',
    "severity" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "external_id_1" VARCHAR(512),
    "external_id_2" VARCHAR(512),
    "aivo_user_id_1" UUID,
    "aivo_user_id_2" UUID,
    "description" TEXT NOT NULL,
    "details_json" JSONB,
    "resolution_action" TEXT,
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_state" (
    "id" UUID NOT NULL,
    "state_token" VARCHAR(255) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" VARCHAR(255),
    "provider_type" VARCHAR(50) NOT NULL,
    "code_verifier" VARCHAR(255),
    "redirect_uri" TEXT,
    "nonce" VARCHAR(255),
    "initiated_by" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delta_sync_state" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "last_sync_time" TIMESTAMP(3) NOT NULL,
    "last_delta_token" TEXT,
    "last_full_sync_time" TIMESTAMP(3),
    "entity_cursors" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "error_message" TEXT,
    "stats" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delta_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "source_data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_errors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "source_value" JSONB,
    "target_value" JSONB,
    "source_system" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolved_value" JSONB,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student_relationships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "parent_external_id" TEXT NOT NULL,
    "student_external_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL DEFAULT 'guardian',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "legal_guardian" BOOLEAN NOT NULL DEFAULT true,
    "emergency_contact" BOOLEAN NOT NULL DEFAULT false,
    "pickup_authorized" BOOLEAN NOT NULL DEFAULT false,
    "receives_mailing" BOOLEAN NOT NULL DEFAULT true,
    "resides_with_student" BOOLEAN,
    "contact_priority" INTEGER,
    "source_system" TEXT,
    "source_id" TEXT,
    "source_hash" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_student_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_demographics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_external_id" TEXT NOT NULL,
    "race" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ethnicity" TEXT,
    "hispanic_latino" BOOLEAN,
    "language" TEXT,
    "home_language" TEXT,
    "country_of_birth" TEXT,
    "immigrant_status" BOOLEAN,
    "section_504" BOOLEAN,
    "iep" BOOLEAN,
    "ell" BOOLEAN,
    "homeless" BOOLEAN,
    "migrant" BOOLEAN,
    "free_reduced_lunch" TEXT,
    "source_system" TEXT,
    "source_id" TEXT,
    "source_hash" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_demographics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'semester',
    "school_year" INTEGER NOT NULL,
    "begin_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "parent_term_id" TEXT,
    "source_system" TEXT,
    "source_id" TEXT,
    "source_hash" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "webhook_secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_received_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_dead_letters" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sis_providers_tenant_id_idx" ON "sis_providers"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_providers_enabled_idx" ON "sis_providers"("enabled");

-- CreateIndex
CREATE INDEX "sis_providers_integration_status_idx" ON "sis_providers"("integration_status");

-- CreateIndex
CREATE UNIQUE INDEX "sis_providers_tenant_id_provider_type_key" ON "sis_providers"("tenant_id", "provider_type");

-- CreateIndex
CREATE INDEX "sis_sync_runs_tenant_id_idx" ON "sis_sync_runs"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_sync_runs_provider_id_idx" ON "sis_sync_runs"("provider_id");

-- CreateIndex
CREATE INDEX "sis_sync_runs_status_idx" ON "sis_sync_runs"("status");

-- CreateIndex
CREATE INDEX "sis_sync_runs_started_at_idx" ON "sis_sync_runs"("started_at");

-- CreateIndex
CREATE INDEX "sis_raw_schools_tenant_id_idx" ON "sis_raw_schools"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_raw_schools_provider_id_idx" ON "sis_raw_schools"("provider_id");

-- CreateIndex
CREATE INDEX "sis_raw_schools_processed_idx" ON "sis_raw_schools"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "sis_raw_schools_provider_id_external_id_key" ON "sis_raw_schools"("provider_id", "external_id");

-- CreateIndex
CREATE INDEX "sis_raw_classes_tenant_id_idx" ON "sis_raw_classes"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_raw_classes_provider_id_idx" ON "sis_raw_classes"("provider_id");

-- CreateIndex
CREATE INDEX "sis_raw_classes_school_external_id_idx" ON "sis_raw_classes"("school_external_id");

-- CreateIndex
CREATE INDEX "sis_raw_classes_processed_idx" ON "sis_raw_classes"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "sis_raw_classes_provider_id_external_id_key" ON "sis_raw_classes"("provider_id", "external_id");

-- CreateIndex
CREATE INDEX "sis_raw_users_tenant_id_idx" ON "sis_raw_users"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_raw_users_provider_id_idx" ON "sis_raw_users"("provider_id");

-- CreateIndex
CREATE INDEX "sis_raw_users_email_idx" ON "sis_raw_users"("email");

-- CreateIndex
CREATE INDEX "sis_raw_users_sis_role_idx" ON "sis_raw_users"("sis_role");

-- CreateIndex
CREATE INDEX "sis_raw_users_processed_idx" ON "sis_raw_users"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "sis_raw_users_provider_id_external_id_key" ON "sis_raw_users"("provider_id", "external_id");

-- CreateIndex
CREATE INDEX "sis_raw_enrollments_tenant_id_idx" ON "sis_raw_enrollments"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_raw_enrollments_provider_id_idx" ON "sis_raw_enrollments"("provider_id");

-- CreateIndex
CREATE INDEX "sis_raw_enrollments_user_external_id_idx" ON "sis_raw_enrollments"("user_external_id");

-- CreateIndex
CREATE INDEX "sis_raw_enrollments_class_external_id_idx" ON "sis_raw_enrollments"("class_external_id");

-- CreateIndex
CREATE INDEX "sis_raw_enrollments_processed_idx" ON "sis_raw_enrollments"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "sis_raw_enrollments_provider_id_user_external_id_class_exte_key" ON "sis_raw_enrollments"("provider_id", "user_external_id", "class_external_id");

-- CreateIndex
CREATE INDEX "sis_field_mappings_provider_id_idx" ON "sis_field_mappings"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "sis_field_mappings_provider_id_entity_type_target_field_key" ON "sis_field_mappings"("provider_id", "entity_type", "target_field");

-- CreateIndex
CREATE INDEX "sis_sync_queue_tenant_id_idx" ON "sis_sync_queue"("tenant_id");

-- CreateIndex
CREATE INDEX "sis_sync_queue_provider_id_idx" ON "sis_sync_queue"("provider_id");

-- CreateIndex
CREATE INDEX "sis_sync_queue_process_at_idx" ON "sis_sync_queue"("process_at");

-- CreateIndex
CREATE INDEX "sis_sync_queue_sync_run_id_idx" ON "sis_sync_queue"("sync_run_id");

-- CreateIndex
CREATE INDEX "external_school_mappings_tenant_id_idx" ON "external_school_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "external_school_mappings_provider_id_idx" ON "external_school_mappings"("provider_id");

-- CreateIndex
CREATE INDEX "external_school_mappings_external_school_id_idx" ON "external_school_mappings"("external_school_id");

-- CreateIndex
CREATE INDEX "external_school_mappings_aivo_school_id_idx" ON "external_school_mappings"("aivo_school_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_school_mappings_tenant_id_provider_id_external_sch_key" ON "external_school_mappings"("tenant_id", "provider_id", "external_school_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_school_mappings_tenant_id_provider_id_aivo_school__key" ON "external_school_mappings"("tenant_id", "provider_id", "aivo_school_id");

-- CreateIndex
CREATE INDEX "external_class_mappings_tenant_id_idx" ON "external_class_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "external_class_mappings_provider_id_idx" ON "external_class_mappings"("provider_id");

-- CreateIndex
CREATE INDEX "external_class_mappings_external_class_id_idx" ON "external_class_mappings"("external_class_id");

-- CreateIndex
CREATE INDEX "external_class_mappings_aivo_classroom_id_idx" ON "external_class_mappings"("aivo_classroom_id");

-- CreateIndex
CREATE INDEX "external_class_mappings_external_school_id_idx" ON "external_class_mappings"("external_school_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_class_mappings_tenant_id_provider_id_external_clas_key" ON "external_class_mappings"("tenant_id", "provider_id", "external_class_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_class_mappings_tenant_id_provider_id_aivo_classroo_key" ON "external_class_mappings"("tenant_id", "provider_id", "aivo_classroom_id");

-- CreateIndex
CREATE INDEX "external_user_mappings_tenant_id_idx" ON "external_user_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "external_user_mappings_provider_id_idx" ON "external_user_mappings"("provider_id");

-- CreateIndex
CREATE INDEX "external_user_mappings_external_user_id_idx" ON "external_user_mappings"("external_user_id");

-- CreateIndex
CREATE INDEX "external_user_mappings_aivo_user_id_idx" ON "external_user_mappings"("aivo_user_id");

-- CreateIndex
CREATE INDEX "external_user_mappings_external_email_idx" ON "external_user_mappings"("external_email");

-- CreateIndex
CREATE INDEX "external_user_mappings_role_hint_idx" ON "external_user_mappings"("role_hint");

-- CreateIndex
CREATE INDEX "external_user_mappings_aivo_learner_id_idx" ON "external_user_mappings"("aivo_learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_user_mappings_tenant_id_provider_id_external_user__key" ON "external_user_mappings"("tenant_id", "provider_id", "external_user_id");

-- CreateIndex
CREATE INDEX "external_enrollment_mappings_tenant_id_idx" ON "external_enrollment_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "external_enrollment_mappings_provider_id_idx" ON "external_enrollment_mappings"("provider_id");

-- CreateIndex
CREATE INDEX "external_enrollment_mappings_external_user_id_idx" ON "external_enrollment_mappings"("external_user_id");

-- CreateIndex
CREATE INDEX "external_enrollment_mappings_external_class_id_idx" ON "external_enrollment_mappings"("external_class_id");

-- CreateIndex
CREATE INDEX "external_enrollment_mappings_enrollment_role_idx" ON "external_enrollment_mappings"("enrollment_role");

-- CreateIndex
CREATE UNIQUE INDEX "external_enrollment_mappings_tenant_id_provider_id_external_key" ON "external_enrollment_mappings"("tenant_id", "provider_id", "external_user_id", "external_class_id");

-- CreateIndex
CREATE INDEX "identity_conflicts_tenant_id_idx" ON "identity_conflicts"("tenant_id");

-- CreateIndex
CREATE INDEX "identity_conflicts_provider_id_idx" ON "identity_conflicts"("provider_id");

-- CreateIndex
CREATE INDEX "identity_conflicts_status_idx" ON "identity_conflicts"("status");

-- CreateIndex
CREATE INDEX "identity_conflicts_conflict_type_idx" ON "identity_conflicts"("conflict_type");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_state_state_token_key" ON "oauth_state"("state_token");

-- CreateIndex
CREATE INDEX "oauth_state_state_token_idx" ON "oauth_state"("state_token");

-- CreateIndex
CREATE INDEX "oauth_state_expires_at_idx" ON "oauth_state"("expires_at");

-- CreateIndex
CREATE INDEX "delta_sync_state_tenant_id_idx" ON "delta_sync_state"("tenant_id");

-- CreateIndex
CREATE INDEX "delta_sync_state_provider_id_idx" ON "delta_sync_state"("provider_id");

-- CreateIndex
CREATE INDEX "delta_sync_state_status_idx" ON "delta_sync_state"("status");

-- CreateIndex
CREATE UNIQUE INDEX "delta_sync_state_tenant_id_provider_id_key" ON "delta_sync_state"("tenant_id", "provider_id");

-- CreateIndex
CREATE INDEX "sync_history_tenant_id_idx" ON "sync_history"("tenant_id");

-- CreateIndex
CREATE INDEX "sync_history_entity_type_idx" ON "sync_history"("entity_type");

-- CreateIndex
CREATE INDEX "sync_history_entity_id_idx" ON "sync_history"("entity_id");

-- CreateIndex
CREATE INDEX "sync_history_timestamp_idx" ON "sync_history"("timestamp");

-- CreateIndex
CREATE INDEX "sync_errors_tenant_id_idx" ON "sync_errors"("tenant_id");

-- CreateIndex
CREATE INDEX "sync_errors_entity_type_idx" ON "sync_errors"("entity_type");

-- CreateIndex
CREATE INDEX "sync_errors_timestamp_idx" ON "sync_errors"("timestamp");

-- CreateIndex
CREATE INDEX "sync_conflicts_tenant_id_idx" ON "sync_conflicts"("tenant_id");

-- CreateIndex
CREATE INDEX "sync_conflicts_entity_type_idx" ON "sync_conflicts"("entity_type");

-- CreateIndex
CREATE INDEX "sync_conflicts_status_idx" ON "sync_conflicts"("status");

-- CreateIndex
CREATE INDEX "parent_student_relationships_tenant_id_idx" ON "parent_student_relationships"("tenant_id");

-- CreateIndex
CREATE INDEX "parent_student_relationships_parent_external_id_idx" ON "parent_student_relationships"("parent_external_id");

-- CreateIndex
CREATE INDEX "parent_student_relationships_student_external_id_idx" ON "parent_student_relationships"("student_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_relationships_tenant_id_parent_external_id_s_key" ON "parent_student_relationships"("tenant_id", "parent_external_id", "student_external_id");

-- CreateIndex
CREATE INDEX "student_demographics_tenant_id_idx" ON "student_demographics"("tenant_id");

-- CreateIndex
CREATE INDEX "student_demographics_student_external_id_idx" ON "student_demographics"("student_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_demographics_tenant_id_student_external_id_key" ON "student_demographics"("tenant_id", "student_external_id");

-- CreateIndex
CREATE INDEX "academic_terms_tenant_id_idx" ON "academic_terms"("tenant_id");

-- CreateIndex
CREATE INDEX "academic_terms_school_year_idx" ON "academic_terms"("school_year");

-- CreateIndex
CREATE INDEX "academic_terms_type_idx" ON "academic_terms"("type");

-- CreateIndex
CREATE INDEX "webhook_configs_tenant_id_idx" ON "webhook_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_configs_enabled_idx" ON "webhook_configs"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_configs_tenant_id_provider_id_key" ON "webhook_configs"("tenant_id", "provider_id");

-- CreateIndex
CREATE INDEX "webhook_logs_tenant_id_idx" ON "webhook_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_logs_event_id_idx" ON "webhook_logs"("event_id");

-- CreateIndex
CREATE INDEX "webhook_logs_processed_at_idx" ON "webhook_logs"("processed_at");

-- CreateIndex
CREATE INDEX "webhook_dead_letters_provider_idx" ON "webhook_dead_letters"("provider");

-- CreateIndex
CREATE INDEX "webhook_dead_letters_retry_count_idx" ON "webhook_dead_letters"("retry_count");

-- CreateIndex
CREATE INDEX "webhook_dead_letters_created_at_idx" ON "webhook_dead_letters"("created_at");

-- AddForeignKey
ALTER TABLE "sis_sync_runs" ADD CONSTRAINT "sis_sync_runs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_raw_schools" ADD CONSTRAINT "sis_raw_schools_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_raw_classes" ADD CONSTRAINT "sis_raw_classes_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_raw_users" ADD CONSTRAINT "sis_raw_users_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_raw_enrollments" ADD CONSTRAINT "sis_raw_enrollments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_field_mappings" ADD CONSTRAINT "sis_field_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_school_mappings" ADD CONSTRAINT "external_school_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_class_mappings" ADD CONSTRAINT "external_class_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_user_mappings" ADD CONSTRAINT "external_user_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_enrollment_mappings" ADD CONSTRAINT "external_enrollment_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_conflicts" ADD CONSTRAINT "identity_conflicts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sis_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
