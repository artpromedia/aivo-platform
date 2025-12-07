CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NULL,
    resource_type TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    config_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_policies_resource_tenant
    ON retention_policies(resource_type, tenant_id NULLS LAST);

-- Seed global defaults
INSERT INTO retention_policies (tenant_id, resource_type, retention_days, config_json)
VALUES
    (NULL, 'EVENT', 730, '{}'::jsonb),
    (NULL, 'HOMEWORK_UPLOAD', 365, '{}'::jsonb),
    (NULL, 'AI_INCIDENT', 730, '{}'::jsonb)
ON CONFLICT DO NOTHING;
