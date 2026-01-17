'use client';

import { useState } from 'react';

import { TextToSpeech } from './TextToSpeech';
import { WordPrediction } from './WordPrediction';
import { ReadingComprehensionAids } from './ReadingComprehensionAids';
import { VocabularyBuilder } from './VocabularyBuilder';

interface ReadingToolsContainerProps {
  learnerId: string;
}

type Tab = 'tts' | 'prediction' | 'comprehension' | 'vocabulary';

/**
 * Reading Tools Container Component
 * 
 * Manages tab navigation between different reading support tools
 */
export function ReadingToolsContainer({ learnerId }: ReadingToolsContainerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tts');

  const tabs = [
    { id: 'tts' as const, label: 'Text-to-Speech', icon: '🔊' },
    { id: 'prediction' as const, label: 'Word Prediction', icon: '✍️' },
    { id: 'comprehension' as const, label: 'Comprehension', icon: '📖' },
    { id: 'vocabulary' as const, label: 'Vocabulary', icon: '📚' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Reading Tools">
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
        {activeTab === 'tts' && <TextToSpeech learnerId={learnerId} />}
        {activeTab === 'prediction' && <WordPrediction learnerId={learnerId} />}
        {activeTab === 'comprehension' && <ReadingComprehensionAids learnerId={learnerId} />}
        {activeTab === 'vocabulary' && <VocabularyBuilder learnerId={learnerId} />}
      </div>
    </div>
  );
}
