-- Data Residency Schema Migration
-- Sprint 15: Add data residency columns to tenants table

ALTER TABLE tenants ADD COLUMN data_region VARCHAR(20) DEFAULT 'us-east-1';
ALTER TABLE tenants ADD COLUMN data_residency_enforced BOOLEAN DEFAULT false;

-- Add constraint for valid regions
ALTER TABLE tenants ADD CONSTRAINT chk_data_region
  CHECK (data_region IN ('us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1'));

-- Index for efficient region-based queries
CREATE INDEX idx_tenants_data_region ON tenants (data_region);

COMMENT ON COLUMN tenants.data_region IS 'The AWS region where this tenant''s data is stored. Set during provisioning and cannot be changed without migration.';
COMMENT ON COLUMN tenants.data_residency_enforced IS 'When true, API requests are redirected to the tenant''s region. Required for GDPR compliance.';
