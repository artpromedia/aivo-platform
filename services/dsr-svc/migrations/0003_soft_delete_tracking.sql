-- Migration: 0003_soft_delete_tracking
-- Description: Add columns to track soft delete mode and permanent purge status
--              for GDPR Article 17 compliance with retention period management

-- ================================================================================
-- ENHANCE dsr_requests TABLE FOR SOFT DELETE TRACKING
-- ================================================================================

-- Add deletion mode tracking (SOFT = de-identify, HARD = permanent delete)
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS deletion_mode TEXT NULL 
    CHECK (deletion_mode IN ('SOFT', 'HARD'));

-- Add permanent purge tracking for soft-deleted records
-- After retention period expires, soft-deleted records are permanently purged
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS permanent_purge_completed_at TIMESTAMPTZ NULL;
ALTER TABLE dsr_requests ADD COLUMN IF NOT EXISTS permanent_purge_records_deleted INTEGER NULL;

-- Add index for finding records ready for permanent purge
CREATE INDEX IF NOT EXISTS idx_dsr_requests_pending_purge 
    ON dsr_requests(completed_at)
    WHERE status = 'COMPLETED' 
      AND deletion_mode = 'SOFT' 
      AND permanent_purge_completed_at IS NULL;

-- ================================================================================
-- DSR AUDIT LOG ENHANCEMENT
-- ================================================================================

-- Add new audit action type for permanent purge
-- (Most systems store audit actions as text, so no ALTER needed)
COMMENT ON TABLE dsr_requests IS 
    'Data Subject Request tracking table with GDPR Article 17 compliance. 
     Supports both SOFT delete (de-identification) and HARD delete (permanent removal).
     Soft-deleted records are permanently purged after retention period (default 90 days).';

-- ================================================================================
-- BACKFILL EXISTING RECORDS
-- ================================================================================

-- Assume existing completed DELETION requests used SOFT mode
UPDATE dsr_requests 
SET deletion_mode = 'SOFT'
WHERE request_type = 'DELETION' 
  AND status = 'COMPLETED'
  AND deletion_mode IS NULL;
