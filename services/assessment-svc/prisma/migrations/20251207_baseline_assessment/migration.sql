-- Baseline Assessment Data Model Migration
-- Covers: enums, profiles, attempts, items, responses, skill estimates

-- 1. Enums
CREATE TYPE baseline_domain AS ENUM ('ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL');
CREATE TYPE grade_band AS ENUM ('K5', 'G6_8', 'G9_12');
CREATE TYPE baseline_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'RETEST_ALLOWED', 'FINAL_ACCEPTED');
CREATE TYPE retest_reason_type AS ENUM ('DISTRACTED', 'ANXIETY', 'TECHNICAL_ISSUE', 'OTHER');

-- 2. baseline_profiles (per learner, per tenant)
CREATE TABLE baseline_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  grade_band grade_band NOT NULL,
  status baseline_status NOT NULL DEFAULT 'NOT_STARTED',
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 2),
  final_attempt_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, learner_id)
);

-- 3. baseline_attempts
CREATE TABLE baseline_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_profile_id UUID NOT NULL REFERENCES baseline_profiles(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL CHECK (attempt_number IN (1, 2)),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  domain_scores_json JSONB NULL,
  overall_estimate_json JSONB NULL,
  retest_reason_type retest_reason_type NULL,
  retest_reason_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (baseline_profile_id, attempt_number)
);

-- FK from profiles to final_attempt (deferred so both tables exist)
ALTER TABLE baseline_profiles
  ADD CONSTRAINT baseline_profiles_final_attempt_fk
  FOREIGN KEY (final_attempt_id) REFERENCES baseline_attempts(id);

-- 4. baseline_items
CREATE TABLE baseline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_attempt_id UUID NOT NULL REFERENCES baseline_attempts(id) ON DELETE CASCADE,
  sequence_index SMALLINT NOT NULL CHECK (sequence_index BETWEEN 0 AND 24),
  domain baseline_domain NOT NULL,
  grade_band grade_band NOT NULL,
  prompt_json JSONB NOT NULL,
  correct_answer_json JSONB NOT NULL,
  ai_metadata_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (baseline_attempt_id, sequence_index)
);

-- 5. baseline_responses
CREATE TABLE baseline_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_item_id UUID NOT NULL REFERENCES baseline_items(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  response_json JSONB NOT NULL,
  is_correct BOOLEAN NULL,
  score NUMERIC(5, 3) NULL,
  latency_ms INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (baseline_item_id, learner_id)
);

-- 6. baseline_skill_estimates
CREATE TABLE baseline_skill_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_attempt_id UUID NOT NULL REFERENCES baseline_attempts(id) ON DELETE CASCADE,
  skill_code TEXT NOT NULL,
  domain baseline_domain NOT NULL,
  estimated_level NUMERIC(6, 3) NOT NULL,
  confidence NUMERIC(5, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (baseline_attempt_id, skill_code)
);

-- 7. Indexes
CREATE INDEX idx_baseline_profiles_tenant_learner ON baseline_profiles (tenant_id, learner_id);
CREATE INDEX idx_baseline_attempts_profile_attempt ON baseline_attempts (baseline_profile_id, attempt_number);
CREATE INDEX idx_baseline_items_attempt_domain_seq ON baseline_items (baseline_attempt_id, domain, sequence_index);
CREATE INDEX idx_baseline_responses_learner_item ON baseline_responses (learner_id, baseline_item_id);
CREATE INDEX idx_baseline_skill_estimates_attempt_skill ON baseline_skill_estimates (baseline_attempt_id, skill_code);
