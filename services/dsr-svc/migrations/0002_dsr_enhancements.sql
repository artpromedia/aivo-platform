-- Migration: 0002_dsr_enhancements
-- Description: Enhanced DSR requests with admin review workflow and better status tracking

-- ════════════════════════════════════════════════════════════════════════════════
-- ENHANCE dsr_requests TABLE
-- ════════════════════════════════════════════════════════════════════════════════

-- Update status enum to include PENDING, REJECTED, FAILED
ALTER TABLE dsr_requests DROP CONSTRAINT IF EXISTS dsr_requests_status_check;
ALTER TABLE dsr_requests ADD CONSTRAINT dsr_requests_status_check 
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAILED'));

-- Rename parent_id to requested_by_user_id for clarity
ALTER TABLE dsr_requests RENAME COLUMN parent_id TO requested_by_user_id;

-- Add reviewer tracking
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS reviewed_by_user_id TEXT NULL;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;

-- Add error tracking for failed requests
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS error_message TEXT NULL;

-- Add result_uri column (alias for export_location, but clearer naming)
-- We'll keep export_location for backward compatibility
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS result_uri TEXT NULL;

-- Add metadata for audit
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS metadata_json JSONB NULL;

-- Update indexes
DROP INDEX IF EXISTS idx_dsr_requests_parent;
CREATE INDEX IF NOT EXISTS idx_dsr_requests_requested_by 
    ON dsr_requests(tenant_id, requested_by_user_id);

-- Add index for status to support admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_dsr_requests_status 
    ON dsr_requests(status);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_pending 
    ON dsr_requests(tenant_id, status) WHERE status = 'PENDING';

-- ════════════════════════════════════════════════════════════════════════════════
-- DSR PROCESSING JOBS TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dsr_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    
    -- Job status tracking
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')) DEFAULT 'QUEUED',
    
    -- Progress tracking (for large exports)
    progress_percent INTEGER NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
    progress_message TEXT NULL,
    
    -- Error tracking
    error_code TEXT NULL,
    error_message TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Timing
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    
    -- Worker metadata
    worker_id TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsr_jobs_request 
    ON dsr_jobs(dsr_request_id);

CREATE INDEX IF NOT EXISTS idx_dsr_jobs_status 
    ON dsr_jobs(status);

CREATE INDEX IF NOT EXISTS idx_dsr_jobs_queued 
    ON dsr_jobs(status, created_at) WHERE status = 'QUEUED';

-- ════════════════════════════════════════════════════════════════════════════════
-- DSR EXPORT ARTIFACTS TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dsr_export_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    
    -- File metadata
    file_type TEXT NOT NULL CHECK (file_type IN ('JSON', 'CSV', 'ZIP')),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NULL,
    
    -- Storage location (S3-like URI)
    storage_uri TEXT NOT NULL,
    
    -- Security
    encryption_key_id TEXT NULL,
    checksum_sha256 TEXT NULL,
    
    -- TTL for automatic cleanup
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Audit
    downloaded_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsr_artifacts_request 
    ON dsr_export_artifacts(dsr_request_id);

CREATE INDEX IF NOT EXISTS idx_dsr_artifacts_expires 
    ON dsr_export_artifacts(expires_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE dsr_jobs IS 
'Background job tracking for DSR processing. Supports async execution with progress tracking and retries.';

COMMENT ON TABLE dsr_export_artifacts IS 
'Tracks export files generated for DSR EXPORT requests. Files are stored in object storage with TTL.';

COMMENT ON COLUMN dsr_requests.result_uri IS 
'For EXPORT requests, the URI to download the export bundle. For DELETE requests, NULL.';
