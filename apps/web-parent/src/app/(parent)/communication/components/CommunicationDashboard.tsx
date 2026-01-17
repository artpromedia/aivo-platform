'use client';

import { useState } from 'react';
import { ProgressUpdates } from './ProgressUpdates';
import { MessageCenter } from './MessageCenter';
import { GoalSharing } from './GoalSharing';
import { ResourceHub } from './ResourceHub';

type Tab = 'progress' | 'messages' | 'goals' | 'resources';

export function CommunicationDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('progress');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'progress', label: 'Progress Updates', icon: '📊' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'goals', label: 'Shared Goals', icon: '🎯' },
    { id: 'resources', label: 'Resource Hub', icon: '📚' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          Communication & Progress
        </h1>

        {/* Tab Navigation */}
        <div className="mb-6 flex space-x-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 border-b-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-lg bg-white p-6 shadow">
          {activeTab === 'progress' && <ProgressUpdates />}
          {activeTab === 'messages' && <MessageCenter />}
          {activeTab === 'goals' && <GoalSharing />}
          {activeTab === 'resources' && <ResourceHub />}
        </div>
      </div>
    </div>
  );
}
