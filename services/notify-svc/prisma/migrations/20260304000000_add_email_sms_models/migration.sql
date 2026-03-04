-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'DROPPED', 'FAILED', 'COMPLAINED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "email_provider" AS ENUM ('SENDGRID', 'SES', 'OONRUMAIL');

-- CreateEnum
CREATE TYPE "suppression_reason" AS ENUM ('HARD_BOUNCE', 'SOFT_BOUNCE', 'SPAM_COMPLAINT', 'UNSUBSCRIBED', 'INVALID_EMAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "email_category" AS ENUM ('TRANSACTIONAL', 'NOTIFICATION', 'MARKETING', 'BILLING', 'ADMIN');

-- CreateEnum
CREATE TYPE "sms_type" AS ENUM ('OTP', 'TRANSACTIONAL', 'REMINDER', 'ALERT', 'MARKETING', 'INBOUND');

-- CreateEnum
CREATE TYPE "sms_status" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'UNDELIVERED', 'FAILED', 'RECEIVED', 'READ', 'CANCELLED');

-- CreateEnum
CREATE TYPE "sms_consent_type" AS ENUM ('OPT_IN', 'OPT_OUT', 'IMPLICIT', 'EXPLICIT', 'DOUBLE_OPT_IN');

-- CreateEnum
CREATE TYPE "sms_consent_method" AS ENUM ('WEB_FORM', 'MOBILE_APP', 'SMS_KEYWORD', 'PAPER_FORM', 'API', 'IMPORTED');

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "to_email" TEXT NOT NULL,
    "to_user_id" UUID,
    "subject" TEXT NOT NULL,
    "template_name" TEXT,
    "category" "email_category" NOT NULL DEFAULT 'NOTIFICATION',
    "provider" "email_provider" NOT NULL,
    "message_id" TEXT,
    "status" "email_status" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "clicked_at" TIMESTAMPTZ,
    "bounced_at" TIMESTAMPTZ,
    "error_code" TEXT,
    "error_message" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "reason" "suppression_reason" NOT NULL,
    "source" TEXT NOT NULL,
    "original_message_id" TEXT,
    "bounce_type" TEXT,
    "bounce_sub_type" TEXT,
    "diagnostic_code" TEXT,
    "bounce_count" INTEGER NOT NULL DEFAULT 0,
    "spam_reported" BOOLEAN NOT NULL DEFAULT false,
    "synced_to_provider" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_clicks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clicked_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "transactional_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "marketing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "billing_enabled" BOOLEAN NOT NULL DEFAULT true,
    "digest_enabled" BOOLEAN NOT NULL DEFAULT false,
    "digest_frequency" TEXT,
    "digest_day_of_week" INTEGER,
    "digest_time" TEXT,
    "digest_timezone" TEXT,
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "category" "email_category" NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "description" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sendgrid_template_id" TEXT,
    "ses_template_arn" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "email_provider" NOT NULL,
    "event_id" TEXT,
    "event_type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message_id" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "processing_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "to_phone" TEXT NOT NULL,
    "from_phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "sms_type" NOT NULL,
    "segments" INTEGER NOT NULL DEFAULT 1,
    "encoding" TEXT,
    "provider" TEXT NOT NULL,
    "message_id" TEXT,
    "messaging_service_sid" TEXT,
    "status" "sms_status" NOT NULL DEFAULT 'QUEUED',
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error_code" TEXT,
    "error_message" TEXT,
    "price" DECIMAL(10,6),
    "price_currency" TEXT DEFAULT 'USD',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" TEXT NOT NULL,
    "user_id" UUID,
    "tenant_id" UUID NOT NULL,
    "consent_type" "sms_consent_type" NOT NULL,
    "consent_method" "sms_consent_method" NOT NULL,
    "sms_types" "sms_type"[],
    "consented_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "revoked_method" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "consent_text" TEXT,
    "document_ref" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sms_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "event_id" TEXT,
    "event_type" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "message_id" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "processing_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_phone_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" TEXT NOT NULL,
    "is_valid" BOOLEAN NOT NULL,
    "phone_type" TEXT,
    "carrier" TEXT,
    "country_code" TEXT,
    "national_format" TEXT,
    "carrier_name" TEXT,
    "carrier_type" TEXT,
    "mobile_country_code" TEXT,
    "mobile_network_code" TEXT,
    "error_code" TEXT,
    "last_lookup_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sms_phone_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_global_opt_outs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" TEXT NOT NULL,
    "opt_out_at" TIMESTAMPTZ NOT NULL,
    "opt_out_method" TEXT NOT NULL,
    "last_message_id" TEXT,
    "last_tenant_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_global_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: email_logs
CREATE INDEX "idx_email_logs_tenant_created" ON "email_logs"("tenant_id", "created_at" DESC);
CREATE INDEX "idx_email_logs_to_email_created" ON "email_logs"("to_email", "created_at" DESC);
CREATE INDEX "idx_email_logs_to_user" ON "email_logs"("to_user_id");
CREATE INDEX "idx_email_logs_message_id" ON "email_logs"("message_id");
CREATE INDEX "idx_email_logs_status" ON "email_logs"("status");
CREATE INDEX "idx_email_logs_template_created" ON "email_logs"("template_name", "created_at" DESC);

-- CreateIndex: email_suppressions
CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");
CREATE INDEX "idx_email_suppressions_reason" ON "email_suppressions"("reason");
CREATE INDEX "idx_email_suppressions_source" ON "email_suppressions"("source");
CREATE INDEX "idx_email_suppressions_expires" ON "email_suppressions"("expires_at");

-- CreateIndex: email_clicks
CREATE INDEX "idx_email_clicks_message_id" ON "email_clicks"("message_id");
CREATE INDEX "idx_email_clicks_email" ON "email_clicks"("email");
CREATE INDEX "idx_email_clicks_clicked_at" ON "email_clicks"("clicked_at" DESC);

-- CreateIndex: email_preferences
CREATE UNIQUE INDEX "email_preferences_tenant_id_user_id_key" ON "email_preferences"("tenant_id", "user_id");
CREATE INDEX "idx_email_preferences_tenant_user" ON "email_preferences"("tenant_id", "user_id");

-- CreateIndex: email_templates
CREATE UNIQUE INDEX "email_templates_tenant_id_name_locale_key" ON "email_templates"("tenant_id", "name", "locale");
CREATE INDEX "idx_email_templates_name_locale" ON "email_templates"("name", "locale");
CREATE INDEX "idx_email_templates_category" ON "email_templates"("category");

-- CreateIndex: email_webhook_events
CREATE INDEX "idx_email_webhook_provider_created" ON "email_webhook_events"("provider", "created_at" DESC);
CREATE INDEX "idx_email_webhook_email" ON "email_webhook_events"("email");
CREATE INDEX "idx_email_webhook_message_id" ON "email_webhook_events"("message_id");
CREATE INDEX "idx_email_webhook_event_type" ON "email_webhook_events"("event_type");

-- CreateIndex: sms_logs
CREATE INDEX "idx_sms_logs_tenant_created" ON "sms_logs"("tenant_id", "created_at" DESC);
CREATE INDEX "idx_sms_logs_to_phone_created" ON "sms_logs"("to_phone", "created_at" DESC);
CREATE INDEX "idx_sms_logs_user" ON "sms_logs"("user_id");
CREATE INDEX "idx_sms_logs_message_id" ON "sms_logs"("message_id");
CREATE INDEX "idx_sms_logs_status" ON "sms_logs"("status");
CREATE INDEX "idx_sms_logs_type" ON "sms_logs"("type");

-- CreateIndex: sms_consents
CREATE UNIQUE INDEX "sms_consents_phone_number_tenant_id_key" ON "sms_consents"("phone_number", "tenant_id");
CREATE INDEX "idx_sms_consents_phone" ON "sms_consents"("phone_number");
CREATE INDEX "idx_sms_consents_tenant_phone" ON "sms_consents"("tenant_id", "phone_number");
CREATE INDEX "idx_sms_consents_user" ON "sms_consents"("user_id");
CREATE INDEX "idx_sms_consents_active_expires" ON "sms_consents"("is_active", "expires_at");

-- CreateIndex: sms_webhook_events
CREATE INDEX "idx_sms_webhook_provider_created" ON "sms_webhook_events"("provider", "created_at" DESC);
CREATE INDEX "idx_sms_webhook_phone" ON "sms_webhook_events"("phone_number");
CREATE INDEX "idx_sms_webhook_message_id" ON "sms_webhook_events"("message_id");
CREATE INDEX "idx_sms_webhook_event_type" ON "sms_webhook_events"("event_type");

-- CreateIndex: sms_phone_cache
CREATE UNIQUE INDEX "sms_phone_cache_phone_number_key" ON "sms_phone_cache"("phone_number");
CREATE INDEX "idx_sms_phone_cache_valid" ON "sms_phone_cache"("is_valid");
CREATE INDEX "idx_sms_phone_cache_expires" ON "sms_phone_cache"("expires_at");

-- CreateIndex: sms_global_opt_outs
CREATE UNIQUE INDEX "sms_global_opt_outs_phone_number_key" ON "sms_global_opt_outs"("phone_number");
