-- AlterTable: Add deprecatedAt column for AUTH-05 deprecation tracking
ALTER TABLE "EmailVerificationToken" ADD COLUMN IF NOT EXISTS "deprecatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
