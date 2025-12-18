-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('SYSTEM', 'ACHIEVEMENT', 'REMINDER', 'GOAL_UPDATE', 'SESSION_SUMMARY', 'CONSENT_REQUEST', 'MESSAGE', 'ALERT');

-- CreateEnum
CREATE TYPE "delivery_channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "notification_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "parent_notification_category" AS ENUM ('EMOTIONAL_STATE', 'ACHIEVEMENT', 'SESSION_ACTIVITY', 'LEARNING_PROGRESS', 'SAFETY_CONCERN', 'CARE_TEAM', 'GOAL_UPDATE', 'SYSTEM', 'REMINDER');

-- CreateEnum
CREATE TYPE "parent_notification_urgency" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "parent_notification_status" AS ENUM ('PENDING', 'SCHEDULED', 'QUEUED_FOR_DIGEST', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'RATE_LIMITED');

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "type_preferences" JSONB NOT NULL DEFAULT '{}',
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "quiet_hours_timezone" TEXT,
    "digest_enabled" BOOLEAN NOT NULL DEFAULT false,
    "digest_frequency" TEXT,
    "digest_time" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_id" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "action_url" TEXT,
    "action_data" JSONB,
    "priority" "notification_priority" NOT NULL DEFAULT 'NORMAL',
    "expires_at" TIMESTAMPTZ,
    "group_key" TEXT,
    "collapse_key" TEXT,
    "source_type" TEXT,
    "source_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel" "delivery_channel" NOT NULL,
    "status" "delivery_status" NOT NULL DEFAULT 'PENDING',
    "provider_name" TEXT,
    "provider_message_id" TEXT,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "error_code" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMPTZ,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "template_key" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "channel" "delivery_channel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "title_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "image_url_template" TEXT,
    "action_url_template" TEXT,
    "email_subject" TEXT,
    "email_html_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "priority" "notification_priority" NOT NULL DEFAULT 'NORMAL',
    "template_key" TEXT,
    "template_data" JSONB,
    "title" TEXT,
    "body" TEXT,
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "channels" "delivery_channel"[],
    "processed_at" TIMESTAMPTZ,
    "notification_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_notification_preferences" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "urgency_settings" JSONB NOT NULL DEFAULT '{}',
    "category_settings" JSONB NOT NULL DEFAULT '{}',
    "preferred_channels" TEXT[] DEFAULT ARRAY['push', 'email']::TEXT[],
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_device_tokens" JSONB NOT NULL DEFAULT '[]',
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_address" TEXT,
    "email_format" TEXT NOT NULL DEFAULT 'html',
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_phone_number" TEXT,
    "sms_for_critical_only" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_badge_count" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT NOT NULL DEFAULT '21:00',
    "quiet_hours_end" TEXT NOT NULL DEFAULT '07:00',
    "quiet_hours_weekend_only" BOOLEAN NOT NULL DEFAULT false,
    "digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "digest_frequency" TEXT NOT NULL DEFAULT 'daily',
    "digest_time" TEXT NOT NULL DEFAULT '18:00',
    "digest_day_of_week" INTEGER DEFAULT 5,
    "digest_include_details" BOOLEAN NOT NULL DEFAULT true,
    "max_notifications_per_hour" INTEGER NOT NULL DEFAULT 5,
    "max_notifications_per_day" INTEGER NOT NULL DEFAULT 20,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 15,
    "language" TEXT NOT NULL DEFAULT 'en',
    "use_simple_language" BOOLEAN NOT NULL DEFAULT false,
    "include_action_items" BOOLEAN NOT NULL DEFAULT true,
    "include_resources" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "parent_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_notification_queue" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category" "parent_notification_category" NOT NULL,
    "urgency" "parent_notification_urgency" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rich_content" JSONB,
    "action_url" TEXT,
    "source_event" TEXT NOT NULL,
    "source_event_id" UUID,
    "related_session_id" UUID,
    "status" "parent_notification_status" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMPTZ,
    "digest_eligible" BOOLEAN NOT NULL DEFAULT true,
    "added_to_digest" BOOLEAN NOT NULL DEFAULT false,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "delivered_via" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "similar_notification_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "parent_notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_notification_digests" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "digest_type" TEXT NOT NULL,
    "notifications" JSONB NOT NULL DEFAULT '[]',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ,
    "sent_via" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_notification_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_notification_logs" (
    "id" UUID NOT NULL,
    "notification_id" UUID,
    "digest_id" UUID,
    "parent_id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL,
    "delivered_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ,
    "clicked_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "parent_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_user_id_idx" ON "notification_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_tenant_id_user_id_idx" ON "device_tokens"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "device_tokens_token_idx" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_recipient_id_created_at_idx" ON "notifications"("tenant_id", "recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_created_at_idx" ON "notifications"("recipient_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_group_key_idx" ON "notifications"("group_key");

-- CreateIndex
CREATE INDEX "notifications_expires_at_idx" ON "notifications"("expires_at");

-- CreateIndex
CREATE INDEX "delivery_logs_notification_id_idx" ON "delivery_logs"("notification_id");

-- CreateIndex
CREATE INDEX "delivery_logs_channel_status_idx" ON "delivery_logs"("channel", "status");

-- CreateIndex
CREATE INDEX "delivery_logs_status_next_retry_at_idx" ON "delivery_logs"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "notification_templates_template_key_channel_idx" ON "notification_templates"("template_key", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_template_key_channel_local_key" ON "notification_templates"("tenant_id", "template_key", "channel", "locale");

-- CreateIndex
CREATE INDEX "notification_queue_scheduled_for_processed_at_idx" ON "notification_queue"("scheduled_for", "processed_at");

-- CreateIndex
CREATE INDEX "notification_queue_tenant_id_recipient_id_idx" ON "notification_queue"("tenant_id", "recipient_id");

-- CreateIndex
CREATE INDEX "parent_notification_preferences_tenant_id_idx" ON "parent_notification_preferences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_notification_preferences_parent_id_learner_id_key" ON "parent_notification_preferences"("parent_id", "learner_id");

-- CreateIndex
CREATE INDEX "parent_notification_queue_parent_id_status_idx" ON "parent_notification_queue"("parent_id", "status");

-- CreateIndex
CREATE INDEX "parent_notification_queue_scheduled_for_idx" ON "parent_notification_queue"("scheduled_for");

-- CreateIndex
CREATE INDEX "parent_notification_queue_category_urgency_idx" ON "parent_notification_queue"("category", "urgency");

-- CreateIndex
CREATE INDEX "parent_notification_digests_parent_id_period_start_idx" ON "parent_notification_digests"("parent_id", "period_start");

-- CreateIndex
CREATE INDEX "parent_notification_digests_status_idx" ON "parent_notification_digests"("status");

-- CreateIndex
CREATE INDEX "parent_notification_logs_parent_id_idx" ON "parent_notification_logs"("parent_id");

-- CreateIndex
CREATE INDEX "parent_notification_logs_channel_status_idx" ON "parent_notification_logs"("channel", "status");

-- AddForeignKey
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
