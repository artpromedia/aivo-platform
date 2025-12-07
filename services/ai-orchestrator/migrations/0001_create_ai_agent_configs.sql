CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ai_agent_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    hyperparameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    version TEXT NOT NULL,
    rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_agent_configs_agent_type_check CHECK (agent_type IN ('BASELINE', 'VIRTUAL_BRAIN', 'LESSON_PLANNER', 'TUTOR', 'FOCUS', 'HOMEWORK_HELPER', 'PROGRESS', 'SAFETY')),
    CONSTRAINT ai_agent_configs_provider_check CHECK (provider IN ('OPENAI', 'ANTHROPIC', 'GEMINI', 'MOCK'))
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_agent_type_active
    ON ai_agent_configs(agent_type, is_active DESC, rollout_percentage DESC);
