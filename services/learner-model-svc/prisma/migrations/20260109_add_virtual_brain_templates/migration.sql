-- Virtual Brain Template System Migration
-- Creates the "Main AIVO Brain" template tables for grade-band cloning

-- Create virtual_brain_templates table
CREATE TABLE "virtual_brain_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grade_band" "grade_band" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "default_curriculum_standards" TEXT[] DEFAULT '{}',
    "default_lexile_min" INTEGER,
    "default_lexile_max" INTEGER,
    "template_bkt_defaults" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "virtual_brain_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique index on grade_band
CREATE UNIQUE INDEX "virtual_brain_templates_grade_band_key" ON "virtual_brain_templates"("grade_band");

-- Create template_skill_states table
CREATE TABLE "template_skill_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "skill_code" TEXT NOT NULL,
    "domain" "skill_domain" NOT NULL,
    "default_mastery" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "default_p_learn" DECIMAL(6,5) NOT NULL DEFAULT 0.1,
    "default_p_transit" DECIMAL(6,5) NOT NULL DEFAULT 0.1,
    "default_p_guess" DECIMAL(6,5) NOT NULL DEFAULT 0.2,
    "default_p_slip" DECIMAL(6,5) NOT NULL DEFAULT 0.1,
    "difficulty_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_skill_states_pkey" PRIMARY KEY ("id")
);

-- Create indexes on template_skill_states
CREATE UNIQUE INDEX "template_skill_states_template_id_skill_code_key" ON "template_skill_states"("template_id", "skill_code");
CREATE INDEX "template_skill_states_template_domain_idx" ON "template_skill_states"("template_id", "domain");

-- Add foreign key constraint
ALTER TABLE "template_skill_states" ADD CONSTRAINT "template_skill_states_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "virtual_brain_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add source_template_id and template_version columns to virtual_brains
ALTER TABLE "virtual_brains" ADD COLUMN "source_template_id" UUID;
ALTER TABLE "virtual_brains" ADD COLUMN "template_version" TEXT;

-- Add comment explaining the template system
COMMENT ON TABLE "virtual_brain_templates" IS 'Pre-configured Virtual Brain templates (Main AIVO Brain) for each grade band. Cloned and personalized for each learner.';
COMMENT ON TABLE "template_skill_states" IS 'Default skill states in a template. Copied and personalized with baseline results during cloning.';
