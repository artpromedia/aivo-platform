'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  teamsApi,
  TeamDetails,
  Team,
  Competition,
  TeamInvite,
  TEAM_TYPE_META,
} from '../../../../lib/teams-api';
import { MyTeamTab } from './MyTeamTab';
import { LeaderboardTab } from './LeaderboardTab';
import { CompetitionsTab } from './CompetitionsTab';
import { TeamSearchModal } from './TeamSearchModal';

type TabType = 'my-team' | 'leaderboard' | 'competitions';

interface TeamsContainerProps {
  learnerId: string;
}

export function TeamsContainer({ learnerId }: TeamsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('my-team');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [myTeam, setMyTeam] = useState<TeamDetails | null>(null);
  const [leaderboard, setLeaderboard] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);

  // UI states
  const [showSearchModal, setShowSearchModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [teamData, leaderboardData, competitionsData, invitesData] = await Promise.all([
        teamsApi.getStudentTeam(learnerId),
        teamsApi.getTeamLeaderboard(learnerId),
        teamsApi.getCompetitions(learnerId),
        teamsApi.getTeamInvites(learnerId),
      ]);

      setMyTeam(teamData);
      setLeaderboard(leaderboardData);
      setCompetitions(competitionsData);
      setInvites(invitesData);
    } catch (err) {
      console.error('Failed to load teams data:', err);
      setError('Failed to load teams data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLeaveTeam = async () => {
    if (!myTeam) return;

    if (!confirm('Are you sure you want to leave this team?')) {
      return;
    }

    try {
      await teamsApi.leaveTeam(learnerId, myTeam.id);
      setMyTeam(null);
      loadData();
    } catch (err) {
      console.error('Failed to leave team:', err);
      alert('Failed to leave team. Please try again.');
    }
  };

  const handleTeamJoined = () => {
    setShowSearchModal(false);
    loadData();
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'my-team', label: 'My Team', icon: '🏠' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'competitions', label: 'Competitions', icon: '🎮' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Loading teams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Invites Badge */}
        {invites.length > 0 && (
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-full hover:bg-orange-200"
          >
            <span className="mr-1">📬</span>
            {invites.length} Pending Invite{invites.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'my-team' && (
          <MyTeamTab
            team={myTeam}
            learnerId={learnerId}
            onFindTeam={() => setShowSearchModal(true)}
            onLeaveTeam={handleLeaveTeam}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab
            teams={leaderboard}
            myTeamId={myTeam?.id}
          />
        )}
        {activeTab === 'competitions' && (
          <CompetitionsTab
            competitions={competitions}
            learnerId={learnerId}
          />
        )}
      </div>

      {/* Search/Create Modal */}
      {showSearchModal && (
        <TeamSearchModal
          learnerId={learnerId}
          invites={invites}
          onClose={() => setShowSearchModal(false)}
          onTeamJoined={handleTeamJoined}
          onRefreshInvites={loadData}
        />
      )}
    </div>
  );
}
