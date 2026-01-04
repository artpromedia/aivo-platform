// Team Dashboard Component
// Shows team info, members, collective progress, and team achievements

import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMember {
  id: string;
  studentId: string;
  role: 'owner' | 'captain' | 'member';
  contributedXp: number;
  weeklyContribution: number;
  monthlyContribution: number;
  joinedAt: string;
  student?: {
    givenName: string;
    familyName: string;
    photoUrl?: string;
    level?: number;
  };
}

export interface TeamAchievement {
  id: string;
  teamId: string;
  achievementId: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
}

export interface TeamData {
  id: string;
  name: string;
  description: string;
  type: 'classroom' | 'school' | 'cross_school';
  avatarUrl?: string;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  level: number;
  memberCount: number;
  maxMembers: number;
}

export interface TeamStats {
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  level: number;
  rank?: number;
  totalMembers: number;
  activeMembers: number;
  topContributors: TeamMember[];
  recentAchievements: TeamAchievement[];
}

interface TeamDashboardProps {
  teamId: string;
  onLeave?: () => void;
  onInviteMember?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  teamId,
  onLeave,
  onInviteMember,
}) => {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'achievements'>('overview');

  useEffect(() => {
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // const response = await fetch(`/api/gamification/teams/${teamId}`);
      // const data = await response.json();

      // Mock data for demonstration
      const mockTeam: TeamData = {
        id: teamId,
        name: 'Math Masters',
        description: 'Conquering math problems together!',
        type: 'school',
        avatarUrl: '/team-avatars/math-masters.png',
        totalXp: 15750,
        weeklyXp: 2340,
        monthlyXp: 8920,
        level: 12,
        memberCount: 8,
        maxMembers: 20,
      };

      const mockMembers: TeamMember[] = [
        {
          id: '1',
          studentId: 'student1',
          role: 'owner',
          contributedXp: 5200,
          weeklyContribution: 820,
          monthlyContribution: 3100,
          joinedAt: new Date().toISOString(),
          student: {
            givenName: 'Alice',
            familyName: 'Johnson',
            level: 15,
          },
        },
        {
          id: '2',
          studentId: 'student2',
          role: 'captain',
          contributedXp: 4100,
          weeklyContribution: 650,
          monthlyContribution: 2400,
          joinedAt: new Date().toISOString(),
          student: {
            givenName: 'Bob',
            familyName: 'Smith',
            level: 13,
          },
        },
      ];

      const mockStats: TeamStats = {
        totalXp: 15750,
        weeklyXp: 2340,
        monthlyXp: 8920,
        level: 12,
        rank: 5,
        totalMembers: 8,
        activeMembers: 6,
        topContributors: mockMembers,
        recentAchievements: [],
      };

      setTeam(mockTeam);
      setMembers(mockMembers);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading team data...</div>
      </div>
    );
  }

  if (!team || !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Team not found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {team.avatarUrl ? (
              <img
                src={team.avatarUrl}
                alt={team.name}
                className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center text-3xl">
                ⚔️
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{team.name}</h2>
              <p className="text-blue-100 text-sm">{team.description}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm bg-white/20 px-2 py-1 rounded">
                  Level {team.level}
                </span>
                <span className="text-sm">
                  {team.memberCount}/{team.maxMembers} members
                </span>
                {stats.rank && (
                  <span className="text-sm bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-semibold">
                    Rank #{stats.rank}
                  </span>
                )}
              </div>
            </div>
          </div>
          {onLeave && (
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition"
            >
              Leave Team
            </button>
          )}
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalXp.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total XP</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.weeklyXp.toLocaleString()}</div>
          <div className="text-xs text-gray-500">This Week</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.activeMembers}/{stats.totalMembers}
          </div>
          <div className="text-xs text-gray-500">Active Members</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-1 px-6">
          {(['overview', 'members', 'achievements'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Top Contributors</h3>
              <div className="space-y-2">
                {stats.topContributors.slice(0, 5).map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-yellow-400 text-yellow-900'
                            : index === 1
                            ? 'bg-gray-300 text-gray-700'
                            : index === 2
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {member.student
                            ? `${member.student.givenName} ${member.student.familyName}`
                            : 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Level {member.student?.level || 1}
                          {member.role !== 'member' && (
                            <span className="ml-2 text-blue-600 font-medium">({member.role})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">
                        {member.contributedXp.toLocaleString()} XP
                      </div>
                      <div className="text-xs text-gray-500">
                        +{member.weeklyContribution} this week
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {onInviteMember && (
              <button
                onClick={onInviteMember}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
              >
                Invite Members
              </button>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="font-medium">
                      {member.student
                        ? `${member.student.givenName} ${member.student.familyName}`
                        : 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.role === 'owner' && '👑 Team Owner'}
                      {member.role === 'captain' && '⭐ Captain'}
                      {member.role === 'member' && 'Member'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{member.contributedXp.toLocaleString()} XP</div>
                  <div className="text-xs text-gray-500">Total contribution</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div>
            {stats.recentAchievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏆</div>
                <div>No team achievements yet</div>
                <div className="text-sm mt-1">Keep contributing to unlock achievements!</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {stats.recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="p-4 border rounded-lg text-center">
                    <div className="text-3xl mb-2">{achievement.iconUrl}</div>
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-xs text-gray-500">{achievement.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboard;
