/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,learner_id]` on the table `learner_story_preferences` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `learner_story_preferences` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "review_decision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ingestion_job_status" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ingestion_source" AS ENUM ('MANUAL', 'FILE_CSV', 'FILE_JSON', 'AI_DRAFT');

-- CreateEnum
CREATE TYPE "content_package_status" AS ENUM ('PENDING', 'BUILDING', 'READY', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "content_locale" AS ENUM ('en', 'es', 'fr', 'zh', 'ar');

-- CreateEnum
CREATE TYPE "file_category" AS ENUM ('IEP_DOCUMENT', 'HOMEWORK_IMAGE', 'ASSESSMENT_AUDIO', 'ASSESSMENT_VIDEO', 'AVATAR_IMAGE', 'EXPORTED_REPORT', 'ATTACHMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "file_owner_type" AS ENUM ('USER', 'SYSTEM', 'TENANT');

-- CreateEnum
CREATE TYPE "virus_scan_status" AS ENUM ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "sensory_category" AS ENUM ('HYPOSENSITIVE', 'TYPICAL', 'HYPERSENSITIVE', 'AVOIDING');

-- CreateEnum
CREATE TYPE "sensory_warning_level" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "visual_complexity" AS ENUM ('SIMPLE', 'MODERATE', 'COMPLEX');

-- CreateEnum
CREATE TYPE "animation_intensity" AS ENUM ('NONE', 'MILD', 'MODERATE', 'INTENSE');

-- CreateEnum
CREATE TYPE "cognitive_load_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "incident_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "incident_status" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "lesson_status" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "learning_object_skills" DROP CONSTRAINT "learning_object_skills_learning_object_version_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_object_tags" DROP CONSTRAINT "learning_object_tags_learning_object_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_object_version_transitions" DROP CONSTRAINT "learning_object_version_transitions_version_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_object_versions" DROP CONSTRAINT "learning_object_versions_learning_object_id_fkey";

-- DropIndex
DROP INDEX "learner_story_preferences_learner_id_key";

-- DropIndex
DROP INDEX "idx_lot_lo";

-- AlterTable
ALTER TABLE "learner_story_preferences" ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learning_object_skills" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learning_object_tags" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learning_object_version_transitions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learning_object_versions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learning_objects" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "social_stories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "grade_bands" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "social_story_assignments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "social_story_views" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "learning_object_reviews" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "decision" "review_decision" NOT NULL,
    "comments" TEXT,
    "validation_errors" JSONB NOT NULL DEFAULT '[]',
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_object_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "source" "ingestion_source" NOT NULL,
    "status" "ingestion_job_status" NOT NULL DEFAULT 'PENDING',
    "input_file_url" TEXT,
    "input_metadata" JSONB NOT NULL DEFAULT '{}',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_lo_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "errors" JSONB NOT NULL DEFAULT '[]',
    "created_by_user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_packages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "grade_bands" "learning_object_grade_band"[],
    "subjects" "learning_object_subject"[],
    "locales" "content_locale"[] DEFAULT ARRAY['en']::"content_locale"[],
    "status" "content_package_status" NOT NULL DEFAULT 'PENDING',
    "manifest_url" TEXT,
    "bundle_url" TEXT,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_size_bytes" BIGINT NOT NULL DEFAULT 0,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "requested_by_user_id" UUID NOT NULL,
    "error_message" TEXT,
    "url_expiration_hours" INTEGER NOT NULL DEFAULT 24,
    "updated_since" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_version_changes" (
    "id" UUID NOT NULL,
    "lo_version_id" UUID NOT NULL,
    "learning_object_id" UUID NOT NULL,
    "tenant_id" UUID,
    "subject" "learning_object_subject" NOT NULL,
    "grade_band" "learning_object_grade_band" NOT NULL,
    "version_number" INTEGER NOT NULL,
    "change_type" TEXT NOT NULL,
    "checksum" TEXT,
    "size_bytes" BIGINT,
    "locale" "content_locale" NOT NULL DEFAULT 'en',
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_version_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "owner_type" "file_owner_type" NOT NULL DEFAULT 'USER',
    "category" "file_category" NOT NULL DEFAULT 'OTHER',
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "s3_bucket" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_region" TEXT,
    "virus_scan_status" "virus_scan_status" NOT NULL DEFAULT 'PENDING',
    "virus_scanned_at" TIMESTAMPTZ,
    "virus_scan_result" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_user_id" UUID,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sensory_metadata" (
    "id" UUID NOT NULL,
    "learning_object_version_id" UUID NOT NULL,
    "has_audio" BOOLEAN NOT NULL DEFAULT false,
    "has_sudden_sounds" BOOLEAN NOT NULL DEFAULT false,
    "has_background_music" BOOLEAN NOT NULL DEFAULT false,
    "audio_level" INTEGER NOT NULL DEFAULT 5,
    "peak_volume" INTEGER,
    "can_mute_audio" BOOLEAN NOT NULL DEFAULT true,
    "has_flashing" BOOLEAN NOT NULL DEFAULT false,
    "flash_frequency" DOUBLE PRECISION,
    "visual_complexity" "visual_complexity" NOT NULL DEFAULT 'MODERATE',
    "has_vibrant_colors" BOOLEAN NOT NULL DEFAULT false,
    "contrast_level" INTEGER NOT NULL DEFAULT 5,
    "has_animation" BOOLEAN NOT NULL DEFAULT false,
    "animation_intensity" "animation_intensity" NOT NULL DEFAULT 'NONE',
    "animation_reducible" BOOLEAN NOT NULL DEFAULT true,
    "has_quick_motion" BOOLEAN NOT NULL DEFAULT false,
    "requires_fine_touch_input" BOOLEAN NOT NULL DEFAULT false,
    "has_haptic_feedback" BOOLEAN NOT NULL DEFAULT false,
    "can_disable_haptic" BOOLEAN NOT NULL DEFAULT true,
    "cognitive_load" "cognitive_load_level" NOT NULL DEFAULT 'MEDIUM',
    "has_time_limits" BOOLEAN NOT NULL DEFAULT false,
    "time_limits_adjustable" BOOLEAN NOT NULL DEFAULT true,
    "requires_quick_reactions" BOOLEAN NOT NULL DEFAULT false,
    "has_scrolling" BOOLEAN NOT NULL DEFAULT false,
    "has_parallax" BOOLEAN NOT NULL DEFAULT false,
    "overall_intensity_score" INTEGER NOT NULL DEFAULT 5,
    "sensory_warnings" JSONB NOT NULL DEFAULT '[]',
    "suitable_for_photosensitive" BOOLEAN NOT NULL DEFAULT true,
    "suitable_for_audio_sensitive" BOOLEAN NOT NULL DEFAULT true,
    "suitable_for_motion_sensitive" BOOLEAN NOT NULL DEFAULT true,
    "last_analyzed_at" TIMESTAMPTZ,
    "analyzed_by_system" BOOLEAN NOT NULL DEFAULT false,
    "manually_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_sensory_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_sensory_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "audio_sensitivity" INTEGER NOT NULL DEFAULT 5,
    "audio_category" "sensory_category" NOT NULL DEFAULT 'TYPICAL',
    "prefers_no_sudden_sounds" BOOLEAN NOT NULL DEFAULT false,
    "max_volume" INTEGER NOT NULL DEFAULT 100,
    "prefers_quiet_environment" BOOLEAN NOT NULL DEFAULT false,
    "visual_sensitivity" INTEGER NOT NULL DEFAULT 5,
    "visual_category" "sensory_category" NOT NULL DEFAULT 'TYPICAL',
    "avoids_flashing" BOOLEAN NOT NULL DEFAULT false,
    "prefers_simple_visuals" BOOLEAN NOT NULL DEFAULT false,
    "preferred_brightness" INTEGER NOT NULL DEFAULT 80,
    "preferred_contrast" TEXT NOT NULL DEFAULT 'normal',
    "motion_sensitivity" INTEGER NOT NULL DEFAULT 5,
    "motion_category" "sensory_category" NOT NULL DEFAULT 'TYPICAL',
    "prefers_reduced_motion" BOOLEAN NOT NULL DEFAULT false,
    "preferred_animation_speed" TEXT NOT NULL DEFAULT 'normal',
    "avoids_parallax" BOOLEAN NOT NULL DEFAULT false,
    "tactile_sensitivity" INTEGER NOT NULL DEFAULT 5,
    "tactile_category" "sensory_category" NOT NULL DEFAULT 'TYPICAL',
    "prefers_no_haptic" BOOLEAN NOT NULL DEFAULT false,
    "processing_speed" TEXT NOT NULL DEFAULT 'normal',
    "preferred_pacing" TEXT NOT NULL DEFAULT 'normal',
    "needs_extended_time" BOOLEAN NOT NULL DEFAULT false,
    "time_extension_factor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_photosensitive" BOOLEAN NOT NULL DEFAULT false,
    "photosensitivity_level" INTEGER,
    "needs_frequent_breaks" BOOLEAN NOT NULL DEFAULT false,
    "preferred_break_frequency" TEXT NOT NULL DEFAULT 'normal',
    "preferred_text_size" TEXT NOT NULL DEFAULT 'normal',
    "prefers_dyslexia_font" BOOLEAN NOT NULL DEFAULT false,
    "typical_environment" TEXT NOT NULL DEFAULT 'mixed',
    "profile_source" TEXT NOT NULL DEFAULT 'manual',
    "last_assessed_at" TIMESTAMPTZ,
    "assessment_version" TEXT,
    "parent_confirmed_at" TIMESTAMPTZ,
    "parent_confirmed_by_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learner_sensory_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensory_incidents" (
    "id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "profile_id" UUID,
    "tenant_id" UUID NOT NULL,
    "content_id" UUID,
    "content_type" TEXT,
    "content_title" TEXT,
    "session_id" UUID,
    "activity_id" UUID,
    "incident_type" TEXT NOT NULL,
    "severity" "incident_severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "incident_status" NOT NULL DEFAULT 'REPORTED',
    "trigger_category" TEXT NOT NULL,
    "trigger_description" TEXT,
    "trigger_timestamp" TIMESTAMPTZ,
    "reported_by_user_id" UUID,
    "reported_by_role" TEXT,
    "user_description" TEXT,
    "system_detected" BOOLEAN NOT NULL DEFAULT false,
    "detection_method" TEXT,
    "detection_confidence" DOUBLE PRECISION,
    "behavioral_signals" JSONB NOT NULL DEFAULT '[]',
    "resolved_at" TIMESTAMPTZ,
    "resolved_by_user_id" UUID,
    "resolution_notes" TEXT,
    "actions_taken" JSONB NOT NULL DEFAULT '[]',
    "profile_updated" BOOLEAN NOT NULL DEFAULT false,
    "content_flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sensory_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_drafts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "learning_object_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" "lesson_status" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID NOT NULL,
    "last_modified_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "published_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "lesson_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_versions" (
    "id" UUID NOT NULL,
    "lesson_draft_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(50) NOT NULL,
    "grade_band" VARCHAR(50) NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "thumbnail_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lesson_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_object_reviews_version_id_created_at_idx" ON "learning_object_reviews"("version_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "learning_object_reviews_reviewer_user_id_idx" ON "learning_object_reviews"("reviewer_user_id");

-- CreateIndex
CREATE INDEX "ingestion_jobs_tenant_id_status_idx" ON "ingestion_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_tenant_id_created_at_idx" ON "ingestion_jobs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ingestion_jobs_created_by_user_id_idx" ON "ingestion_jobs"("created_by_user_id");

-- CreateIndex
CREATE INDEX "content_packages_tenant_id_status_idx" ON "content_packages"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "content_packages_tenant_id_requested_at_idx" ON "content_packages"("tenant_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "content_version_changes_tenant_id_changed_at_idx" ON "content_version_changes"("tenant_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "content_version_changes_tenant_id_subject_grade_band_change_idx" ON "content_version_changes"("tenant_id", "subject", "grade_band", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "stored_files_tenant_id_owner_id_category_idx" ON "stored_files"("tenant_id", "owner_id", "category");

-- CreateIndex
CREATE INDEX "stored_files_tenant_id_category_created_at_idx" ON "stored_files"("tenant_id", "category", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stored_files_tenant_id_virus_scan_status_idx" ON "stored_files"("tenant_id", "virus_scan_status");

-- CreateIndex
CREATE INDEX "stored_files_s3_key_idx" ON "stored_files" USING HASH ("s3_key");

-- CreateIndex
CREATE INDEX "stored_files_tenant_id_is_deleted_expires_at_idx" ON "stored_files"("tenant_id", "is_deleted", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_sensory_metadata_learning_object_version_id_key" ON "content_sensory_metadata"("learning_object_version_id");

-- CreateIndex
CREATE INDEX "content_sensory_metadata_overall_intensity_score_idx" ON "content_sensory_metadata"("overall_intensity_score");

-- CreateIndex
CREATE INDEX "content_sensory_metadata_suitable_for_photosensitive_suitab_idx" ON "content_sensory_metadata"("suitable_for_photosensitive", "suitable_for_audio_sensitive", "suitable_for_motion_sensitive");

-- CreateIndex
CREATE INDEX "learner_sensory_profiles_tenant_id_idx" ON "learner_sensory_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "learner_sensory_profiles_audio_category_visual_category_mot_idx" ON "learner_sensory_profiles"("audio_category", "visual_category", "motion_category");

-- CreateIndex
CREATE UNIQUE INDEX "learner_sensory_profiles_tenant_id_learner_id_key" ON "learner_sensory_profiles"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "sensory_incidents_learner_id_created_at_idx" ON "sensory_incidents"("learner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sensory_incidents_tenant_id_created_at_idx" ON "sensory_incidents"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sensory_incidents_content_id_idx" ON "sensory_incidents"("content_id");

-- CreateIndex
CREATE INDEX "sensory_incidents_status_severity_idx" ON "sensory_incidents"("status", "severity");

-- CreateIndex
CREATE INDEX "sensory_incidents_profile_id_idx" ON "sensory_incidents"("profile_id");

-- CreateIndex
CREATE INDEX "lesson_drafts_tenant_id_idx" ON "lesson_drafts"("tenant_id");

-- CreateIndex
CREATE INDEX "lesson_drafts_learning_object_id_idx" ON "lesson_drafts"("learning_object_id");

-- CreateIndex
CREATE INDEX "lesson_drafts_status_idx" ON "lesson_drafts"("status");

-- CreateIndex
CREATE INDEX "lesson_drafts_created_by_id_idx" ON "lesson_drafts"("created_by_id");

-- CreateIndex
CREATE INDEX "lesson_drafts_last_modified_by_id_idx" ON "lesson_drafts"("last_modified_by_id");

-- CreateIndex
CREATE INDEX "lesson_versions_lesson_draft_id_idx" ON "lesson_versions"("lesson_draft_id");

-- CreateIndex
CREATE INDEX "lesson_versions_is_published_idx" ON "lesson_versions"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_versions_lesson_draft_id_version_number_key" ON "lesson_versions"("lesson_draft_id", "version_number");

-- CreateIndex
CREATE INDEX "lesson_templates_tenant_id_idx" ON "lesson_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "lesson_templates_category_idx" ON "lesson_templates"("category");

-- CreateIndex
CREATE INDEX "lesson_templates_subject_idx" ON "lesson_templates"("subject");

-- CreateIndex
CREATE INDEX "lesson_templates_grade_band_idx" ON "lesson_templates"("grade_band");

-- CreateIndex
CREATE INDEX "lesson_templates_is_active_idx" ON "lesson_templates"("is_active");

-- CreateIndex
CREATE INDEX "learner_story_preferences_tenant_id_learner_id_idx" ON "learner_story_preferences"("tenant_id", "learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_story_preferences_tenant_id_learner_id_key" ON "learner_story_preferences"("tenant_id", "learner_id");

-- CreateIndex
CREATE INDEX "learning_object_versions_state_idx" ON "learning_object_versions"("state");

-- CreateIndex
CREATE INDEX "learning_objects_tenant_id_subject_grade_band_idx" ON "learning_objects"("tenant_id", "subject", "grade_band");

-- CreateIndex
CREATE INDEX "learning_objects_primary_skill_id_idx" ON "learning_objects"("primary_skill_id");

-- AddForeignKey
ALTER TABLE "learning_object_versions" ADD CONSTRAINT "learning_object_versions_learning_object_id_fkey" FOREIGN KEY ("learning_object_id") REFERENCES "learning_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_object_tags" ADD CONSTRAINT "learning_object_tags_learning_object_id_fkey" FOREIGN KEY ("learning_object_id") REFERENCES "learning_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_object_skills" ADD CONSTRAINT "learning_object_skills_learning_object_version_id_fkey" FOREIGN KEY ("learning_object_version_id") REFERENCES "learning_object_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_object_version_transitions" ADD CONSTRAINT "learning_object_version_transitions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "learning_object_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_object_reviews" ADD CONSTRAINT "learning_object_reviews_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "learning_object_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sensory_metadata" ADD CONSTRAINT "content_sensory_metadata_learning_object_version_id_fkey" FOREIGN KEY ("learning_object_version_id") REFERENCES "learning_object_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensory_incidents" ADD CONSTRAINT "sensory_incidents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "learner_sensory_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_drafts" ADD CONSTRAINT "lesson_drafts_learning_object_id_fkey" FOREIGN KEY ("learning_object_id") REFERENCES "learning_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_draft_id_fkey" FOREIGN KEY ("lesson_draft_id") REFERENCES "lesson_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_los_skill" RENAME TO "learning_object_skills_skill_id_idx";

-- RenameIndex
ALTER INDEX "uq_los_version_skill" RENAME TO "learning_object_skills_learning_object_version_id_skill_id_key";

-- RenameIndex
ALTER INDEX "idx_lot_tag" RENAME TO "learning_object_tags_tag_idx";

-- RenameIndex
ALTER INDEX "uq_lot_lo_tag" RENAME TO "learning_object_tags_learning_object_id_tag_key";

-- RenameIndex
ALTER INDEX "idx_lovt_version" RENAME TO "learning_object_version_transitions_version_id_transitioned_idx";

-- RenameIndex
ALTER INDEX "idx_lov_lo_state_version" RENAME TO "learning_object_versions_learning_object_id_state_version_n_idx";

-- RenameIndex
ALTER INDEX "uq_lov_lo_version" RENAME TO "learning_object_versions_learning_object_id_version_number_key";

-- RenameIndex
ALTER INDEX "uq_learning_objects_tenant_slug" RENAME TO "learning_objects_tenant_id_slug_key";

-- RenameIndex
ALTER INDEX "social_stories_category_builtin_active_idx" RENAME TO "social_stories_category_is_built_in_is_active_idx";

-- RenameIndex
ALTER INDEX "social_stories_tenant_active_reading_level_idx" RENAME TO "social_stories_tenant_id_is_active_reading_level_idx";

-- RenameIndex
ALTER INDEX "social_stories_tenant_category_active_idx" RENAME TO "social_stories_tenant_id_category_is_active_idx";

-- RenameIndex
ALTER INDEX "social_story_assignments_learner_active_idx" RENAME TO "social_story_assignments_learner_id_is_active_idx";

-- RenameIndex
ALTER INDEX "social_story_assignments_learner_active_priority_idx" RENAME TO "social_story_assignments_learner_id_is_active_priority_idx";

-- RenameIndex
ALTER INDEX "social_story_views_learner_story_idx" RENAME TO "social_story_views_learner_id_story_id_idx";

-- RenameIndex
ALTER INDEX "social_story_views_learner_viewed_at_idx" RENAME TO "social_story_views_learner_id_viewed_at_idx";

-- RenameIndex
ALTER INDEX "social_story_views_story_viewed_at_idx" RENAME TO "social_story_views_story_id_viewed_at_idx";
