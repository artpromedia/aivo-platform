import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamsContainer } from '../app/(learning)/teams/components/TeamsContainer';
import * as teamsApi from '../lib/teams-api';

// Mock the Teams API module
vi.mock('../lib/teams-api', () => ({
  teamsApi: {
    getStudentTeam: vi.fn(),
    getTeamLeaderboard: vi.fn(),
    getCompetitions: vi.fn(),
    getTeamInvites: vi.fn(),
    leaveTeam: vi.fn(),
    joinTeam: vi.fn(),
    createTeam: vi.fn(),
    respondToTeamInvite: vi.fn(),
  },
  TEAM_TYPE_META: {
    classroom: { label: 'Classroom', color: '#10B981', icon: '🏫' },
    school: { label: 'School', color: '#3B82F6', icon: '🏛️' },
    crossSchool: { label: 'Cross-School', color: '#8B5CF6', icon: '🌐' },
  },
  MEMBER_ROLE_META: {
    owner: { label: 'Owner', icon: '👑' },
    captain: { label: 'Captain', icon: '⭐' },
    member: { label: 'Member', icon: '👤' },
  },
  COMPETITION_STATUS_META: {
    active: { label: 'Active Now', color: '#10B981', icon: '🔥' },
    upcoming: { label: 'Coming Soon', color: '#3B82F6', icon: '📅' },
    ended: { label: 'Completed', color: '#6B7280', icon: '✓' },
    cancelled: { label: 'Cancelled', color: '#EF4444', icon: '✕' },
  },
}));

describe('TeamsContainer', () => {
  const mockLearnerId = 'learner-123';

  const mockTeam = {
    id: 'team-1',
    name: 'Star Learners',
    description: 'A great learning team!',
    type: 'school' as const,
    totalXp: 15000,
    weeklyXp: 1200,
    monthlyXp: 5000,
    level: 8,
    rank: 3,
    memberCount: 5,
    maxMembers: 20,
    isPublic: true,
    createdAt: new Date('2024-01-15'),
    members: [
      {
        id: 'member-1',
        studentId: 'student-1',
        displayName: 'Alex Chen',
        role: 'owner' as const,
        contributedXp: 4500,
        weeklyContribution: 400,
        level: 12,
        joinedAt: new Date('2024-01-15'),
      },
      {
        id: 'member-2',
        studentId: 'student-2',
        displayName: 'Jordan Williams',
        role: 'captain' as const,
        contributedXp: 3500,
        weeklyContribution: 350,
        level: 10,
        joinedAt: new Date('2024-01-20'),
      },
    ],
    competitions: [
      {
        competitionId: 'comp-1',
        competitionName: 'Weekly XP Challenge',
        rank: 3,
        score: 1200,
        totalParticipants: 25,
        timeRemaining: '4 days',
        endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
    ],
  };

  const mockLeaderboard = [
    {
      id: 'team-a',
      name: 'Knowledge Ninjas',
      type: 'school' as const,
      totalXp: 20000,
      weeklyXp: 2000,
      monthlyXp: 7000,
      level: 10,
      rank: 1,
      memberCount: 8,
      maxMembers: 20,
      isPublic: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'team-b',
      name: 'Brain Stormers',
      type: 'classroom' as const,
      totalXp: 18000,
      weeklyXp: 1800,
      monthlyXp: 6500,
      level: 9,
      rank: 2,
      memberCount: 6,
      maxMembers: 20,
      isPublic: true,
      createdAt: new Date('2024-01-05'),
    },
    mockTeam,
  ];

  const mockCompetitions = [
    {
      id: 'comp-1',
      name: 'Weekly XP Challenge',
      description: 'Earn the most XP this week!',
      type: 'team' as const,
      category: 'xp_earned',
      status: 'active' as const,
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      currentParticipants: 25,
      maxParticipants: 50,
      isPublic: true,
      prizes: [
        { rank: 1, xp: 500, coins: 100 },
        { rank: 2, xp: 300, coins: 50 },
        { rank: 3, xp: 200, coins: 25 },
      ],
    },
    {
      id: 'comp-2',
      name: 'Study Marathon',
      description: 'Complete the most lessons!',
      type: 'individual' as const,
      category: 'lessons_completed',
      status: 'upcoming' as const,
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      currentParticipants: 0,
      maxParticipants: 100,
      isPublic: true,
      prizes: [
        { rank: 1, xp: 1000, gems: 50, title: 'Marathon Champion' },
      ],
    },
  ];

  const mockInvites = [
    {
      id: 'invite-1',
      teamId: 'team-a',
      teamName: 'Knowledge Ninjas',
      invitedBy: 'student-10',
      inviterName: 'Emma Davis',
      status: 'pending' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (teamsApi.teamsApi.getStudentTeam as any).mockResolvedValue(mockTeam);
    (teamsApi.teamsApi.getTeamLeaderboard as any).mockResolvedValue(mockLeaderboard);
    (teamsApi.teamsApi.getCompetitions as any).mockResolvedValue(mockCompetitions);
    (teamsApi.teamsApi.getTeamInvites as any).mockResolvedValue(mockInvites);
  });

  describe('My Team Tab', () => {
    it('renders team information when user has a team', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
        expect(screen.getByText('A great learning team!')).toBeInTheDocument();
      });
    });

    it('displays team stats correctly', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('15,000')).toBeInTheDocument(); // Total XP
        expect(screen.getByText('1,200')).toBeInTheDocument(); // Weekly XP
        expect(screen.getByText('5/20')).toBeInTheDocument(); // Members
      });
    });

    it('shows team members sorted by contribution', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Alex Chen')).toBeInTheDocument();
        expect(screen.getByText('Jordan Williams')).toBeInTheDocument();
      });

      // Check member details
      expect(screen.getByText('4,500')).toBeInTheDocument(); // Alex's XP
    });

    it('displays active competition standings', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Weekly XP Challenge')).toBeInTheDocument();
        expect(screen.getByText('#3')).toBeInTheDocument(); // Rank
      });
    });

    it('shows no team state when user has no team', async () => {
      (teamsApi.teamsApi.getStudentTeam as any).mockResolvedValue(null);

      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('No Team Yet')).toBeInTheDocument();
        expect(screen.getByText('Find or Create a Team')).toBeInTheDocument();
      });
    });
  });

  describe('Leaderboard Tab', () => {
    it('switches to leaderboard tab and shows ranked teams', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
      });

      // Click leaderboard tab
      const leaderboardTab = screen.getByRole('button', { name: /Leaderboard/i });
      fireEvent.click(leaderboardTab);

      await waitFor(() => {
        expect(screen.getByText('Knowledge Ninjas')).toBeInTheDocument();
        expect(screen.getByText('Brain Stormers')).toBeInTheDocument();
      });
    });

    it('highlights user\'s team in the leaderboard', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
      });

      // Navigate to leaderboard
      const leaderboardTab = screen.getByRole('button', { name: /Leaderboard/i });
      fireEvent.click(leaderboardTab);

      await waitFor(() => {
        // User's team should be highlighted with "Your Team" badge
        expect(screen.getByText('Your Team')).toBeInTheDocument();
      });
    });
  });

  describe('Competitions Tab', () => {
    it('switches to competitions tab and shows all competitions', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
      });

      // Click competitions tab
      const competitionsTab = screen.getByRole('button', { name: /Competitions/i });
      fireEvent.click(competitionsTab);

      await waitFor(() => {
        expect(screen.getByText('Weekly XP Challenge')).toBeInTheDocument();
        expect(screen.getByText('Study Marathon')).toBeInTheDocument();
      });
    });

    it('shows competition status badges', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
      });

      const competitionsTab = screen.getByRole('button', { name: /Competitions/i });
      fireEvent.click(competitionsTab);

      await waitFor(() => {
        expect(screen.getByText(/Active Now/i)).toBeInTheDocument();
        expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
      });
    });

    it('filters competitions by status', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
      });

      const competitionsTab = screen.getByRole('button', { name: /Competitions/i });
      fireEvent.click(competitionsTab);

      await waitFor(() => {
        expect(screen.getByText('Weekly XP Challenge')).toBeInTheDocument();
      });

      // Click Active filter
      const activeButton = screen.getByRole('button', { name: /Active/i });
      fireEvent.click(activeButton);

      // Should only show active competitions
      expect(screen.getByText('Weekly XP Challenge')).toBeInTheDocument();
      expect(screen.queryByText('Study Marathon')).not.toBeInTheDocument();
    });
  });

  describe('Team Search Modal', () => {
    it('shows pending invites badge when there are invites', async () => {
      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText(/1 Pending Invite/i)).toBeInTheDocument();
      });
    });

    it('opens search modal when clicking Find Team button', async () => {
      (teamsApi.teamsApi.getStudentTeam as any).mockResolvedValue(null);

      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Find or Create a Team')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Find or Create a Team'));

      await waitFor(() => {
        expect(screen.getByText('Find or Create Team')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when API fails', async () => {
      (teamsApi.teamsApi.getStudentTeam as any).mockRejectedValue(new Error('Network error'));
      (teamsApi.teamsApi.getTeamLeaderboard as any).mockRejectedValue(new Error('Network error'));
      (teamsApi.teamsApi.getCompetitions as any).mockRejectedValue(new Error('Network error'));
      (teamsApi.teamsApi.getTeamInvites as any).mockRejectedValue(new Error('Network error'));

      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load teams data/i)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('retries loading data when clicking Try Again', async () => {
      (teamsApi.teamsApi.getStudentTeam as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTeam);
      (teamsApi.teamsApi.getTeamLeaderboard as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLeaderboard);
      (teamsApi.teamsApi.getCompetitions as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockCompetitions);
      (teamsApi.teamsApi.getTeamInvites as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockInvites);

      render(<TeamsContainer learnerId={mockLearnerId} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Star Learners')).toBeInTheDocument();
      });
    });
  });
});
