-- AlterTable: change default maxCaregivers from 2 to 3
ALTER TABLE "caregiver_limits" ALTER COLUMN "maxCaregivers" SET DEFAULT 3;

-- Data migration: bump existing records still at old default (2) → new default (3).
-- Records with custom limits (e.g. PREMIUM plans set to 5) are left untouched.
UPDATE "caregiver_limits" SET "maxCaregivers" = 3 WHERE "maxCaregivers" = 2;
