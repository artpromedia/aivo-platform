/**
 * Gamification API Client
 *
 * Type-safe API functions for gamification features including:
 * - Achievements and progress tracking
 * - Team management
 * - Leaderboards
 * - Competitions
 */

import type {
  Achievement,
  AchievementProgress,
  AchievementListResponse,
  Team,
  TeamDetails,
  TeamMember,
  TeamInvite,
  TeamListResponse,
  Competition,
  CompetitionDetails,
  CompetitionStanding,
  CompetitionListResponse,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardFilters,
  GamificationDashboard,
  GamificationPrivacySettings,
  GamificationAnalytics,
  PlayerProfile,
  Streak,
  Challenge,
  CompetitionType,
} from '@aivo/ts-types';

import { apiClient } from './client';

// ============================================================================
// Achievement API
// ============================================================================

/**
 * Get all achievements and progress for a student
 */
export async function getAchievements(studentId: string): Promise<AchievementListResponse> {
  return apiClient.get<AchievementListResponse>(`/gamification/students/${studentId}/achievements`);
}

/**
 * Get a single achievement with detailed progress
 */
export async function getAchievement(
  studentId: string,
  achievementId: string
): Promise<Achievement & { progress?: AchievementProgress }> {
  return apiClient.get(`/gamification/students/${studentId}/achievements/${achievementId}`);
}

/**
 * Get recently earned achievements
 */
export async function getRecentAchievements(studentId: string, limit = 5): Promise<Achievement[]> {
  return apiClient.get<Achievement[]>(
    `/gamification/students/${studentId}/achievements/recent?limit=${limit}`
  );
}

/**
 * Get achievements grouped by category
 */
export async function getAchievementsByCategory(studentId: string): Promise<
  {
    name: string;
    total: number;
    earned: number;
    percentage: number;
    achievements: Achievement[];
  }[]
> {
  return apiClient.get(`/gamification/students/${studentId}/achievements/categories`);
}

// ============================================================================
// Team API
// ============================================================================

/**
 * Get student's current team
 */
export async function getStudentTeam(studentId: string): Promise<TeamDetails | null> {
  try {
    return await apiClient.get<TeamDetails>(`/gamification/students/${studentId}/team`);
  } catch {
    return null;
  }
}

/**
 * Get team details by ID
 */
export async function getTeamDetails(teamId: string): Promise<TeamDetails> {
  return apiClient.get<TeamDetails>(`/gamification/teams/${teamId}`);
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return apiClient.get<TeamMember[]>(`/gamification/teams/${teamId}/members`);
}

/**
 * Search for teams
 */
export async function searchTeams(
  query: string,
  options?: { type?: string; schoolId?: string }
): Promise<TeamListResponse> {
  const params = new URLSearchParams({ q: query });
  if (options?.type) params.append('type', options.type);
  if (options?.schoolId) params.append('schoolId', options.schoolId);

  return apiClient.get<TeamListResponse>(`/gamification/teams?${params.toString()}`);
}

/**
 * Get team leaderboard
 */
export async function getTeamLeaderboard(options?: {
  schoolId?: string;
  limit?: number;
}): Promise<Team[]> {
  const params = new URLSearchParams();
  if (options?.schoolId) params.append('schoolId', options.schoolId);
  if (options?.limit) params.append('limit', options.limit.toString());

  return apiClient.get<Team[]>(`/gamification/teams/leaderboard?${params.toString()}`);
}

/**
 * Create a new team
 */
export async function createTeam(data: {
  name: string;
  description: string;
  type: 'classroom' | 'school' | 'cross_school';
  schoolId?: string;
  classId?: string;
  avatarUrl?: string;
  maxMembers?: number;
  isPublic?: boolean;
}): Promise<Team> {
  return apiClient.post<Team>('/gamification/teams', data);
}

/**
 * Join a team
 */
export async function joinTeam(teamId: string, studentId: string): Promise<{ joined: boolean }> {
  return apiClient.post<{ joined: boolean }>(
    `/gamification/teams/${teamId}/join`,
    {},
    { headers: { 'x-student-id': studentId } }
  );
}

/**
 * Leave a team
 */
export async function leaveTeam(teamId: string, studentId: string): Promise<{ left: boolean }> {
  return apiClient.post<{ left: boolean }>(
    `/gamification/teams/${teamId}/leave`,
    {},
    { headers: { 'x-student-id': studentId } }
  );
}

/**
 * Get pending team invites for a student
 */
export async function getTeamInvites(studentId: string): Promise<TeamInvite[]> {
  return apiClient.get<TeamInvite[]>(`/gamification/students/${studentId}/team-invites`);
}

/**
 * Respond to a team invite
 */
export async function respondToTeamInvite(
  inviteId: string,
  response: 'accept' | 'decline'
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/gamification/team-invites/${inviteId}/${response}`,
    {}
  );
}

// ============================================================================
// Leaderboard API
// ============================================================================

/**
 * Get leaderboard with filters
 */
export async function getLeaderboard(filters: LeaderboardFilters): Promise<Leaderboard> {
  const params = new URLSearchParams();
  params.append('scope', filters.scope);
  params.append('period', filters.period);
  if (filters.type) params.append('type', filters.type);
  if (filters.schoolId) params.append('schoolId', filters.schoolId);
  if (filters.classId) params.append('classId', filters.classId);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  return apiClient.get<Leaderboard>(`/gamification/leaderboards?${params.toString()}`);
}

/**
 * Get player's rank on leaderboard
 */
export async function getPlayerRank(
  studentId: string,
  filters: LeaderboardFilters
): Promise<{ rank: number; score: number; change?: number }> {
  const params = new URLSearchParams();
  params.append('scope', filters.scope);
  params.append('period', filters.period);
  if (filters.schoolId) params.append('schoolId', filters.schoolId);
  if (filters.classId) params.append('classId', filters.classId);

  return apiClient.get(`/gamification/leaderboards/rank?${params.toString()}`, {
    headers: { 'x-student-id': studentId },
  });
}

/**
 * Get players around the current player
 */
export async function getLeaderboardNeighbors(
  studentId: string,
  filters: LeaderboardFilters,
  range = 3
): Promise<{ player: number; neighbors: LeaderboardEntry[] }> {
  const params = new URLSearchParams();
  params.append('scope', filters.scope);
  params.append('period', filters.period);
  params.append('range', range.toString());
  if (filters.schoolId) params.append('schoolId', filters.schoolId);
  if (filters.classId) params.append('classId', filters.classId);

  return apiClient.get(`/gamification/leaderboards/neighbors?${params.toString()}`, {
    headers: { 'x-student-id': studentId },
  });
}

/**
 * Get top 3 players (for podium display)
 */
export async function getTop3(filters: LeaderboardFilters): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams();
  params.append('scope', filters.scope);
  params.append('period', filters.period);
  if (filters.schoolId) params.append('schoolId', filters.schoolId);
  if (filters.classId) params.append('classId', filters.classId);

  return apiClient.get<LeaderboardEntry[]>(`/gamification/leaderboards/top3?${params.toString()}`);
}

// ============================================================================
// Competition API
// ============================================================================

/**
 * Get active competitions
 */
export async function getActiveCompetitions(options?: {
  type?: CompetitionType;
  schoolId?: string;
  studentId?: string;
}): Promise<CompetitionListResponse> {
  const params = new URLSearchParams();
  if (options?.type) params.append('type', options.type);
  if (options?.schoolId) params.append('schoolId', options.schoolId);
  if (options?.studentId) params.append('forStudent', 'true');

  return apiClient.get<CompetitionListResponse>(
    `/gamification/competitions?${params.toString()}`,
    options?.studentId ? { headers: { 'x-student-id': options.studentId } } : undefined
  );
}

/**
 * Get recommended competitions for a student
 */
export async function getRecommendedCompetitions(studentId: string): Promise<Competition[]> {
  return apiClient.get<Competition[]>('/gamification/competitions/recommended', {
    headers: { 'x-student-id': studentId },
  });
}

/**
 * Get competition details with standings
 */
export async function getCompetitionDetails(
  competitionId: string,
  studentId?: string
): Promise<CompetitionDetails> {
  return apiClient.get<CompetitionDetails>(
    `/gamification/competitions/${competitionId}`,
    studentId ? { headers: { 'x-student-id': studentId } } : undefined
  );
}

/**
 * Join a competition
 */
export async function joinCompetition(
  competitionId: string,
  studentId: string,
  options?: { participantId?: string; participantType?: CompetitionType }
): Promise<{ joined: boolean; standing?: CompetitionStanding }> {
  return apiClient.post<{ joined: boolean; standing?: CompetitionStanding }>(
    `/gamification/competitions/${competitionId}/join`,
    options || {},
    { headers: { 'x-student-id': studentId } }
  );
}

/**
 * Leave a competition
 */
export async function leaveCompetition(
  competitionId: string,
  studentId: string
): Promise<{ left: boolean }> {
  return apiClient.post<{ left: boolean }>(
    `/gamification/competitions/${competitionId}/leave`,
    {},
    { headers: { 'x-student-id': studentId } }
  );
}

/**
 * Get student's active competition standings
 */
export async function getStudentCompetitionStandings(
  studentId: string
): Promise<CompetitionStanding[]> {
  return apiClient.get<CompetitionStanding[]>(`/gamification/students/${studentId}/competitions`);
}

/**
 * Get competition history
 */
export async function getCompetitionHistory(options?: {
  participantId?: string;
  limit?: number;
}): Promise<CompetitionListResponse> {
  const params = new URLSearchParams();
  if (options?.participantId) params.append('participantId', options.participantId);
  if (options?.limit) params.append('limit', options.limit.toString());

  return apiClient.get<CompetitionListResponse>(
    `/gamification/competitions/history?${params.toString()}`
  );
}

// ============================================================================
// Dashboard & Profile API
// ============================================================================

/**
 * Get full gamification dashboard for a student
 */
export async function getGamificationDashboard(studentId: string): Promise<GamificationDashboard> {
  return apiClient.get<GamificationDashboard>(`/gamification/students/${studentId}/dashboard`);
}

/**
 * Get player profile
 */
export async function getPlayerProfile(studentId: string): Promise<PlayerProfile> {
  return apiClient.get<PlayerProfile>(`/gamification/students/${studentId}/profile`);
}

/**
 * Get streak info
 */
export async function getStreak(studentId: string): Promise<Streak> {
  return apiClient.get<Streak>(`/gamification/students/${studentId}/streak`);
}

/**
 * Get active challenges
 */
export async function getChallenges(studentId: string): Promise<Challenge[]> {
  return apiClient.get<Challenge[]>(`/gamification/students/${studentId}/challenges`);
}

// ============================================================================
// Privacy & Settings API
// ============================================================================

/**
 * Get student's gamification privacy settings
 */
export async function getPrivacySettings(studentId: string): Promise<GamificationPrivacySettings> {
  return apiClient.get<GamificationPrivacySettings>(`/gamification/students/${studentId}/privacy`);
}

/**
 * Update student's gamification privacy settings
 */
export async function updatePrivacySettings(
  studentId: string,
  settings: Partial<GamificationPrivacySettings>
): Promise<GamificationPrivacySettings> {
  return apiClient.patch<GamificationPrivacySettings>(
    `/gamification/students/${studentId}/privacy`,
    settings
  );
}

// ============================================================================
// Analytics API (Parent view)
// ============================================================================

/**
 * Get gamification analytics for a student
 */
export async function getGamificationAnalytics(
  studentId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<GamificationAnalytics> {
  return apiClient.get<GamificationAnalytics>(
    `/gamification/students/${studentId}/analytics?period=${period}`
  );
}

// ============================================================================
// Export as namespace
// ============================================================================

export const gamificationApi = {
  // Achievements
  getAchievements,
  getAchievement,
  getRecentAchievements,
  getAchievementsByCategory,

  // Teams
  getStudentTeam,
  getTeamDetails,
  getTeamMembers,
  searchTeams,
  getTeamLeaderboard,
  createTeam,
  joinTeam,
  leaveTeam,
  getTeamInvites,
  respondToTeamInvite,

  // Leaderboards
  getLeaderboard,
  getPlayerRank,
  getLeaderboardNeighbors,
  getTop3,

  // Competitions
  getActiveCompetitions,
  getRecommendedCompetitions,
  getCompetitionDetails,
  joinCompetition,
  leaveCompetition,
  getStudentCompetitionStandings,
  getCompetitionHistory,

  // Dashboard & Profile
  getGamificationDashboard,
  getPlayerProfile,
  getStreak,
  getChallenges,

  // Privacy
  getPrivacySettings,
  updatePrivacySettings,

  // Analytics
  getGamificationAnalytics,
};
