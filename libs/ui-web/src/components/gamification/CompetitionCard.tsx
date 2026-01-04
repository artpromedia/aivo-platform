// Competition Card Component
// Shows competition details, standings, time remaining, join/leave buttons, and progress visualization

import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface CompetitionStanding {
  rank: number;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  score: number;
  change?: number;
  isCurrentUser?: boolean;
}

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
  type: 'individual' | 'team' | 'class' | 'school';
  duration: 'daily' | 'weekly' | 'seasonal';
  category: 'xp_earned' | 'lessons_completed' | 'reading_minutes' | 'math_problems' | 'streak_days' | 'perfect_scores';
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  currentParticipants: number;
  maxParticipants: number;
  prizes: CompetitionPrize[];
}

interface CompetitionCardProps {
  competition: Competition;
  standings?: CompetitionStanding[];
  userParticipant?: { rank?: number; score: number };
  onJoin?: () => void;
  onLeave?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CompetitionCard: React.FC<CompetitionCardProps> = ({
  competition,
  standings = [],
  userParticipant,
  onJoin,
  onLeave,
  onViewDetails,
  compact = false,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const end = new Date(competition.endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [competition.endDate]);

  const getTypeColor = () => {
    switch (competition.type) {
      case 'individual':
        return 'bg-blue-500';
      case 'team':
        return 'bg-purple-500';
      case 'class':
        return 'bg-green-500';
      case 'school':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryIcon = () => {
    switch (competition.category) {
      case 'xp_earned':
        return '⭐';
      case 'lessons_completed':
        return '📚';
      case 'reading_minutes':
        return '📖';
      case 'math_problems':
        return '🔢';
      case 'streak_days':
        return '🔥';
      case 'perfect_scores':
        return '💯';
      default:
        return '🏆';
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      upcoming: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[competition.status]}`}>
        {competition.status.toUpperCase()}
      </span>
    );
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow border hover:shadow-md transition cursor-pointer" onClick={onViewDetails}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">{getCategoryIcon()}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{competition.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs text-white rounded ${getTypeColor()}`}>
                    {competition.type}
                  </span>
                  {getStatusBadge()}
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-gray-500">⏰ {timeRemaining}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="text-gray-600">
              {competition.currentParticipants}/{competition.maxParticipants} participants
            </div>
            {userParticipant && (
              <div className="text-blue-600 font-medium">
                Rank #{userParticipant.rank || '?'} • {userParticipant.score} pts
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`${getTypeColor()} text-white p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">{getCategoryIcon()}</div>
            <div>
              <h2 className="text-2xl font-bold">{competition.name}</h2>
              <p className="text-white/90 text-sm mt-1">{competition.description}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  {competition.type.toUpperCase()}
                </span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  {competition.duration.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{timeRemaining}</div>
          <div className="text-xs text-gray-500">Time Remaining</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {competition.currentParticipants}/{competition.maxParticipants}
          </div>
          <div className="text-xs text-gray-500">Participants</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{competition.prizes.length}</div>
          <div className="text-xs text-gray-500">Prize Tiers</div>
        </div>
      </div>

      {/* Your Standing (if participating) */}
      {userParticipant && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Your Standing</div>
              <div className="text-2xl font-bold text-blue-600">
                Rank #{userParticipant.rank || '?'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Score</div>
              <div className="text-2xl font-bold text-gray-900">{userParticipant.score}</div>
            </div>
          </div>
        </div>
      )}

      {/* Standings */}
      {standings.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 mb-3">Leaderboard</h3>
          <div className="space-y-2">
            {standings.slice(0, 5).map((standing) => (
              <div
                key={standing.participantId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  standing.isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      standing.rank === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : standing.rank === 2
                        ? 'bg-gray-300 text-gray-700'
                        : standing.rank === 3
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {standing.rank}
                  </div>
                  <div>
                    <div className="font-medium">
                      {standing.participantName}
                      {standing.isCurrentUser && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </div>
                    {standing.change !== undefined && standing.change !== 0 && (
                      <div className="text-xs text-gray-500">
                        {standing.change > 0 ? '↑' : '↓'} {Math.abs(standing.change)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{standing.score}</div>
              </div>
            ))}
          </div>
          {standings.length > 5 && onViewDetails && (
            <button
              onClick={onViewDetails}
              className="w-full mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Full Standings →
            </button>
          )}
        </div>
      )}

      {/* Prizes */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900 mb-3">Prizes</h3>
        <div className="space-y-2">
          {competition.prizes.slice(0, 3).map((prize) => (
            <div key={prize.rank} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-700">
                {prize.rank === 1 && '🥇 '}
                {prize.rank === 2 && '🥈 '}
                {prize.rank === 3 && '🥉 '}
                {prize.rank > 3 && `#${prize.rank} `}
                Place
              </div>
              <div className="flex items-center space-x-3 text-sm">
                {prize.xp && (
                  <span className="text-amber-600 font-medium">+{prize.xp} XP</span>
                )}
                {prize.coins && (
                  <span className="text-yellow-600 font-medium">+{prize.coins} 🪙</span>
                )}
                {prize.gems && (
                  <span className="text-purple-600 font-medium">+{prize.gems} 💎</span>
                )}
                {prize.badge && (
                  <span className="text-blue-600 font-medium">{prize.badge}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50">
        {competition.status === 'active' || competition.status === 'upcoming' ? (
          <div className="flex space-x-2">
            {userParticipant ? (
              <>
                {onLeave && competition.status === 'upcoming' && (
                  <button
                    onClick={onLeave}
                    className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg font-medium transition"
                  >
                    Leave Competition
                  </button>
                )}
                {onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                  >
                    View Details
                  </button>
                )}
              </>
            ) : (
              <>
                {onJoin && (
                  <button
                    onClick={onJoin}
                    disabled={competition.currentParticipants >= competition.maxParticipants}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {competition.currentParticipants >= competition.maxParticipants
                      ? 'Full'
                      : 'Join Competition'}
                  </button>
                )}
                {onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg font-medium transition"
                  >
                    View Details
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-2">
            {competition.status === 'completed' ? 'Competition Ended' : 'Competition Cancelled'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionCard;
