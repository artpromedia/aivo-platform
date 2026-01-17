'use client';

import { useEffect, useState } from 'react';
import { FocusTimer } from './FocusTimer';
import { FocusStats } from './FocusStats';
import { FocusSettings } from './FocusSettings';
import { getActiveSession, getFocusStats, getFocusPreferences } from '../../../../lib/focus-api';
import type { FocusSession, FocusStats as FocusStatsType, FocusPreferences } from '../../../../lib/focus-api';

interface FocusToolsContainerProps {
  learnerId: string;
}

type TabType = 'timer' | 'stats' | 'settings';

/**
 * Focus Tools Container
 * 
 * Main container component that manages state and data fetching
 * for all focus tools features
 */
export function FocusToolsContainer({ learnerId }: Readonly<FocusToolsContainerProps>) {
  const [activeTab, setActiveTab] = useState<TabType>('timer');
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [stats, setStats] = useState<FocusStatsType | null>(null);
  const [preferences, setPreferences] = useState<FocusPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [learnerId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [session, statsData, prefsData] = await Promise.all([
        getActiveSession(learnerId),
        getFocusStats(learnerId),
        getFocusPreferences(learnerId),
      ]);

      setActiveSession(session);
      setStats(statsData);
      setPreferences(prefsData);
    } catch (err) {
      console.error('Failed to load focus data:', err);
      setError('Failed to load focus tools. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSessionUpdate(session: FocusSession | null) {
    setActiveSession(session);
    // Reload stats when session changes
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">Loading focus tools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('timer')}
          className={`rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'timer'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⏱️ Timer
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'stats'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📊 Stats
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'settings'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'timer' && preferences && (
        <FocusTimer
          learnerId={learnerId}
          activeSession={activeSession}
          preferences={preferences}
          onSessionUpdate={handleSessionUpdate}
        />
      )}

      {activeTab === 'stats' && stats && <FocusStats stats={stats} />}

      {activeTab === 'settings' && preferences && (
        <FocusSettings
          learnerId={learnerId}
          preferences={preferences}
          onUpdate={(updated) => setPreferences(updated)}
        />
      )}
    </div>
  );
}
