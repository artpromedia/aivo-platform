'use client';

import { useState } from 'react';
import { NoteTakingTemplates } from './NoteTakingTemplates';
import { StudyGuides } from './StudyGuides';
import { MemoryTechniques } from './MemoryTechniques';
import { TestPrep } from './TestPrep';

export function StudySkillsContainer() {
  const [activeTab, setActiveTab] = useState<'notes' | 'guides' | 'memory' | 'test'>('notes');

  return (
    <div className="min-h-screen">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex gap-4 px-6 pt-4">
          <button
            onClick={() => setActiveTab('notes')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            📝 Note Templates
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'guides'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            📚 Study Guides
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'memory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            🧠 Memory Techniques
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'test'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            ✅ Test Prep
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'notes' && <NoteTakingTemplates />}
        {activeTab === 'guides' && <StudyGuides />}
        {activeTab === 'memory' && <MemoryTechniques />}
        {activeTab === 'test' && <TestPrep />}
      </div>
    </div>
  );
}
