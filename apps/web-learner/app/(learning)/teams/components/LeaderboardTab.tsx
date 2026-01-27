'use client';

import { Team, TEAM_TYPE_META } from '../../../../lib/teams-api';

interface LeaderboardTabProps {
  teams: Team[];
  myTeamId?: string;
}

export function LeaderboardTab({ teams, myTeamId }: LeaderboardTabProps) {
  if (teams.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Teams Yet</h3>
        <p className="text-slate-600">Be the first to create a team and top the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {teams.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="order-1">
            <PodiumCard team={teams[1]} position={2} isMyTeam={teams[1].id === myTeamId} />
          </div>
          {/* 1st Place */}
          <div className="order-2">
            <PodiumCard team={teams[0]} position={1} isMyTeam={teams[0].id === myTeamId} />
          </div>
          {/* 3rd Place */}
          <div className="order-3">
            <PodiumCard team={teams[2]} position={3} isMyTeam={teams[2].id === myTeamId} />
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900">All Teams</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {teams.map((team, index) => (
            <LeaderboardRow
              key={team.id}
              team={team}
              rank={index + 1}
              isMyTeam={team.id === myTeamId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  team,
  position,
  isMyTeam,
}: {
  team: Team;
  position: 1 | 2 | 3;
  isMyTeam: boolean;
}) {
  const typeMeta = TEAM_TYPE_META[team.type];

  const positionStyles = {
    1: {
      height: 'h-40',
      emoji: '🥇',
      gradient: 'from-yellow-400 to-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      marginTop: 'mt-0',
    },
    2: {
      height: 'h-32',
      emoji: '🥈',
      gradient: 'from-gray-300 to-gray-500',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      marginTop: 'mt-8',
    },
    3: {
      height: 'h-28',
      emoji: '🥉',
      gradient: 'from-orange-400 to-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      marginTop: 'mt-12',
    },
  };

  const style = positionStyles[position];

  return (
    <div className={`${style.marginTop}`}>
      <div
        className={`${style.bg} border ${style.border} rounded-xl p-4 text-center ${
          isMyTeam ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <div className="text-4xl mb-2">{style.emoji}</div>
        <h4 className="font-semibold text-slate-900 truncate">{team.name}</h4>
        <div className="text-sm text-slate-500 mb-2">
          {typeMeta.icon} {typeMeta.label}
        </div>
        <div className="text-lg font-bold text-slate-900">
          {team.totalXp.toLocaleString()} XP
        </div>
        <div className="text-xs text-slate-500">
          +{team.weeklyXp.toLocaleString()} this week
        </div>
        {isMyTeam && (
          <div className="mt-2 text-xs text-blue-600 font-medium">Your Team</div>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({
  team,
  rank,
  isMyTeam,
}: {
  team: Team;
  rank: number;
  isMyTeam: boolean;
}) {
  const typeMeta = TEAM_TYPE_META[team.type];

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-800' };
    if (rank === 2) return { emoji: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' };
    if (rank === 3) return { emoji: '🥉', bg: 'bg-orange-100', text: 'text-orange-800' };
    return { emoji: `${rank}`, bg: 'bg-slate-100', text: 'text-slate-600' };
  };

  const rankDisplay = getRankDisplay(rank);

  return (
    <div
      className={`flex items-center px-6 py-4 hover:bg-slate-50 transition-colors ${
        isMyTeam ? 'bg-blue-50' : ''
      }`}
    >
      {/* Rank */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${rankDisplay.bg} ${rankDisplay.text}`}
      >
        {rank <= 3 ? rankDisplay.emoji : rank}
      </div>

      {/* Team Info */}
      <div className="flex-1 ml-4">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-slate-900">{team.name}</h4>
          {isMyTeam && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              Your Team
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 flex items-center space-x-3 mt-0.5">
          <span>{typeMeta.icon} {typeMeta.label}</span>
          <span>•</span>
          <span>{team.memberCount} members</span>
          <span>•</span>
          <span>Level {team.level}</span>
        </div>
      </div>

      {/* XP Stats */}
      <div className="text-right">
        <div className="font-semibold text-slate-900">{team.totalXp.toLocaleString()} XP</div>
        <div className="text-sm text-green-600">+{team.weeklyXp.toLocaleString()} this week</div>
      </div>
    </div>
  );
}
