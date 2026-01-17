'use client';

import { useState, useEffect } from 'react';
import { getSelfAdvocacyTools, type SelfAdvocacyTool } from '../../../../lib/sel-api';

interface SelfAdvocacyProps {
  learnerId: string;
}

/**
 * Self-Advocacy Component
 * 
 * Helps learners develop self-advocacy skills:
 * - Communication scripts
 * - Practice scenarios
 * - Tips for speaking up
 * - Templates for requests
 */
export function SelfAdvocacy({ learnerId }: SelfAdvocacyProps) {
  const [tools, setTools] = useState<SelfAdvocacyTool[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<SelfAdvocacyTool | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceResponse, setPracticeResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { value: 'all', label: 'All Tools', icon: '🛠️' },
    { value: 'classroom', label: 'Classroom', icon: '✏️' },
    { value: 'peer', label: 'Peers', icon: '👥' },
    { value: 'adult', label: 'Adults', icon: '👨‍🏫' },
    { value: 'accommodations', label: 'Accommodations', icon: '♿' },
    { value: 'needs', label: 'Express Needs', icon: '🗣️' },
  ];

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await getSelfAdvocacyTools();
      setTools(data);
    } catch (error) {
      console.error('Failed to load advocacy tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTools = selectedCategory === 'all'
    ? tools
    : tools.filter((t) => t.category === selectedCategory);

  const openTool = (tool: SelfAdvocacyTool) => {
    setSelectedTool(tool);
    setIsViewing(true);
    setPracticeResponse('');
    setIsPracticing(tool.type === 'practice-scenario');
  };

  const closeTool = () => {
    setIsViewing(false);
    setSelectedTool(null);
    setPracticeResponse('');
    setIsPracticing(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'script':
        return '📝';
      case 'template':
        return '📋';
      case 'practice-scenario':
        return '🎭';
      case 'tip':
        return '💡';
      default:
        return '📄';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'script':
        return 'Script';
      case 'template':
        return 'Template';
      case 'practice-scenario':
        return 'Practice';
      case 'tip':
        return 'Tip';
      default:
        return type;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    return categories.find((c) => c.value === category)?.icon || '🛠️';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading advocacy tools...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Tool Viewer Modal */}
      {isViewing && selectedTool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getTypeIcon(selectedTool.type)}</span>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      {getTypeLabel(selectedTool.type)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(selectedTool.difficulty)}`}>
                      {selectedTool.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedTool.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{selectedTool.description}</p>
                </div>
                <button
                  onClick={closeTool}
                  className="text-slate-400 hover:text-slate-500"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content Display */}
              <div className="space-y-6">
                {selectedTool.type === 'script' && (
                  <div className="bg-indigo-50 rounded-lg p-6">
                    <h4 className="font-semibold text-indigo-900 mb-3">What to Say:</h4>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                        {selectedTool.content}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-indigo-200">
                      <p className="text-sm text-indigo-800">
                        💡 <strong>Tip:</strong> Practice saying this out loud a few times before using it.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTool.type === 'template' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-6">
                      <h4 className="font-semibold text-slate-900 mb-3">Template:</h4>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-slate-800 font-mono text-sm leading-relaxed whitespace-pre-line">
                          {selectedTool.content}
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        📝 Fill in the blanks with your specific information. You can copy this template and customize it.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTool.type === 'practice-scenario' && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 rounded-lg p-6">
                      <h4 className="font-semibold text-purple-900 mb-3">Scenario:</h4>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                        {selectedTool.content}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="practice-response" className="block text-sm font-medium text-slate-700 mb-2">
                        How would you respond? (Practice here)
                      </label>
                      <textarea
                        id="practice-response"
                        value={practiceResponse}
                        onChange={(e) => setPracticeResponse(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Type your response here..."
                      />
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Remember:</strong> There's no one "right" answer. Practice different ways of responding.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTool.type === 'tip' && (
                  <div className="bg-yellow-50 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                      <span>💡</span>
                      Helpful Tip:
                    </h4>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                        {selectedTool.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={closeTool}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // In a real app, this would copy to clipboard or save
                    alert('Tool saved to your toolkit!');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save to My Toolkit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${
                  selectedCategory === category.value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <p className="text-slate-500">No tools found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{getTypeIcon(tool.type)}</span>
                  <div className="flex flex-col gap-1">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium text-right">
                      {getTypeLabel(tool.type)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium text-right ${getDifficultyColor(tool.difficulty)}`}>
                      {tool.difficulty}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">{tool.title}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{tool.description}</p>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500 capitalize flex items-center gap-1">
                    {getCategoryIcon(tool.category)}
                    {tool.category}
                  </span>
                </div>

                <button
                  onClick={() => openTool(tool)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  View Tool
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
