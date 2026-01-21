-- CreateEnum
CREATE TYPE "PilotProgramStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXTENDED', 'CONVERTING', 'CONVERTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PilotProgramType" AS ENUM ('DISTRICT_PILOT', 'NONPROFIT_PILOT', 'CHARTER_PILOT', 'ENTERPRISE_TRIAL', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('TRIAL_ENDING_14_DAYS', 'TRIAL_ENDING_7_DAYS', 'TRIAL_ENDING_48_HOURS', 'PILOT_ENDING_14_DAYS', 'PILOT_ENDING_7_DAYS', 'PILOT_ENDING_48_HOURS', 'PAYMENT_CHARGE_NOTICE', 'CONVERSION_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PromotionalPricingType" AS ENUM ('TRIAL_CONVERSION', 'PILOT_CONVERSION', 'FIRST_YEAR', 'LOYALTY', 'VOLUME', 'PARTNER', 'CAMPAIGN');

-- AlterTable
ALTER TABLE "vault_licenses" ADD COLUMN     "pilot_program_id" UUID;

-- CreateTable
CREATE TABLE "pilot_programs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "enterprise_customer_id" UUID,
    "enterprise_deal_id" UUID,
    "type" "PilotProgramType" NOT NULL,
    "status" "PilotProgramStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "seats" INTEGER NOT NULL,
    "seats_used" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "original_end_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "max_extensions" INTEGER NOT NULL DEFAULT 2,
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "features_json" JSONB,
    "success_criteria_json" JSONB,
    "has_payment_method_on_file" BOOLEAN NOT NULL DEFAULT false,
    "billing_instrument_id" UUID,
    "auto_convert_enabled" BOOLEAN NOT NULL DEFAULT false,
    "conversion_discount_pct" DOUBLE PRECISION,
    "conversion_price_per_seat_cents" INTEGER,
    "converted_contract_id" UUID,
    "converted_subscription_id" UUID,
    "converted_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pilot_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_extensions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pilot_id" UUID NOT NULL,
    "previous_end_date" DATE NOT NULL,
    "new_end_date" DATE NOT NULL,
    "reason" TEXT,
    "approved_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_reminders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "email_address" TEXT,
    "error_message" TEXT,
    "has_payment_method" BOOLEAN NOT NULL DEFAULT false,
    "charge_amount_cents" INTEGER,
    "trial_end_date" DATE NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "trial_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_reminders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pilot_id" UUID NOT NULL,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "email_address" TEXT,
    "error_message" TEXT,
    "has_payment_method" BOOLEAN NOT NULL DEFAULT false,
    "charge_amount_cents" INTEGER,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pilot_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotional_pricing" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionalPricingType" NOT NULL,
    "discount_percent" DOUBLE PRECISION,
    "discount_amount_cents" INTEGER,
    "price_per_seat_cents" INTEGER,
    "min_seats" INTEGER,
    "max_seats" INTEGER,
    "duration_months" INTEGER,
    "applicable_plans_json" JSONB,
    "applicable_customer_types_json" JSONB,
    "stripe_coupon_id" TEXT,
    "stripe_promotion_code_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" DATE,
    "valid_until" DATE,
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "promotional_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotional_pricing_redemptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pricing_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "contract_id" UUID,
    "pilot_program_id" UUID,
    "original_price_cents" INTEGER NOT NULL,
    "final_price_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL,
    "redeemed_by" UUID NOT NULL,
    "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "promotional_pricing_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pilot_programs_tenant_id_status_idx" ON "pilot_programs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pilot_programs_enterprise_customer_id_idx" ON "pilot_programs"("enterprise_customer_id");

-- CreateIndex
CREATE INDEX "pilot_programs_enterprise_deal_id_idx" ON "pilot_programs"("enterprise_deal_id");

-- CreateIndex
CREATE INDEX "pilot_programs_status_end_date_idx" ON "pilot_programs"("status", "end_date");

-- CreateIndex
CREATE INDEX "pilot_programs_end_date_idx" ON "pilot_programs"("end_date");

-- CreateIndex
CREATE INDEX "pilot_extensions_pilot_id_idx" ON "pilot_extensions"("pilot_id");

-- CreateIndex
CREATE INDEX "trial_reminders_subscription_id_idx" ON "trial_reminders"("subscription_id");

-- CreateIndex
CREATE INDEX "trial_reminders_tenant_id_user_id_idx" ON "trial_reminders"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "trial_reminders_status_scheduled_for_idx" ON "trial_reminders"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "trial_reminders_scheduled_for_idx" ON "trial_reminders"("scheduled_for");

-- CreateIndex
CREATE INDEX "pilot_reminders_pilot_id_idx" ON "pilot_reminders"("pilot_id");

-- CreateIndex
CREATE INDEX "pilot_reminders_status_scheduled_for_idx" ON "pilot_reminders"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "pilot_reminders_scheduled_for_idx" ON "pilot_reminders"("scheduled_for");

-- CreateIndex
CREATE INDEX "promotional_pricing_type_is_active_idx" ON "promotional_pricing"("type", "is_active");

-- CreateIndex
CREATE INDEX "promotional_pricing_is_active_valid_from_valid_until_idx" ON "promotional_pricing"("is_active", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "promotional_pricing_priority_idx" ON "promotional_pricing"("priority");

-- CreateIndex
CREATE INDEX "promotional_pricing_redemptions_pricing_id_idx" ON "promotional_pricing_redemptions"("pricing_id");

-- CreateIndex
CREATE INDEX "promotional_pricing_redemptions_tenant_id_idx" ON "promotional_pricing_redemptions"("tenant_id");

-- CreateIndex
CREATE INDEX "promotional_pricing_redemptions_subscription_id_idx" ON "promotional_pricing_redemptions"("subscription_id");

-- CreateIndex
CREATE INDEX "promotional_pricing_redemptions_contract_id_idx" ON "promotional_pricing_redemptions"("contract_id");

-- CreateIndex
CREATE INDEX "promotional_pricing_redemptions_pilot_program_id_idx" ON "promotional_pricing_redemptions"("pilot_program_id");

-- CreateIndex
CREATE INDEX "vault_licenses_pilot_program_id_idx" ON "vault_licenses"("pilot_program_id");

-- AddForeignKey
ALTER TABLE "vault_licenses" ADD CONSTRAINT "vault_licenses_pilot_program_id_fkey" FOREIGN KEY ("pilot_program_id") REFERENCES "pilot_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_extensions" ADD CONSTRAINT "pilot_extensions_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilot_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_reminders" ADD CONSTRAINT "pilot_reminders_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilot_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotional_pricing_redemptions" ADD CONSTRAINT "promotional_pricing_redemptions_pricing_id_fkey" FOREIGN KEY ("pricing_id") REFERENCES "promotional_pricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
