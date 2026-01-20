'use client';

/**
 * SelfRegulationHub Component
 * Main hub for self-regulation tools - check-ins, calming space, and activities
 */

import { useState, useCallback, useEffect } from 'react';
import { useEmotionTracking } from '@/lib/self-regulation/use-emotion-tracking';
import { recordActivityCompletion } from '@/lib/self-regulation/sel-api';
import type {
  GradeBand,
  ActivityType,
  ActivityRecommendation,
  CalmingActivityType,
} from '@/lib/self-regulation/regulation-types';
import { EmotionCheckIn } from './EmotionCheckIn';
import { CalmingSpace } from './CalmingSpace';
import { RegulationActivity } from './RegulationActivity';

// ============================================================================
// Types
// ============================================================================

interface SelfRegulationHubProps {
  learnerId: string;
  gradeBand: GradeBand;
  initialTab?: TabId;
  onActivityComplete?: (activityType: ActivityType, rating?: number) => void;
}

type TabId = 'check-in' | 'calming' | 'history';
type ViewState = 'hub' | 'activity';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const TABS: Record<GradeBand, Tab[]> = {
  K5: [
    {
      id: 'check-in',
      label: 'How I Feel',
      emoji: '😊',
      description: 'Tell us how you feel',
    },
    {
      id: 'calming',
      label: 'Calm Down',
      emoji: '🌈',
      description: 'Activities to help you feel better',
    },
    {
      id: 'history',
      label: 'My Feelings',
      emoji: '📊',
      description: 'See how you felt before',
    },
  ],
  G6_8: [
    {
      id: 'check-in',
      label: 'Check In',
      emoji: '💭',
      description: 'Log how you\'re feeling',
    },
    {
      id: 'calming',
      label: 'Calming Space',
      emoji: '🧘',
      description: 'Regulation activities',
    },
    {
      id: 'history',
      label: 'History',
      emoji: '📈',
      description: 'Track your emotions',
    },
  ],
  G9_12: [
    {
      id: 'check-in',
      label: 'Emotion Check-In',
      emoji: '🎯',
      description: 'Self-assessment',
    },
    {
      id: 'calming',
      label: 'Regulation Tools',
      emoji: '⚡',
      description: 'Evidence-based techniques',
    },
    {
      id: 'history',
      label: 'Insights',
      emoji: '📊',
      description: 'Emotional patterns',
    },
  ],
};

// ============================================================================
// Component
// ============================================================================

export function SelfRegulationHub({
  learnerId,
  gradeBand,
  initialTab = 'check-in',
  onActivityComplete,
}: Readonly<SelfRegulationHubProps>) {
  // Tab and view state
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [viewState, setViewState] = useState<ViewState>('hub');
  const [selectedActivity, setSelectedActivity] = useState<{
    type: ActivityType;
    title: string;
    description: string;
    duration: number;
  } | null>(null);

  // Emotion tracking hook
  const {
    isLoading,
    error,
    profileId,
    recentCheckIns,
    moodTrends,
    recommendations,
    lastCheckIn,
    submitCheckIn,
    loadHistory,
    loadTrends,
    loadRecommendations,
    clearError,
  } = useEmotionTracking({
    learnerId,
    gradeBand,
    autoLoadHistory: true,
    historyLimit: 10,
  });

  // Load trends when history tab is selected
  useEffect(() => {
    if (activeTab === 'history' && !moodTrends) {
      void loadTrends(30);
    }
  }, [activeTab, moodTrends, loadTrends]);

  // Handle check-in submission
  const handleCheckInSubmit = useCallback(
    async (data: {
      emotion: string;
      emoji: string;
      intensity: number;
      energyLevel?: number;
      trigger?: string;
      notes?: string;
      needsSupport?: boolean;
    }) => {
      return submitCheckIn(data);
    },
    [submitCheckIn]
  );

  // Handle activity selection from recommendations
  const handleRecommendationSelect = useCallback(
    (recommendation: ActivityRecommendation) => {
      setSelectedActivity({
        type: recommendation.activity.activityType,
        title: recommendation.activity.name,
        description: recommendation.activity.description,
        duration: recommendation.activity.estimatedDurationSeconds,
      });
      setViewState('activity');
    },
    []
  );

  // Handle calming activity selection
  const handleCalmingActivitySelect = useCallback(
    (activityType: CalmingActivityType) => {
      const activityInfo: Record<CalmingActivityType, { title: string; description: string; duration: number }> = {
        breathing: {
          title: 'Breathing Exercise',
          description: 'Calm your body with guided breathing',
          duration: 120,
        },
        grounding: {
          title: '5-4-3-2-1 Grounding',
          description: 'Use your senses to feel present',
          duration: 180,
        },
        movement: {
          title: 'Movement Break',
          description: 'Release tension through gentle movement',
          duration: 120,
        },
        sounds: {
          title: 'Calming Sounds',
          description: 'Listen to peaceful sounds',
          duration: 300,
        },
        visuals: {
          title: 'Visual Calm',
          description: 'Watch soothing visuals',
          duration: 300,
        },
      };

      const info = activityInfo[activityType];
      setSelectedActivity({
        type: activityType as ActivityType,
        title: info.title,
        description: info.description,
        duration: info.duration,
      });
      setViewState('activity');
    },
    []
  );

  // Handle activity completion
  const handleActivityComplete = useCallback(
    async (rating?: number) => {
      if (selectedActivity && profileId) {
        try {
          await recordActivityCompletion(profileId, {
            activityId: `local-${selectedActivity.type}`,
            rating,
            duration: Math.round(selectedActivity.duration / 60),
            context: 'Independent',
          });
        } catch (err) {
          console.error('Failed to record activity completion:', err);
        }
      }

      onActivityComplete?.(selectedActivity?.type || 'breathing', rating);
      setViewState('hub');
      setSelectedActivity(null);
    },
    [selectedActivity, profileId, onActivityComplete]
  );

  // Handle activity cancel
  const handleActivityCancel = useCallback(() => {
    setViewState('hub');
    setSelectedActivity(null);
  }, []);

  // Handle calming space exit
  const handleCalmingExit = useCallback(() => {
    setActiveTab('check-in');
  }, []);

  // Get tabs for current grade band
  const tabs = TABS[gradeBand];

  // ============================================================================
  // Render - Activity View
  // ============================================================================

  if (viewState === 'activity' && selectedActivity) {
    return (
      <div className="max-w-2xl mx-auto">
        <RegulationActivity
          activityType={selectedActivity.type}
          title={selectedActivity.title}
          description={selectedActivity.description}
          estimatedDurationSeconds={selectedActivity.duration}
          gradeBand={gradeBand}
          onComplete={handleActivityComplete}
          onCancel={handleActivityCancel}
        />
      </div>
    );
  }

  // ============================================================================
  // Render - Main Hub
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-indigo-500 text-indigo-600 font-medium'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="text-xl block">{tab.emoji}</span>
            <span className="text-sm mt-1 block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {/* Check-in Tab */}
        {activeTab === 'check-in' && (
          <div className="space-y-6">
            {/* Last check-in reminder */}
            {lastCheckIn && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                <span>
                  {gradeBand === 'K5' ? 'Last time you felt: ' : 'Last check-in: '}
                </span>
                <span className="font-medium">
                  {lastCheckIn.emoji} {lastCheckIn.emotion}
                </span>
                <span className="text-slate-400 ml-2">
                  ({new Date(lastCheckIn.timestamp).toLocaleDateString()})
                </span>
              </div>
            )}

            <EmotionCheckIn
              gradeBand={gradeBand}
              onSubmit={handleCheckInSubmit}
              onActivitySelect={handleRecommendationSelect}
              recommendations={recommendations}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Calming Space Tab */}
        {activeTab === 'calming' && (
          <CalmingSpace
            gradeBand={gradeBand}
            onActivitySelect={handleCalmingActivitySelect}
            onExit={handleCalmingExit}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Mood trends summary */}
            {moodTrends && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {gradeBand === 'K5'
                    ? 'How you\'ve been feeling'
                    : 'Mood Trends (Last 30 Days)'}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600">
                      {moodTrends.totalCheckIns}
                    </p>
                    <p className="text-xs text-slate-600">Check-ins</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600">
                      {moodTrends.averageMood.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-600">Avg Mood</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600">
                      {moodTrends.averageEnergy.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-600">Avg Energy</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl">
                      {getMoodEmoji(Math.round(moodTrends.averageMood))}
                    </p>
                    <p className="text-xs text-slate-600">Overall</p>
                  </div>
                </div>

                {/* Top emotions */}
                {moodTrends.topEmotions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      {gradeBand === 'K5'
                        ? 'You felt these the most:'
                        : 'Most frequent emotions:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {moodTrends.topEmotions.slice(0, 5).map((item) => (
                        <span
                          key={item.emotion}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                        >
                          {item.emotion} ({item.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent check-ins */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {gradeBand === 'K5' ? 'Your feelings' : 'Recent Check-ins'}
              </h3>

              {recentCheckIns.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  {gradeBand === 'K5'
                    ? "You haven't checked in yet. Try it now!"
                    : 'No check-ins yet. Start tracking your emotions!'}
                </p>
              ) : (
                <div className="space-y-3">
                  {recentCheckIns.map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="text-2xl">{checkIn.emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {checkIn.emotion}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(checkIn.timestamp).toLocaleDateString()} at{' '}
                          {new Date(checkIn.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          Intensity: {checkIn.intensity}/5
                        </p>
                        {checkIn.trigger && (
                          <p className="text-xs text-slate-500">
                            {checkIn.trigger}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recentCheckIns.length > 0 && (
                <button
                  onClick={() => loadHistory({ pageSize: 20 })}
                  className="mt-4 w-full py-2 text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  {gradeBand === 'K5' ? 'See more' : 'Load more'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick access footer */}
      {activeTab !== 'calming' && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">
                {gradeBand === 'K5'
                  ? 'Need to calm down?'
                  : 'Need a moment to regulate?'}
              </p>
              <p className="text-sm text-slate-600">
                {gradeBand === 'K5'
                  ? 'Try breathing or stretching!'
                  : 'Access calming activities anytime'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('calming')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              {gradeBand === 'K5' ? 'Calm down' : 'Open calming space'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMoodEmoji(rating: number): string {
  const emojis = ['😟', '😕', '😐', '🙂', '😊'];
  return emojis[Math.min(Math.max(rating - 1, 0), 4)];
}

export default SelfRegulationHub;
