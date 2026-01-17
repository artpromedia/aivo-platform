'use client';

import { useState } from 'react';

import { MoodCheckIn } from './MoodCheckIn';
import { EmotionRegulation } from './EmotionRegulation';
import { SocialStories } from './SocialStories';
import { SelfAdvocacy } from './SelfAdvocacy';

interface SELContainerProps {
  learnerId: string;
}

type Tab = 'mood' | 'regulation' | 'stories' | 'advocacy';

/**
 * SEL Container Component
 * 
 * Manages tab navigation between different SEL tools
 */
export function SELContainer({ learnerId }: Readonly<SELContainerProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('mood');

  const tabs = [
    { id: 'mood' as const, label: 'Mood Check-In', icon: '😊' },
    { id: 'regulation' as const, label: 'Coping Strategies', icon: '🧘' },
    { id: 'stories' as const, label: 'Social Stories', icon: '📖' },
    { id: 'advocacy' as const, label: 'Self-Advocacy', icon: '💪' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="SEL Tools">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
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
        {activeTab === 'mood' && <MoodCheckIn learnerId={learnerId} />}
        {activeTab === 'regulation' && <EmotionRegulation learnerId={learnerId} />}
        {activeTab === 'stories' && <SocialStories learnerId={learnerId} />}
        {activeTab === 'advocacy' && <SelfAdvocacy learnerId={learnerId} />}
      </div>
    </div>
  );
}
