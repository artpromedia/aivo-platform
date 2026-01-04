-- Migration: Add Teams and Competitions
-- Purpose: Implement team challenges and cross-school competition system

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Team" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- classroom, school, cross_school
  "schoolId" TEXT,
  "classId" TEXT,
  "avatarUrl" TEXT,

  -- Team Stats
  "maxMembers" INTEGER NOT NULL DEFAULT 50,
  "totalXp" INTEGER NOT NULL DEFAULT 0,
  "weeklyXp" INTEGER NOT NULL DEFAULT 0,
  "monthlyXp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,

  -- Settings
  "isPublic" BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL
);

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "TeamMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member', -- owner, captain, member

  -- Contributions
  "contributedXp" INTEGER NOT NULL DEFAULT 0,
  "weeklyContribution" INTEGER NOT NULL DEFAULT 0,
  "monthlyContribution" INTEGER NOT NULL DEFAULT 0,

  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- TEAM ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "TeamAchievement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "iconUrl" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamAchievement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- COMPETITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Competition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,

  -- Competition Type & Category
  "type" TEXT NOT NULL, -- individual, team, class, school
  "duration" TEXT NOT NULL, -- daily, weekly, seasonal
  "category" TEXT NOT NULL, -- xp_earned, lessons_completed, reading_minutes, math_problems, streak_days, perfect_scores

  -- Schedule
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, active, completed, cancelled

  -- Participant Limits
  "minParticipants" INTEGER NOT NULL DEFAULT 2,
  "maxParticipants" INTEGER NOT NULL DEFAULT 100,

  -- Matching Criteria
  "minLevel" INTEGER,
  "maxLevel" INTEGER,
  "schoolId" TEXT, -- null for cross-school competitions

  -- Prizes (stored as JSON array)
  "prizes" JSONB NOT NULL DEFAULT '[]',

  -- Settings
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "autoJoin" BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL
);

-- ============================================================================
-- COMPETITION PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "CompetitionParticipant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL, -- studentId, teamId, classId, or schoolId
  "participantType" TEXT NOT NULL, -- individual, team, class, school

  -- Performance
  "score" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER,
  "prize" JSONB, -- Prize received (if ranked)

  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionParticipant_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Team indexes
CREATE INDEX IF NOT EXISTS "Team_type_idx" ON "Team"("type");
CREATE INDEX IF NOT EXISTS "Team_schoolId_idx" ON "Team"("schoolId");
CREATE INDEX IF NOT EXISTS "Team_classId_idx" ON "Team"("classId");
CREATE INDEX IF NOT EXISTS "Team_totalXp_idx" ON "Team"("totalXp");
CREATE INDEX IF NOT EXISTS "Team_weeklyXp_idx" ON "Team"("weeklyXp");
CREATE INDEX IF NOT EXISTS "Team_monthlyXp_idx" ON "Team"("monthlyXp");
CREATE INDEX IF NOT EXISTS "Team_isPublic_idx" ON "Team"("isPublic");

-- Team member indexes
CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMember_studentId_idx" ON "TeamMember"("studentId");
CREATE INDEX IF NOT EXISTS "TeamMember_contributedXp_idx" ON "TeamMember"("contributedXp");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_studentId_key" ON "TeamMember"("teamId", "studentId");

-- Team achievement indexes
CREATE INDEX IF NOT EXISTS "TeamAchievement_teamId_idx" ON "TeamAchievement"("teamId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamAchievement_teamId_achievementId_key" ON "TeamAchievement"("teamId", "achievementId");

-- Competition indexes
CREATE INDEX IF NOT EXISTS "Competition_type_idx" ON "Competition"("type");
CREATE INDEX IF NOT EXISTS "Competition_status_idx" ON "Competition"("status");
CREATE INDEX IF NOT EXISTS "Competition_category_idx" ON "Competition"("category");
CREATE INDEX IF NOT EXISTS "Competition_startDate_idx" ON "Competition"("startDate");
CREATE INDEX IF NOT EXISTS "Competition_endDate_idx" ON "Competition"("endDate");
CREATE INDEX IF NOT EXISTS "Competition_schoolId_idx" ON "Competition"("schoolId");
CREATE INDEX IF NOT EXISTS "Competition_isPublic_idx" ON "Competition"("isPublic");

-- Competition participant indexes
CREATE INDEX IF NOT EXISTS "CompetitionParticipant_competitionId_idx" ON "CompetitionParticipant"("competitionId");
CREATE INDEX IF NOT EXISTS "CompetitionParticipant_participantId_idx" ON "CompetitionParticipant"("participantId");
CREATE INDEX IF NOT EXISTS "CompetitionParticipant_score_idx" ON "CompetitionParticipant"("score");
CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionParticipant_competitionId_participantId_key" ON "CompetitionParticipant"("competitionId", "participantId");

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE "Team" IS 'Teams/guilds for collaborative gamification';
COMMENT ON TABLE "TeamMember" IS 'Team membership and individual contributions';
COMMENT ON TABLE "TeamAchievement" IS 'Achievements earned by teams';
COMMENT ON TABLE "Competition" IS 'Competitive challenges and tournaments';
COMMENT ON TABLE "CompetitionParticipant" IS 'Competition participants and their scores';
