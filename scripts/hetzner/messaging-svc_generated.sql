DO $$ BEGIN CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'CHANNEL', 'THREAD', '@@map("conversation_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ContextType" AS ENUM ('LEARNER', 'ACTION_PLAN', 'MEETING', 'GOAL', 'SESSION', 'CLASS', 'TASK', '@@map("context_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', '@@map("participant_role")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'REPLY', '@@map("message_type")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "MessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', '@@map("message_status")'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT'::"ConversationType",
    "name" TEXT,
    "description" TEXT,
    "avatar_url" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_muted" BOOLEAN NOT NULL DEFAULT FALSE,
    "context_type" "ContextType",
    "context_id" UUID,
    "context_name" TEXT,
    "context_learner_id" UUID,
    "context_learner_name" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ,
    "last_message_preview" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS "participants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER'::"ParticipantRole",
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_muted" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "last_read_at" TIMESTAMPTZ,
    "last_read_message_id" UUID,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT'::"MessageType",
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "reply_to_id" UUID,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT'::"MessageStatus",
    "is_edited" BOOLEAN NOT NULL DEFAULT FALSE,
    "edited_at" TIMESTAMPTZ,
    "original_content" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "read_receipts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "participants_conversationId_userId_key" ON "participants" ("conversationId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "read_receipts_messageId_userId_key" ON "read_receipts" ("messageId", "userId");