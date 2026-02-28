-- PIN-05: Security Hardening — Remove plaintext PIN storage
-- This migration:
--   1. Back-fills pinHash for any rows that only have plaintext pin
--   2. Nulls out ALL plaintext pin values
--   3. Drops the unique index on pin
--   4. Creates a unique index on pinHash

-- Step 1: Back-fill pinHash from pin where pinHash is NULL but pin exists
-- SHA-256 is not available natively in all Postgres versions,
-- so we rely on pgcrypto extension (commonly available).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE profiles
SET "pinHash" = encode(digest(pin, 'sha256'), 'hex')
WHERE pin IS NOT NULL
  AND "pinHash" IS NULL;

-- Step 2: Null out all plaintext PINs
UPDATE profiles
SET pin = NULL
WHERE pin IS NOT NULL;

-- Step 3: Drop unique constraint on pin (if exists)
DROP INDEX IF EXISTS "profiles_pin_key";

-- Step 4: Create unique index on pinHash
CREATE UNIQUE INDEX "profiles_pinHash_key" ON profiles ("pinHash");
