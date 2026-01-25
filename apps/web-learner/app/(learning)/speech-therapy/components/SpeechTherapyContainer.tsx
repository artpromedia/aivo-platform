'use client';

import { useState } from 'react';

import { ArticulationPractice } from './ArticulationPractice';
import { SpeechExercises } from './SpeechExercises';
import { SpeechProgress } from './SpeechProgress';
import { VoiceRecordings } from './VoiceRecordings';

interface SpeechTherapyContainerProps {
  learnerId: string;
}

type Tab = 'exercises' | 'articulation' | 'recordings' | 'progress';

/**
 * Speech Therapy Container Component
 *
 * Manages tab navigation between different speech therapy tools
 */
export function SpeechTherapyContainer({ learnerId }: Readonly<SpeechTherapyContainerProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('exercises');

  const tabs = [
    { id: 'exercises' as const, label: 'Exercises', icon: '🗣️' },
    { id: 'articulation' as const, label: 'Articulation', icon: '👄' },
    { id: 'recordings' as const, label: 'Recordings', icon: '🎙️' },
    { id: 'progress' as const, label: 'Progress', icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Speech Therapy Tools">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={`
                flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'exercises' && <SpeechExercises learnerId={learnerId} />}
        {activeTab === 'articulation' && <ArticulationPractice learnerId={learnerId} />}
        {activeTab === 'recordings' && <VoiceRecordings learnerId={learnerId} />}
        {activeTab === 'progress' && <SpeechProgress learnerId={learnerId} />}
      </div>
    </div>
  );
}
