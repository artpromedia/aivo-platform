-- AUTH-05: Deprecate EmailVerificationToken table
--
-- With Firebase handling email verification, the custom token-based
-- verification flow is no longer needed. This migration marks the table
-- as deprecated. The table is NOT dropped to preserve audit history
-- for 90 days per compliance requirements.
--
-- After 90 days (approximately April 2026), create a follow-up migration
-- to safely drop the table.
--
-- Background:
--   Previously, auth-svc generated custom verification tokens stored
--   in this table. Now Firebase Auth handles verification natively,
--   and the auth.service.ts verifyEmailViaFirebase() method syncs
--   the verified status from Firebase → local DB directly.

-- Add deprecation metadata column
ALTER TABLE "EmailVerificationToken"
ADD COLUMN IF NOT EXISTS "deprecated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add a comment to the table documenting the deprecation
COMMENT ON TABLE "EmailVerificationToken" IS
  'DEPRECATED (AUTH-05, 2026-01-30): Firebase now handles email verification. '
  'This table is retained for 90-day audit trail. Do NOT insert new rows. '
  'Scheduled for removal after April 2026.';

-- Clean up any expired/unverified tokens older than 90 days as a housekeeping step
DELETE FROM "EmailVerificationToken"
WHERE "expiresAt" < NOW() - INTERVAL '90 days'
  AND "verifiedAt" IS NULL;
