'use client';

import { useState } from 'react';
import {
  Competition,
  CompetitionPrize,
  COMPETITION_STATUS_META,
  teamsApi,
} from '../../../../lib/teams-api';

interface CompetitionsTabProps {
  competitions: Competition[];
  learnerId: string;
}

export function CompetitionsTab({ competitions, learnerId }: CompetitionsTabProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);

  const filteredCompetitions = competitions.filter((comp) => {
    if (filter === 'all') return true;
    return comp.status === filter;
  });

  const activeCompetitions = competitions.filter((c) => c.status === 'active');
  const upcomingCompetitions = competitions.filter((c) => c.status === 'upcoming');

  if (competitions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Competitions Available</h3>
        <p className="text-slate-600">Check back later for exciting team competitions!</p>
      </div>
    );
  }

  if (selectedCompetition) {
    return (
      <CompetitionDetails
        competition={selectedCompetition}
        learnerId={learnerId}
        onBack={() => setSelectedCompetition(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="All"
          count={competitions.length}
        />
        <FilterButton
          active={filter === 'active'}
          onClick={() => setFilter('active')}
          label="Active"
          count={activeCompetitions.length}
          color="green"
        />
        <FilterButton
          active={filter === 'upcoming'}
          onClick={() => setFilter('upcoming')}
          label="Upcoming"
          count={upcomingCompetitions.length}
          color="blue"
        />
      </div>

      {/* Competition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCompetitions.map((competition) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            onClick={() => setSelectedCompetition(competition)}
          />
        ))}
      </div>

      {filteredCompetitions.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">No competitions found for this filter.</p>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'green' | 'blue';
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      <span
        className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
          active ? 'bg-white/20' : color ? colorClasses[color] : 'bg-slate-200'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CompetitionCard({
  competition,
  onClick,
}: {
  competition: Competition;
  onClick: () => void;
}) {
  const statusMeta = COMPETITION_STATUS_META[competition.status];

  const getTimeDisplay = () => {
    const now = new Date();
    const start = new Date(competition.startDate);
    const end = new Date(competition.endDate);

    if (competition.status === 'upcoming') {
      const diff = start.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    }

    if (competition.status === 'active') {
      const diff = end.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days > 1) return `${days} days left`;
      const hours = Math.ceil(diff / (1000 * 60 * 60));
      return `${hours} hours left`;
    }

    return 'Ended';
  };

  const topPrize = competition.prizes[0];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: `${statusMeta.color}20`,
            color: statusMeta.color,
          }}
        >
          {statusMeta.icon} {statusMeta.label}
        </span>
        <span className="text-sm text-slate-500">{getTimeDisplay()}</span>
      </div>

      {/* Competition Info */}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{competition.name}</h3>
      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{competition.description}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className="text-slate-500">
            👥 {competition.currentParticipants}
            {competition.maxParticipants ? `/${competition.maxParticipants}` : ''} participants
          </span>
        </div>
        {topPrize && (
          <span className="text-amber-600 font-medium">
            🏆 {getPrizeDisplay(topPrize)}
          </span>
        )}
      </div>
    </div>
  );
}

function getPrizeDisplay(prize: CompetitionPrize): string {
  const parts: string[] = [];
  if (prize.xp) parts.push(`${prize.xp} XP`);
  if (prize.coins) parts.push(`${prize.coins} coins`);
  if (prize.gems) parts.push(`${prize.gems} gems`);
  if (prize.title) parts.push(prize.title);
  if (prize.badge) parts.push('Badge');
  return parts.join(' + ') || 'Special Prize';
}

function CompetitionDetails({
  competition,
  learnerId,
  onBack,
}: {
  competition: Competition;
  learnerId: string;
  onBack: () => void;
}) {
  const [isJoining, setIsJoining] = useState(false);
  const statusMeta = COMPETITION_STATUS_META[competition.status];

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await teamsApi.joinCompetition(learnerId, competition.id);
      alert('Successfully joined the competition!');
    } catch (err) {
      console.error('Failed to join competition:', err);
      alert('Failed to join competition. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center text-slate-600 hover:text-slate-900"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Competitions
      </button>

      {/* Competition Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div
          className="p-6"
          style={{
            background: `linear-gradient(135deg, ${statusMeta.color}20, ${statusMeta.color}10)`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-3"
                style={{
                  backgroundColor: statusMeta.color,
                  color: 'white',
                }}
              >
                {statusMeta.icon} {statusMeta.label}
              </span>
              <h2 className="text-2xl font-bold text-slate-900">{competition.name}</h2>
              <p className="text-slate-600 mt-2">{competition.description}</p>
            </div>
            {competition.status === 'active' && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isJoining ? 'Joining...' : 'Join Competition'}
              </button>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex items-center space-x-6 mt-4 text-sm text-slate-600">
            <span>
              📅 {new Date(competition.startDate).toLocaleDateString()} -{' '}
              {new Date(competition.endDate).toLocaleDateString()}
            </span>
            <span>
              👥 {competition.currentParticipants}
              {competition.maxParticipants ? `/${competition.maxParticipants}` : ''} participants
            </span>
            <span className="capitalize">🎯 {competition.category.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Prizes */}
        <div className="p-6 border-t border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Prizes
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {competition.prizes.map((prize, index) => (
              <PrizeCard key={index} prize={prize} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrizeCard({ prize }: { prize: CompetitionPrize }) {
  const rankEmojis = ['🥇', '🥈', '🥉'];
  const rankColors = [
    'from-yellow-100 to-yellow-200 border-yellow-300',
    'from-gray-100 to-gray-200 border-gray-300',
    'from-orange-100 to-orange-200 border-orange-300',
  ];

  return (
    <div
      className={`bg-gradient-to-br ${rankColors[prize.rank - 1] || 'from-slate-100 to-slate-200 border-slate-300'} border rounded-lg p-4 text-center`}
    >
      <div className="text-3xl mb-2">{rankEmojis[prize.rank - 1] || `#${prize.rank}`}</div>
      <div className="text-sm font-medium text-slate-900 mb-2">
        {prize.rank === 1 ? '1st Place' : prize.rank === 2 ? '2nd Place' : prize.rank === 3 ? '3rd Place' : `${prize.rank}th Place`}
      </div>
      <div className="space-y-1 text-sm text-slate-700">
        {prize.xp && <div>⭐ {prize.xp} XP</div>}
        {prize.coins && <div>🪙 {prize.coins} Coins</div>}
        {prize.gems && <div>💎 {prize.gems} Gems</div>}
        {prize.badge && <div>🏅 {prize.badge}</div>}
        {prize.title && <div>🎖️ "{prize.title}"</div>}
      </div>
    </div>
  );
}
