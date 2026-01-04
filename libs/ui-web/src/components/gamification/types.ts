/**
 * Gamification Component Types
 */

export type CompetitionStatus = 'upcoming' | 'active' | 'completed';

export interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  role: 'leader' | 'member';
  score: number;
  contributionPercentage: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  iconEmoji: string;
  members: TeamMember[];
  totalScore: number;
  rank: number;
  streakDays: number;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'team';
  status: CompetitionStatus;
  startDate: Date;
  endDate: Date;
  teams: Team[];
  prizes?: Prize[];
  subject?: string;
  targetSkills?: string[];
}

export interface Prize {
  rank: number;
  title: string;
  description: string;
  iconEmoji: string;
}

export interface TeamCardProps {
  /** Team data */
  team: Team;
  /** Whether the current user is on this team */
  isUserTeam?: boolean;
  /** Whether to show member list */
  showMembers?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export interface TeamGridProps {
  /** List of teams */
  teams: Team[];
  /** Loading state */
  isLoading?: boolean;
  /** Current user's team ID */
  userTeamId?: string;
  /** Click handler for team selection */
  onTeamSelect?: (teamId: string) => void;
  /** Custom class name */
  className?: string;
}

export interface TeamLeaderboardProps {
  /** List of teams sorted by rank */
  teams: Team[];
  /** Number of top teams to highlight */
  highlightTop?: number;
  /** Current user's team ID */
  userTeamId?: string;
  /** Whether to show animated transitions */
  animated?: boolean;
  /** Custom class name */
  className?: string;
}

export interface CompetitionCardProps {
  /** Competition data */
  competition: Competition;
  /** Whether the user has joined */
  hasJoined?: boolean;
  /** Join handler */
  onJoin?: () => void;
  /** View details handler */
  onViewDetails?: () => void;
  /** Custom class name */
  className?: string;
}

export interface CompetitionBracketProps {
  /** Competition data */
  competition: Competition;
  /** Current round (for bracket tournaments) */
  currentRound?: number;
  /** Click handler for team */
  onTeamClick?: (teamId: string) => void;
  /** Custom class name */
  className?: string;
}

export interface TeamChallengeCreatorProps {
  /** Available teams to select from */
  availableTeams: Team[];
  /** Submission handler */
  onSubmit: (challenge: NewChallenge) => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Custom class name */
  className?: string;
}

export interface NewChallenge {
  title: string;
  description: string;
  type: 'individual' | 'team';
  startDate: Date;
  endDate: Date;
  targetTeamIds: string[];
  targetSkills?: string[];
  prizes?: Prize[];
}

export interface TeamProgressWidgetProps {
  /** Team data */
  team: Team;
  /** Goal score to reach */
  goalScore: number;
  /** Time remaining in hours */
  timeRemainingHours?: number;
  /** Show individual member contributions */
  showContributions?: boolean;
  /** Custom class name */
  className?: string;
}
