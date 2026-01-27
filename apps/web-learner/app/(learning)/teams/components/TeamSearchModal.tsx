'use client';

import { useState, useEffect } from 'react';
import {
  teamsApi,
  Team,
  TeamInvite,
  TeamType,
  CreateTeamRequest,
  TEAM_TYPE_META,
} from '../../../../lib/teams-api';

interface TeamSearchModalProps {
  learnerId: string;
  invites: TeamInvite[];
  onClose: () => void;
  onTeamJoined: () => void;
  onRefreshInvites: () => void;
}

type ModalTab = 'search' | 'invites' | 'create';

export function TeamSearchModal({
  learnerId,
  invites,
  onClose,
  onTeamJoined,
  onRefreshInvites,
}: TeamSearchModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('search');

  const pendingInvites = invites.filter((inv) => inv.status === 'pending');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Find or Create Team</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <TabButton
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            icon="🔍"
            label="Search"
          />
          <TabButton
            active={activeTab === 'invites'}
            onClick={() => setActiveTab('invites')}
            icon="📬"
            label="Invites"
            badge={pendingInvites.length}
          />
          <TabButton
            active={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
            icon="➕"
            label="Create"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'search' && (
            <SearchTab
              learnerId={learnerId}
              onTeamJoined={onTeamJoined}
            />
          )}
          {activeTab === 'invites' && (
            <InvitesTab
              invites={pendingInvites}
              learnerId={learnerId}
              onRefresh={onRefreshInvites}
              onTeamJoined={onTeamJoined}
            />
          )}
          {activeTab === 'create' && (
            <CreateTab
              learnerId={learnerId}
              onTeamCreated={onTeamJoined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function SearchTab({
  learnerId,
  onTeamJoined,
}: {
  learnerId: string;
  onTeamJoined: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Team[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const teams = await teamsApi.searchTeams(learnerId, query);
        setResults(teams);
        setHasSearched(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, learnerId]);

  const handleJoin = async (teamId: string, teamName: string) => {
    if (!confirm(`Join team "${teamName}"?`)) return;

    try {
      await teamsApi.joinTeam(learnerId, teamId);
      onTeamJoined();
    } catch (err) {
      console.error('Failed to join team:', err);
      alert('Failed to join team. Please try again.');
    }
  };

  return (
    <div className="p-6">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams by name..."
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {isSearching ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-4 space-y-3">
        {!hasSearched && query.length < 2 && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>Enter at least 2 characters to search</p>
          </div>
        )}

        {hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">😕</div>
            <p>No teams found matching "{query}"</p>
            <p className="text-sm mt-1">Try a different search or create your own team!</p>
          </div>
        )}

        {results.map((team) => {
          const typeMeta = TEAM_TYPE_META[team.type];
          return (
            <div
              key={team.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-white"
                  style={{ backgroundColor: typeMeta.color }}
                >
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{team.name}</h4>
                  <div className="text-sm text-slate-500 flex items-center space-x-2">
                    <span>{typeMeta.icon} {typeMeta.label}</span>
                    <span>•</span>
                    <span>{team.memberCount}/{team.maxMembers} members</span>
                    <span>•</span>
                    <span>Level {team.level}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleJoin(team.id, team.name)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Join
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvitesTab({
  invites,
  learnerId,
  onRefresh,
  onTeamJoined,
}: {
  invites: TeamInvite[];
  learnerId: string;
  onRefresh: () => void;
  onTeamJoined: () => void;
}) {
  const [responding, setResponding] = useState<string | null>(null);

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setResponding(inviteId);
    try {
      await teamsApi.respondToTeamInvite(learnerId, inviteId, accept);
      if (accept) {
        onTeamJoined();
      } else {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to respond to invite:', err);
      alert('Failed to respond to invite. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  if (invites.length === 0) {
    return (
      <div className="p-6 text-center py-12 text-slate-500">
        <div className="text-4xl mb-2">📭</div>
        <p>No pending invites</p>
        <p className="text-sm mt-1">When someone invites you to a team, it will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {invites.map((invite) => {
        const isExpired = new Date(invite.expiresAt) < new Date();
        return (
          <div
            key={invite.id}
            className={`p-4 rounded-lg border ${
              isExpired ? 'bg-slate-50 border-slate-200' : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">{invite.teamName}</h4>
                <p className="text-sm text-slate-600">
                  Invited by {invite.inviterName}
                </p>
                {isExpired ? (
                  <p className="text-sm text-red-600 mt-1">Expired</p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {!isExpired && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRespond(invite.id, false)}
                    disabled={responding === invite.id}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespond(invite.id, true)}
                    disabled={responding === invite.id}
                    className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {responding === invite.id ? 'Joining...' : 'Accept'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateTab({
  learnerId,
  onTeamCreated,
}: {
  learnerId: string;
  onTeamCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TeamType>('classroom');
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const data: CreateTeamRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        isPublic,
      };

      await teamsApi.createTeam(learnerId, data);
      onTeamCreated();
    } catch (err) {
      console.error('Failed to create team:', err);
      setError('Failed to create team. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Team Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Team Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Enter team name"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">{name.length}/50 characters</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Describe your team..."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">{description.length}/200 characters</p>
      </div>

      {/* Team Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Team Type
        </label>
        <div className="flex space-x-2">
          {(Object.entries(TEAM_TYPE_META) as [TeamType, typeof TEAM_TYPE_META.classroom][]).map(
            ([typeKey, meta]) => (
              <button
                key={typeKey}
                onClick={() => setType(typeKey)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  type === typeKey
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-lg mr-1">{meta.icon}</span>
                {meta.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Public/Private Toggle */}
      <div>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-medium text-slate-700">Public Team</span>
            <p className="text-sm text-slate-500">
              {isPublic
                ? 'Anyone can search and join your team'
                : 'Only invited members can join'}
            </p>
          </div>
          <div
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isPublic ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                isPublic ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={isCreating || !name.trim()}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {isCreating ? 'Creating Team...' : 'Create Team'}
      </button>
    </div>
  );
}
