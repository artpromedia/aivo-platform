'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  motorSkillsApi,
  HandwritingExercise,
  FineMotorActivity,
  GrossMotorExercise,
  AdaptiveInputProfile,
  HANDWRITING_LEVEL_META,
  FINE_MOTOR_TYPE_META,
  GROSS_MOTOR_TYPE_META,
} from '../../../../lib/motor-skills-api';
import { HandwritingSection } from './HandwritingSection';
import { FineMotorSection } from './FineMotorSection';
import { GrossMotorSection } from './GrossMotorSection';
import { AdaptiveSettingsModal } from './AdaptiveSettingsModal';

type TabType = 'handwriting' | 'fine-motor' | 'gross-motor';

interface MotorSkillsContainerProps {
  learnerId: string;
}

export function MotorSkillsContainer({ learnerId }: MotorSkillsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('handwriting');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [handwritingExercises, setHandwritingExercises] = useState<HandwritingExercise[]>([]);
  const [fineMotorActivities, setFineMotorActivities] = useState<FineMotorActivity[]>([]);
  const [grossMotorExercises, setGrossMotorExercises] = useState<GrossMotorExercise[]>([]);
  const [adaptiveProfile, setAdaptiveProfile] = useState<AdaptiveInputProfile | null>(null);

  // UI states
  const [showSettings, setShowSettings] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [handwriting, fineMotor, grossMotor, profile] = await Promise.all([
        motorSkillsApi.getHandwritingExercises(learnerId),
        motorSkillsApi.getFineMotorActivities(learnerId),
        motorSkillsApi.getGrossMotorExercises(learnerId),
        motorSkillsApi.getAdaptiveProfile(learnerId),
      ]);

      setHandwritingExercises(handwriting);
      setFineMotorActivities(fineMotor);
      setGrossMotorExercises(grossMotor);
      setAdaptiveProfile(profile);
    } catch (err) {
      console.error('Failed to load motor skills data:', err);
      setError('Failed to load motor skills data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveAdaptiveProfile = async (profile: AdaptiveInputProfile) => {
    try {
      const updated = await motorSkillsApi.updateAdaptiveProfile(learnerId, profile);
      setAdaptiveProfile(updated);
      setShowSettings(false);
    } catch (err) {
      console.error('Failed to save adaptive profile:', err);
    }
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'handwriting', label: 'Handwriting', icon: '✍️' },
    { id: 'fine-motor', label: 'Fine Motor', icon: '👆' },
    { id: 'gross-motor', label: 'Gross Motor', icon: '🏃' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Loading motor skills...</span>
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

        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Adaptive Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'handwriting' && (
          <HandwritingSection
            exercises={handwritingExercises}
            learnerId={learnerId}
            adaptiveProfile={adaptiveProfile}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'fine-motor' && (
          <FineMotorSection
            activities={fineMotorActivities}
            learnerId={learnerId}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'gross-motor' && (
          <GrossMotorSection
            exercises={grossMotorExercises}
            learnerId={learnerId}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* Adaptive Settings Modal */}
      {showSettings && adaptiveProfile && (
        <AdaptiveSettingsModal
          profile={adaptiveProfile}
          onSave={handleSaveAdaptiveProfile}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
