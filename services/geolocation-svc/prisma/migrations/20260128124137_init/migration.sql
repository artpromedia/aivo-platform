-- CreateEnum
CREATE TYPE "symbol_position" AS ENUM ('BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "text_direction" AS ENUM ('LTR', 'RTL');

-- CreateEnum
CREATE TYPE "curriculum_type" AS ENUM ('NATIONAL', 'STATE_PROVINCIAL', 'INTERNATIONAL', 'PRIVATE');

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "code3" VARCHAR(3) NOT NULL,
    "numeric_code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "subregion" TEXT,
    "default_language" VARCHAR(10) NOT NULL,
    "default_currency" VARCHAR(3) NOT NULL,
    "default_curriculum" TEXT,
    "supported_languages" TEXT[],
    "supported_currencies" TEXT[],
    "supported_curricula" TEXT[],
    "timezones" TEXT[],
    "primary_timezone" TEXT,
    "date_format" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "time_format" TEXT NOT NULL DEFAULT '12h',
    "first_day_of_week" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_local_payment" BOOLEAN NOT NULL DEFAULT false,
    "requires_compliance" TEXT[],
    "dial_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT,
    "default_language" VARCHAR(10),
    "default_currency" VARCHAR(3),
    "default_curriculum" TEXT,
    "timezone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "numeric_code" VARCHAR(3),
    "name" TEXT NOT NULL,
    "name_plural" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "symbol_native" TEXT NOT NULL,
    "decimal_digits" INTEGER NOT NULL DEFAULT 2,
    "thousands_separator" TEXT NOT NULL DEFAULT ',',
    "decimal_separator" TEXT NOT NULL DEFAULT '.',
    "symbol_position" "symbol_position" NOT NULL DEFAULT 'BEFORE',
    "space_between" BOOLEAN NOT NULL DEFAULT false,
    "exchange_rate_to_usd" DECIMAL(18,8) NOT NULL DEFAULT 1.0,
    "exchange_rate_updated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT NOT NULL,
    "direction" "text_direction" NOT NULL DEFAULT 'LTR',
    "script" TEXT,
    "plural_categories" TEXT[],
    "base_language" VARCHAR(5),
    "translation_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_frameworks" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "countries" TEXT[],
    "regions" TEXT[],
    "type" "curriculum_type" NOT NULL,
    "governing_body" TEXT,
    "website" TEXT,
    "grade_levels" JSONB NOT NULL,
    "age_range_start" INTEGER NOT NULL,
    "age_range_end" INTEGER NOT NULL,
    "academic_year_start" TEXT,
    "academic_year_end" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT,
    "effective_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_regions" (
    "id" UUID NOT NULL,
    "provider_code" TEXT NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "supported_currencies" TEXT[],
    "supported_methods" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_requirements" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "countries" TEXT[],
    "data_residency_required" BOOLEAN NOT NULL DEFAULT false,
    "consent_required" BOOLEAN NOT NULL DEFAULT true,
    "deletion_required" BOOLEAN NOT NULL DEFAULT true,
    "portability_required" BOOLEAN NOT NULL DEFAULT true,
    "dpo_required" BOOLEAN NOT NULL DEFAULT false,
    "min_consent_age" INTEGER NOT NULL DEFAULT 13,
    "parental_consent_age" INTEGER NOT NULL DEFAULT 18,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_location_cache" (
    "id" UUID NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "region_code" VARCHAR(10),
    "city" TEXT,
    "timezone" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_location_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code3_key" ON "countries"("code3");

-- CreateIndex
CREATE INDEX "countries_region_idx" ON "countries"("region");

-- CreateIndex
CREATE INDEX "countries_is_active_idx" ON "countries"("is_active");

-- CreateIndex
CREATE INDEX "regions_country_code_idx" ON "regions"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "regions_country_code_code_key" ON "regions"("country_code", "code");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_frameworks_code_key" ON "curriculum_frameworks"("code");

-- CreateIndex
CREATE INDEX "curriculum_frameworks_countries_idx" ON "curriculum_frameworks"("countries");

-- CreateIndex
CREATE INDEX "payment_provider_regions_country_code_idx" ON "payment_provider_regions"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_regions_provider_code_country_code_key" ON "payment_provider_regions"("provider_code", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_requirements_code_key" ON "compliance_requirements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ip_location_cache_ip_hash_key" ON "ip_location_cache"("ip_hash");

-- CreateIndex
CREATE INDEX "ip_location_cache_expires_at_idx" ON "ip_location_cache"("expires_at");

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;
