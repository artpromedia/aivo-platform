-- AlterTable: Add firebaseUid column for Firebase Auth email verification
ALTER TABLE "User" ADD COLUMN "firebaseUid" TEXT;

-- CreateIndex: Unique index on firebaseUid
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
