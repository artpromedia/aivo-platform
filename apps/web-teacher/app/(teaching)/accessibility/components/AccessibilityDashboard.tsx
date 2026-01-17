'use client';

import { useState } from 'react';
import { AccommodationManager } from './AccommodationManager';
import { ProgressMonitor } from './ProgressMonitor';
import { IEPIntegration } from './IEPIntegration';
import { ResourceLibrary } from './ResourceLibrary';

export function AccessibilityDashboard() {
  const [activeTab, setActiveTab] = useState<'accommodations' | 'progress' | 'iep' | 'resources'>('accommodations');

  return (
    <div className="min-h-screen">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex gap-4 px-6 pt-4">
          <button
            onClick={() => setActiveTab('accommodations')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'accommodations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            🎯 Accommodations
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'progress'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            📈 Progress Monitor
          </button>
          <button
            onClick={() => setActiveTab('iep')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'iep'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            📋 IEP Integration
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'resources'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            📚 Resource Library
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'accommodations' && <AccommodationManager />}
        {activeTab === 'progress' && <ProgressMonitor />}
        {activeTab === 'iep' && <IEPIntegration />}
        {activeTab === 'resources' && <ResourceLibrary />}
      </div>
    </div>
  );
}
