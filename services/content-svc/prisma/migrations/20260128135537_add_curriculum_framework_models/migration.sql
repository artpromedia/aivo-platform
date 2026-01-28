-- CreateEnum
CREATE TYPE "curriculum_framework_code" AS ENUM ('COMMON_CORE', 'NGSS', 'C3', 'TEKS', 'UK_NATIONAL_CURRICULUM', 'CURRICULUM_FOR_EXCELLENCE', 'CURRICULUM_WALES', 'IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY', 'AUSTRALIAN_CURRICULUM', 'NEW_ZEALAND_CURRICULUM', 'CBSE', 'ICSE', 'STATE_BOARD_INDIA', 'CHINA_NATIONAL_CURRICULUM', 'UAE_MOE', 'ADEK', 'SAUDI_MOE', 'CAPS', 'ONTARIO_CURRICULUM', 'ALBERTA_PROGRAM', 'BC_CURRICULUM', 'QUEBEC_QEP');

-- CreateEnum
CREATE TYPE "standardized_subject" AS ENUM ('MATHEMATICS', 'ENGLISH_LANGUAGE_ARTS', 'SCIENCE', 'SOCIAL_STUDIES', 'WORLD_LANGUAGES', 'ENGLISH_AS_ADDITIONAL_LANGUAGE', 'VISUAL_ARTS', 'PERFORMING_ARTS', 'MUSIC', 'PHYSICAL_EDUCATION', 'HEALTH_EDUCATION', 'COMPUTER_SCIENCE', 'DIGITAL_LITERACY', 'SOCIAL_EMOTIONAL_LEARNING', 'CAREER_EDUCATION', 'LIFE_SKILLS');

-- AlterTable
ALTER TABLE "content_sensory_metadata" ADD COLUMN     "overall_warning_level" "sensory_warning_level" NOT NULL DEFAULT 'INFO';

-- CreateTable
CREATE TABLE "curriculum_frameworks" (
    "id" UUID NOT NULL,
    "code" "curriculum_framework_code" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "country_code" VARCHAR(2) NOT NULL,
    "region_code" VARCHAR(10),
    "grade_system" VARCHAR(50) NOT NULL,
    "min_grade" INTEGER NOT NULL,
    "max_grade" INTEGER NOT NULL,
    "official_url" VARCHAR(500),
    "standards_doc_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_updated_version" VARCHAR(50),
    "effective_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "curriculum_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_equivalencies" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "grade_label" VARCHAR(50) NOT NULL,
    "grade_code" VARCHAR(20) NOT NULL,
    "typical_age_min" INTEGER NOT NULL,
    "typical_age_max" INTEGER NOT NULL,
    "standardized_level" INTEGER NOT NULL,
    "education_stage" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "grade_equivalencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_mappings" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "standardized_subject" "standardized_subject" NOT NULL,
    "local_subject_code" VARCHAR(50) NOT NULL,
    "local_subject_name" VARCHAR(200) NOT NULL,
    "local_subject_name_native" VARCHAR(200),
    "grade_min" INTEGER,
    "grade_max" INTEGER,
    "is_core" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subject_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_standards" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "subject_mapping_id" UUID,
    "standard_code" VARCHAR(100) NOT NULL,
    "full_code" VARCHAR(200) NOT NULL,
    "parent_standard_id" UUID,
    "hierarchy_level" INTEGER NOT NULL,
    "hierarchy_path" VARCHAR(500) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grade_level" INTEGER,
    "grade_band" VARCHAR(20),
    "cross_cutting_concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_standard_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cognitive_level" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_equivalencies" (
    "id" UUID NOT NULL,
    "source_standard_id" UUID NOT NULL,
    "target_standard_id" UUID NOT NULL,
    "equivalency_type" VARCHAR(50) NOT NULL,
    "confidence_score" DECIMAL(3,2) NOT NULL,
    "notes" TEXT,
    "mapping_source" VARCHAR(50) NOT NULL,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "standard_equivalencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_curriculum_alignments" (
    "id" UUID NOT NULL,
    "learning_object_id" UUID NOT NULL,
    "learning_object_version_id" UUID,
    "framework_id" UUID NOT NULL,
    "aligned_grade_level" INTEGER,
    "aligned_grade_band" VARCHAR(20),
    "alignment_score" DECIMAL(3,2),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "aligned_by" UUID,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_curriculum_alignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_standard_alignments" (
    "id" UUID NOT NULL,
    "curriculum_alignment_id" UUID NOT NULL,
    "standard_id" UUID NOT NULL,
    "alignment_strength" VARCHAR(20) NOT NULL,
    "coverage_percent" INTEGER,
    "alignment_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_standard_alignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_frameworks_code_key" ON "curriculum_frameworks"("code");

-- CreateIndex
CREATE INDEX "curriculum_frameworks_country_code_idx" ON "curriculum_frameworks"("country_code");

-- CreateIndex
CREATE INDEX "curriculum_frameworks_is_active_idx" ON "curriculum_frameworks"("is_active");

-- CreateIndex
CREATE INDEX "grade_equivalencies_standardized_level_idx" ON "grade_equivalencies"("standardized_level");

-- CreateIndex
CREATE INDEX "grade_equivalencies_education_stage_idx" ON "grade_equivalencies"("education_stage");

-- CreateIndex
CREATE UNIQUE INDEX "grade_equivalencies_framework_id_grade_level_key" ON "grade_equivalencies"("framework_id", "grade_level");

-- CreateIndex
CREATE INDEX "subject_mappings_standardized_subject_idx" ON "subject_mappings"("standardized_subject");

-- CreateIndex
CREATE UNIQUE INDEX "subject_mappings_framework_id_standardized_subject_key" ON "subject_mappings"("framework_id", "standardized_subject");

-- CreateIndex
CREATE INDEX "learning_standards_framework_id_grade_level_idx" ON "learning_standards"("framework_id", "grade_level");

-- CreateIndex
CREATE INDEX "learning_standards_framework_id_hierarchy_path_idx" ON "learning_standards"("framework_id", "hierarchy_path");

-- CreateIndex
CREATE INDEX "learning_standards_subject_mapping_id_idx" ON "learning_standards"("subject_mapping_id");

-- CreateIndex
CREATE INDEX "learning_standards_parent_standard_id_idx" ON "learning_standards"("parent_standard_id");

-- CreateIndex
CREATE INDEX "learning_standards_keywords_idx" ON "learning_standards" USING GIN ("keywords");

-- CreateIndex
CREATE UNIQUE INDEX "learning_standards_framework_id_standard_code_key" ON "learning_standards"("framework_id", "standard_code");

-- CreateIndex
CREATE INDEX "standard_equivalencies_source_standard_id_idx" ON "standard_equivalencies"("source_standard_id");

-- CreateIndex
CREATE INDEX "standard_equivalencies_target_standard_id_idx" ON "standard_equivalencies"("target_standard_id");

-- CreateIndex
CREATE INDEX "standard_equivalencies_equivalency_type_idx" ON "standard_equivalencies"("equivalency_type");

-- CreateIndex
CREATE UNIQUE INDEX "standard_equivalencies_source_standard_id_target_standard_i_key" ON "standard_equivalencies"("source_standard_id", "target_standard_id");

-- CreateIndex
CREATE INDEX "content_curriculum_alignments_learning_object_id_idx" ON "content_curriculum_alignments"("learning_object_id");

-- CreateIndex
CREATE INDEX "content_curriculum_alignments_framework_id_idx" ON "content_curriculum_alignments"("framework_id");

-- CreateIndex
CREATE INDEX "content_curriculum_alignments_aligned_grade_level_idx" ON "content_curriculum_alignments"("aligned_grade_level");

-- CreateIndex
CREATE UNIQUE INDEX "content_curriculum_alignments_learning_object_id_framework__key" ON "content_curriculum_alignments"("learning_object_id", "framework_id");

-- CreateIndex
CREATE INDEX "content_standard_alignments_standard_id_idx" ON "content_standard_alignments"("standard_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_standard_alignments_curriculum_alignment_id_standar_key" ON "content_standard_alignments"("curriculum_alignment_id", "standard_id");

-- AddForeignKey
ALTER TABLE "grade_equivalencies" ADD CONSTRAINT "grade_equivalencies_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "curriculum_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_mappings" ADD CONSTRAINT "subject_mappings_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "curriculum_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_standards" ADD CONSTRAINT "learning_standards_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "curriculum_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_standards" ADD CONSTRAINT "learning_standards_subject_mapping_id_fkey" FOREIGN KEY ("subject_mapping_id") REFERENCES "subject_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_standards" ADD CONSTRAINT "learning_standards_parent_standard_id_fkey" FOREIGN KEY ("parent_standard_id") REFERENCES "learning_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_equivalencies" ADD CONSTRAINT "standard_equivalencies_source_standard_id_fkey" FOREIGN KEY ("source_standard_id") REFERENCES "learning_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_equivalencies" ADD CONSTRAINT "standard_equivalencies_target_standard_id_fkey" FOREIGN KEY ("target_standard_id") REFERENCES "learning_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_curriculum_alignments" ADD CONSTRAINT "content_curriculum_alignments_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "curriculum_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_standard_alignments" ADD CONSTRAINT "content_standard_alignments_curriculum_alignment_id_fkey" FOREIGN KEY ("curriculum_alignment_id") REFERENCES "content_curriculum_alignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_standard_alignments" ADD CONSTRAINT "content_standard_alignments_standard_id_fkey" FOREIGN KEY ("standard_id") REFERENCES "learning_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
