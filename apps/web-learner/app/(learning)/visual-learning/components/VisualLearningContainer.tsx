'use client';

import { useState } from 'react';
import { MindMapping } from './MindMapping';
import { DiagramCreation } from './DiagramCreation';
import { VideoAnnotations } from './VideoAnnotations';
import { VisualNoteTaking } from './VisualNoteTaking';

type TabType = 'mindmap' | 'diagram' | 'video' | 'notes';

export function VisualLearningContainer() {
  const [activeTab, setActiveTab] = useState<TabType>('mindmap');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-3xl font-bold text-gray-900">Visual Learning Tools</h1>
            <p className="mt-2 text-gray-600">Create visual representations to enhance understanding</p>
          </div>
          
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('mindmap')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'mindmap'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-current={activeTab === 'mindmap' ? 'page' : undefined}
            >
              Mind Mapping
            </button>
            <button
              onClick={() => setActiveTab('diagram')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'diagram'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-current={activeTab === 'diagram' ? 'page' : undefined}
            >
              Diagrams
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'video'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-current={activeTab === 'video' ? 'page' : undefined}
            >
              Video Annotations
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-current={activeTab === 'notes' ? 'page' : undefined}
            >
              Visual Notes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'mindmap' && <MindMapping />}
        {activeTab === 'diagram' && <DiagramCreation />}
        {activeTab === 'video' && <VideoAnnotations />}
        {activeTab === 'notes' && <VisualNoteTaking />}
      </div>
    </div>
  );
}
