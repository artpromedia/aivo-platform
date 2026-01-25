'use client';

import { useState } from 'react';

import { HomeworkHistory } from './HomeworkHistory';
import { HomeworkInput } from './HomeworkInput';
import { HomeworkSteps } from './HomeworkSteps';

interface HomeworkHelperContainerProps {
  learnerId: string;
}

type Tab = 'new' | 'active' | 'history';

export function HomeworkHelperContainer({ learnerId }: Readonly<HomeworkHelperContainerProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'new', label: 'New Problem', icon: '➕' },
    { id: 'active', label: 'Current Session', icon: '📝' },
    { id: 'history', label: 'History', icon: '📚' },
  ];

  const handleSessionStart = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setActiveTab('active');
  };

  const handleSessionComplete = () => {
    setActiveSessionId(null);
    setActiveTab('history');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
        <h1 className="text-2xl font-bold">Homework Helper</h1>
        <p className="mt-1 text-blue-100">
          Get step-by-step guidance to solve your homework problems
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 rounded-xl bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            disabled={tab.id === 'active' && !activeSessionId}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        {activeTab === 'new' && (
          <HomeworkInput learnerId={learnerId} onSessionStart={handleSessionStart} />
        )}
        {activeTab === 'active' && activeSessionId && (
          <HomeworkSteps
            learnerId={learnerId}
            sessionId={activeSessionId}
            onComplete={handleSessionComplete}
          />
        )}
        {activeTab === 'history' && (
          <HomeworkHistory learnerId={learnerId} onResume={handleSessionStart} />
        )}
      </div>
    </div>
  );
}
