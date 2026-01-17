'use client';

import { useState } from 'react';
import { GraphicOrganizers } from './GraphicOrganizers';
import { SentenceStarters } from './SentenceStarters';
import { GrammarHelp } from './GrammarHelp';
import { WritingTemplates } from './WritingTemplates';

interface WritingToolsContainerProps {
  learnerId: string;
}

type Tab = 'organizers' | 'starters' | 'grammar' | 'templates';

/**
 * Container component for all writing tools
 * Manages tab navigation between different writing features
 */
export function WritingToolsContainer({ learnerId }: Readonly<WritingToolsContainerProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('organizers');

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'organizers', label: 'Graphic Organizers', icon: '🗂️' },
    { id: 'starters', label: 'Sentence Starters', icon: '💬' },
    { id: 'grammar', label: 'Grammar Help', icon: '✏️' },
    { id: 'templates', label: 'Writing Templates', icon: '📄' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'organizers' && <GraphicOrganizers learnerId={learnerId} />}
        {activeTab === 'starters' && <SentenceStarters learnerId={learnerId} />}
        {activeTab === 'grammar' && <GrammarHelp />}
        {activeTab === 'templates' && <WritingTemplates learnerId={learnerId} />}
      </div>
    </div>
  );
}
