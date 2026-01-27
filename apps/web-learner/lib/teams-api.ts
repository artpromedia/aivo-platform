/**
 * Teams API Client
 * Provides team management, competitions, and collaboration features
 */

// ============================================================================
// Configuration
// ============================================================================

const TEAMS_API_BASE =
  process.env.NEXT_PUBLIC_GAMIFICATION_API_URL || 'http://localhost:4050/api/gamification';

// ============================================================================
// Enums
// ============================================================================

export type TeamType = 'classroom' | 'school' | 'crossSchool';
export type TeamMemberRole = 'owner' | 'captain' | 'member';
export type CompetitionStatus = 'active' | 'upcoming' | 'ended' | 'cancelled';
export type CompetitionType = 'individual' | 'team' | 'classroom' | 'school';

// ============================================================================
// Team Types
// ============================================================================

export interface Team {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  type: TeamType;
  schoolId?: string;
  classId?: string;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  level: number;
  rank?: number;
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  role: TeamMemberRole;
  contributedXp: number;
  weeklyContribution: number;
  level?: number;
  joinedAt: Date;
}

export interface TeamDetails extends Team {
  members: TeamMember[];
  competitions: CompetitionStanding[];
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  inviterName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// Competition Types
// ============================================================================

export interface CompetitionPrize {
  rank: number;
  xp?: number;
  coins?: number;
  gems?: number;
  badge?: string;
  title?: string;
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: CompetitionType;
  category: string;
  status: CompetitionStatus;
  startDate: Date;
  endDate: Date;
  currentParticipants: number;
  minParticipants?: number;
  maxParticipants?: number;
  isPublic: boolean;
  prizes: CompetitionPrize[];
}

export interface CompetitionStanding {
  competitionId: string;
  competitionName: string;
  rank: number;
  score: number;
  totalParticipants: number;
  timeRemaining: string;
  endsAt: Date;
}

export interface CompetitionParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  score: number;
  isTeam: boolean;
}

// ============================================================================
// Create Team Request
// ============================================================================

export interface CreateTeamRequest {
  name: string;
  description?: string;
  type: TeamType;
  isPublic?: boolean;
  maxMembers?: number;
}

// ============================================================================
// Helper Types
// ============================================================================

export const TEAM_TYPE_META: Record<TeamType, { label: string; color: string; icon: string }> = {
  classroom: { label: 'Classroom', color: '#10B981', icon: '🏫' },
  school: { label: 'School', color: '#3B82F6', icon: '🏛️' },
  crossSchool: { label: 'Cross-School', color: '#8B5CF6', icon: '🌐' },
};

export const MEMBER_ROLE_META: Record<TeamMemberRole, { label: string; icon: string }> = {
  owner: { label: 'Owner', icon: '👑' },
  captain: { label: 'Captain', icon: '⭐' },
  member: { label: 'Member', icon: '👤' },
};

export const COMPETITION_STATUS_META: Record<CompetitionStatus, { label: string; color: string; icon: string }> = {
  active: { label: 'Active Now', color: '#10B981', icon: '🔥' },
  upcoming: { label: 'Coming Soon', color: '#3B82F6', icon: '📅' },
  ended: { label: 'Completed', color: '#6B7280', icon: '✓' },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: '✕' },
};

// ============================================================================
// API Helper Functions
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  studentId: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${TEAMS_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Student-Id': studentId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Return null for not found (e.g., no team)
      return null as T;
    }
    const error = await response.text();
    throw new Error(`Teams API Error: ${response.status} - ${error}`);
  }

  const json = await response.json();
  return json.data as T;
}

// ============================================================================
// Mock Data (for development)
// ============================================================================

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_TEAMS === 'true' || true;

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    studentId: 'student-1',
    displayName: 'Alex Chen',
    role: 'owner',
    contributedXp: 4500,
    weeklyContribution: 450,
    level: 15,
    joinedAt: new Date('2024-09-01'),
  },
  {
    id: 'member-2',
    studentId: 'student-2',
    displayName: 'Jordan Williams',
    role: 'captain',
    contributedXp: 3200,
    weeklyContribution: 380,
    level: 12,
    joinedAt: new Date('2024-09-05'),
  },
  {
    id: 'member-3',
    studentId: 'student-3',
    displayName: 'Sam Rivera',
    role: 'member',
    contributedXp: 2100,
    weeklyContribution: 250,
    level: 10,
    joinedAt: new Date('2024-09-10'),
  },
  {
    id: 'member-4',
    studentId: 'student-4',
    displayName: 'Taylor Kim',
    role: 'member',
    contributedXp: 1800,
    weeklyContribution: 220,
    level: 9,
    joinedAt: new Date('2024-09-15'),
  },
  {
    id: 'member-5',
    studentId: 'student-5',
    displayName: 'Casey Morgan',
    role: 'member',
    contributedXp: 1500,
    weeklyContribution: 180,
    level: 8,
    joinedAt: new Date('2024-09-20'),
  },
];

const MOCK_COMPETITIONS: Competition[] = [
  {
    id: 'comp-1',
    name: 'Weekly XP Challenge',
    description: 'Earn the most XP this week to win special rewards!',
    type: 'team',
    category: 'xp_earned',
    status: 'active',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    currentParticipants: 24,
    maxParticipants: 50,
    isPublic: true,
    prizes: [
      { rank: 1, xp: 500, coins: 100, badge: 'weekly_champion' },
      { rank: 2, xp: 300, coins: 50 },
      { rank: 3, xp: 200, coins: 25 },
    ],
  },
  {
    id: 'comp-2',
    name: 'Study Marathon',
    description: 'Complete the most lessons this month for epic rewards!',
    type: 'individual',
    category: 'lessons_completed',
    status: 'active',
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    currentParticipants: 156,
    isPublic: true,
    prizes: [
      { rank: 1, xp: 1000, gems: 50, title: 'Marathon Champion' },
      { rank: 2, xp: 500, gems: 25 },
      { rank: 3, xp: 300, gems: 10 },
    ],
  },
  {
    id: 'comp-3',
    name: 'Perfect Score Challenge',
    description: 'Get the most perfect quiz scores!',
    type: 'classroom',
    category: 'perfect_scores',
    status: 'upcoming',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    currentParticipants: 0,
    maxParticipants: 30,
    isPublic: true,
    prizes: [
      { rank: 1, xp: 400, badge: 'perfectionist' },
      { rank: 2, xp: 250 },
      { rank: 3, xp: 150 },
    ],
  },
];

const MOCK_TEAM: TeamDetails = {
  id: 'team-1',
  name: 'Star Learners',
  description: 'We are passionate about learning and helping each other grow!',
  type: 'school',
  totalXp: 13100,
  weeklyXp: 1480,
  monthlyXp: 5200,
  level: 8,
  rank: 3,
  memberCount: 5,
  maxMembers: 20,
  isPublic: true,
  createdAt: new Date('2024-09-01'),
  members: MOCK_TEAM_MEMBERS,
  competitions: [
    {
      competitionId: 'comp-1',
      competitionName: 'Weekly XP Challenge',
      rank: 3,
      score: 1480,
      totalParticipants: 24,
      timeRemaining: '4 days',
      endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  ],
};

const MOCK_TEAMS_LEADERBOARD: Team[] = [
  {
    id: 'team-a',
    name: 'Knowledge Ninjas',
    description: 'Swift and smart!',
    type: 'school',
    totalXp: 18500,
    weeklyXp: 2100,
    monthlyXp: 7800,
    level: 12,
    rank: 1,
    memberCount: 8,
    maxMembers: 20,
    isPublic: true,
    createdAt: new Date('2024-08-15'),
  },
  {
    id: 'team-b',
    name: 'Brain Stormers',
    description: 'Ideas flow like storms!',
    type: 'classroom',
    totalXp: 15200,
    weeklyXp: 1800,
    monthlyXp: 6500,
    level: 10,
    rank: 2,
    memberCount: 6,
    maxMembers: 20,
    isPublic: true,
    createdAt: new Date('2024-08-20'),
  },
  { ...MOCK_TEAM, rank: 3 },
  {
    id: 'team-c',
    name: 'Quiz Masters',
    description: 'Masters of every quiz!',
    type: 'crossSchool',
    totalXp: 11800,
    weeklyXp: 1200,
    monthlyXp: 4800,
    level: 7,
    rank: 4,
    memberCount: 7,
    maxMembers: 20,
    isPublic: true,
    createdAt: new Date('2024-09-05'),
  },
  {
    id: 'team-d',
    name: 'Study Squad',
    description: 'Studying together!',
    type: 'classroom',
    totalXp: 9500,
    weeklyXp: 950,
    monthlyXp: 3800,
    level: 6,
    rank: 5,
    memberCount: 5,
    maxMembers: 20,
    isPublic: true,
    createdAt: new Date('2024-09-10'),
  },
];

const MOCK_INVITES: TeamInvite[] = [
  {
    id: 'invite-1',
    teamId: 'team-a',
    teamName: 'Knowledge Ninjas',
    invitedBy: 'student-10',
    inviterName: 'Emma Davis',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

// ============================================================================
// Team APIs
// ============================================================================

/**
 * Get the student's current team (if any)
 */
export async function getStudentTeam(studentId: string): Promise<TeamDetails | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return MOCK_TEAM;
  }
  return apiRequest<TeamDetails>('/teams/my-team', studentId);
}

/**
 * Get team details by ID
 */
export async function getTeamDetails(studentId: string, teamId: string): Promise<TeamDetails> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_TEAM;
  }
  return apiRequest<TeamDetails>(`/teams/${teamId}`, studentId);
}

/**
 * Get team members
 */
export async function getTeamMembers(studentId: string, teamId: string): Promise<TeamMember[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_TEAM_MEMBERS;
  }
  return apiRequest<TeamMember[]>(`/teams/${teamId}/members`, studentId);
}

/**
 * Search for teams
 */
export async function searchTeams(
  studentId: string,
  query: string,
  options?: { type?: TeamType; schoolId?: string }
): Promise<Team[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const q = query.toLowerCase();
    return MOCK_TEAMS_LEADERBOARD.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  const params = new URLSearchParams({ q: query });
  if (options?.type) params.append('type', options.type);
  if (options?.schoolId) params.append('schoolId', options.schoolId);

  return apiRequest<Team[]>(`/teams?${params.toString()}`, studentId);
}

/**
 * Get team leaderboard
 */
export async function getTeamLeaderboard(
  studentId: string,
  options?: { schoolId?: string; limit?: number }
): Promise<Team[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_TEAMS_LEADERBOARD;
  }

  const params = new URLSearchParams();
  if (options?.schoolId) params.append('schoolId', options.schoolId);
  if (options?.limit) params.append('limit', options.limit.toString());

  const queryString = params.toString();
  return apiRequest<Team[]>(`/teams${queryString ? `?${queryString}` : ''}`, studentId);
}

/**
 * Create a new team
 */
export async function createTeam(
  studentId: string,
  data: CreateTeamRequest
): Promise<Team> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      id: `team-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      type: data.type,
      totalXp: 0,
      weeklyXp: 0,
      monthlyXp: 0,
      level: 1,
      rank: undefined,
      memberCount: 1,
      maxMembers: data.maxMembers || 20,
      isPublic: data.isPublic ?? true,
      createdAt: new Date(),
    };
  }

  return apiRequest<Team>('/teams', studentId, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Join a team
 */
export async function joinTeam(studentId: string, teamId: string): Promise<boolean> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return true;
  }

  await apiRequest<void>(`/teams/${teamId}/join`, studentId, { method: 'POST' });
  return true;
}

/**
 * Leave a team
 */
export async function leaveTeam(studentId: string, teamId: string): Promise<boolean> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return true;
  }

  await apiRequest<void>(`/teams/${teamId}/leave`, studentId, { method: 'POST' });
  return true;
}

// ============================================================================
// Team Invite APIs
// ============================================================================

/**
 * Get pending team invites
 */
export async function getTeamInvites(studentId: string): Promise<TeamInvite[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_INVITES;
  }
  return apiRequest<TeamInvite[]>(`/students/${studentId}/team-invites`, studentId);
}

/**
 * Respond to a team invite
 */
export async function respondToTeamInvite(
  studentId: string,
  inviteId: string,
  accept: boolean
): Promise<boolean> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return true;
  }

  const action = accept ? 'accept' : 'decline';
  await apiRequest<void>(`/team-invites/${inviteId}/${action}`, studentId, {
    method: 'POST',
  });
  return true;
}

// ============================================================================
// Competition APIs
// ============================================================================

/**
 * Get competitions
 */
export async function getCompetitions(
  studentId: string,
  options?: { type?: CompetitionType; schoolId?: string; forStudent?: boolean }
): Promise<Competition[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_COMPETITIONS;
  }

  const params = new URLSearchParams();
  if (options?.type) params.append('type', options.type);
  if (options?.schoolId) params.append('schoolId', options.schoolId);
  if (options?.forStudent) params.append('forStudent', 'true');

  const queryString = params.toString();
  return apiRequest<Competition[]>(`/competitions${queryString ? `?${queryString}` : ''}`, studentId);
}

/**
 * Get recommended competitions for the student
 */
export async function getRecommendedCompetitions(studentId: string): Promise<Competition[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_COMPETITIONS.filter((c) => c.status === 'active');
  }
  return apiRequest<Competition[]>('/competitions/recommended', studentId);
}

/**
 * Get competition details
 */
export async function getCompetitionDetails(
  studentId: string,
  competitionId: string
): Promise<Competition> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_COMPETITIONS.find((c) => c.id === competitionId) || MOCK_COMPETITIONS[0];
  }
  return apiRequest<Competition>(`/competitions/${competitionId}`, studentId);
}

/**
 * Get competition leaderboard
 */
export async function getCompetitionLeaderboard(
  studentId: string,
  competitionId: string,
  limit?: number
): Promise<CompetitionParticipant[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_TEAMS_LEADERBOARD.map((t, i) => ({
      id: t.id,
      name: t.name,
      avatarUrl: undefined,
      rank: i + 1,
      score: t.weeklyXp,
      isTeam: true,
    }));
  }

  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());

  const queryString = params.toString();
  return apiRequest<CompetitionParticipant[]>(
    `/competitions/${competitionId}/leaderboard${queryString ? `?${queryString}` : ''}`,
    studentId
  );
}

/**
 * Join a competition
 */
export async function joinCompetition(
  studentId: string,
  competitionId: string
): Promise<boolean> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return true;
  }

  await apiRequest<void>(`/competitions/${competitionId}/join`, studentId, {
    method: 'POST',
  });
  return true;
}

/**
 * Leave a competition
 */
export async function leaveCompetition(
  studentId: string,
  competitionId: string
): Promise<boolean> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return true;
  }

  await apiRequest<void>(`/competitions/${competitionId}/leave`, studentId, {
    method: 'POST',
  });
  return true;
}

/**
 * Get student's competition standings
 */
export async function getMyCompetitionStandings(
  studentId: string
): Promise<CompetitionStanding[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_TEAM.competitions;
  }
  return apiRequest<CompetitionStanding[]>(`/students/${studentId}/competitions`, studentId);
}

// ============================================================================
// Export All
// ============================================================================

export const teamsApi = {
  // Team APIs
  getStudentTeam,
  getTeamDetails,
  getTeamMembers,
  searchTeams,
  getTeamLeaderboard,
  createTeam,
  joinTeam,
  leaveTeam,

  // Invite APIs
  getTeamInvites,
  respondToTeamInvite,

  // Competition APIs
  getCompetitions,
  getRecommendedCompetitions,
  getCompetitionDetails,
  getCompetitionLeaderboard,
  joinCompetition,
  leaveCompetition,
  getMyCompetitionStandings,
};

export default teamsApi;
