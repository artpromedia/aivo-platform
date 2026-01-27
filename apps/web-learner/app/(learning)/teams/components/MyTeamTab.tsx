'use client';

import {
  TeamDetails,
  TeamMember,
  TEAM_TYPE_META,
  MEMBER_ROLE_META,
} from '../../../../lib/teams-api';

interface MyTeamTabProps {
  team: TeamDetails | null;
  learnerId: string;
  onFindTeam: () => void;
  onLeaveTeam: () => void;
}

export function MyTeamTab({ team, learnerId, onFindTeam, onLeaveTeam }: MyTeamTabProps) {
  if (!team) {
    return <NoTeamState onFindTeam={onFindTeam} />;
  }

  const typeMeta = TEAM_TYPE_META[team.type];
  const sortedMembers = [...team.members].sort((a, b) => b.contributedXp - a.contributedXp);

  // Get rank display
  const getRankDisplay = (rank?: number) => {
    if (!rank) return null;
    if (rank === 1) return { emoji: '🥇', color: 'from-yellow-400 to-yellow-600' };
    if (rank === 2) return { emoji: '🥈', color: 'from-gray-300 to-gray-500' };
    if (rank === 3) return { emoji: '🥉', color: 'from-orange-400 to-orange-600' };
    return { emoji: `#${rank}`, color: 'from-blue-400 to-blue-600' };
  };

  const rankDisplay = getRankDisplay(team.rank);

  return (
    <div className="space-y-6">
      {/* Team Header Card */}
      <div
        className="rounded-xl p-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${typeMeta.color}, ${typeMeta.color}dd)`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
              ⚔️
            </div>
            <div>
              <h2 className="text-2xl font-bold">{team.name}</h2>
              <p className="text-white/80 mt-1">{team.description}</p>
              <div className="flex items-center mt-2 space-x-2">
                <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                  {typeMeta.icon} {typeMeta.label}
                </span>
                <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                  Level {team.level}
                </span>
              </div>
            </div>
          </div>

          {/* Rank Badge */}
          {rankDisplay && (
            <div className="text-right">
              <div className="text-4xl">{rankDisplay.emoji}</div>
              <div className="text-sm text-white/80 mt-1">Global Rank</div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{team.totalXp.toLocaleString()}</div>
            <div className="text-sm text-white/70">Total XP</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{team.weeklyXp.toLocaleString()}</div>
            <div className="text-sm text-white/70">This Week</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{team.memberCount}/{team.maxMembers}</div>
            <div className="text-sm text-white/70">Members</div>
          </div>
        </div>
      </div>

      {/* Competition Standings */}
      {team.competitions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Active Competitions
          </h3>
          <div className="space-y-3">
            {team.competitions.map((comp) => (
              <div
                key={comp.competitionId}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
              >
                <div>
                  <h4 className="font-medium text-slate-900">{comp.competitionName}</h4>
                  <p className="text-sm text-slate-600 flex items-center mt-1">
                    <span className="mr-1">⏰</span>
                    {comp.timeRemaining} remaining
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    #{comp.rank}
                  </div>
                  <div className="text-sm text-slate-500">
                    of {comp.totalParticipants}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <span className="mr-2">👥</span>
          Team Members
        </h3>
        <div className="space-y-3">
          {sortedMembers.map((member, index) => (
            <MemberCard key={member.id} member={member} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={onLeaveTeam}
          className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
        >
          Leave Team
        </button>
      </div>
    </div>
  );
}

function MemberCard({ member, rank }: { member: TeamMember; rank: number }) {
  const roleMeta = MEMBER_ROLE_META[member.role];

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800';
    if (rank === 2) return 'bg-gray-100 text-gray-700';
    if (rank === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(rank)}`}>
        {rank}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium ml-3">
        {member.displayName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 ml-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-slate-900">{member.displayName}</span>
          {member.role !== 'member' && (
            <span className="text-sm">{roleMeta.icon}</span>
          )}
        </div>
        <div className="text-sm text-slate-500">
          Level {member.level || 1} • +{member.weeklyContribution} XP this week
        </div>
      </div>

      {/* Contribution */}
      <div className="text-right">
        <div className="font-semibold text-slate-900">{member.contributedXp.toLocaleString()}</div>
        <div className="text-xs text-slate-500">Total XP</div>
      </div>
    </div>
  );
}

function NoTeamState({ onFindTeam }: { onFindTeam: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
        ⚔️
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">No Team Yet</h2>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        Join or create a team to collaborate with others, compete in challenges, and earn rewards together!
      </p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onFindTeam}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Find or Create a Team
        </button>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-6 mt-12 text-left max-w-2xl mx-auto">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-2">🤝</div>
          <h3 className="font-medium text-slate-900 mb-1">Collaborate</h3>
          <p className="text-sm text-slate-600">Work together with teammates to achieve goals</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl mb-2">🏆</div>
          <h3 className="font-medium text-slate-900 mb-1">Compete</h3>
          <p className="text-sm text-slate-600">Join team competitions for special rewards</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl mb-2">⬆️</div>
          <h3 className="font-medium text-slate-900 mb-1">Level Up</h3>
          <p className="text-sm text-slate-600">Earn bonus XP and exclusive badges</p>
        </div>
      </div>
    </div>
  );
}
