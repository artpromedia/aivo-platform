'use client';

import { useState, useEffect } from 'react';
import { getRegulationStrategies, recordStrategyUse, type EmotionRegulationStrategy } from '../../../../lib/sel-api';

interface EmotionRegulationProps {
  learnerId: string;
}

/**
 * Emotion Regulation Component
 * 
 * Provides coping strategies for managing emotions:
 * - Browse strategies by category
 * - View detailed instructions
 * - Practice with guided steps
 * - Track effectiveness
 */
export function EmotionRegulation({ learnerId }: Readonly<EmotionRegulationProps>) {
  const [strategies, setStrategies] = useState<EmotionRegulationStrategy[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<EmotionRegulationStrategy | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { value: 'all', label: 'All Strategies', icon: '🌟' },
    { value: 'breathing', label: 'Breathing', icon: '🌬️' },
    { value: 'grounding', label: 'Grounding', icon: '🌱' },
    { value: 'movement', label: 'Movement', icon: '🏃' },
    { value: 'creative', label: 'Creative', icon: '🎨' },
    { value: 'social', label: 'Social', icon: '👥' },
    { value: 'cognitive', label: 'Thinking', icon: '🧠' },
  ];

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const data = await getRegulationStrategies();
      setStrategies(data);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStrategies = selectedCategory === 'all'
    ? strategies
    : strategies.filter((s) => s.category === selectedCategory);

  const startPractice = (strategy: EmotionRegulationStrategy) => {
    setSelectedStrategy(strategy);
    setIsPracticing(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (selectedStrategy && currentStep < selectedStrategy.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const completePractice = async (effectiveness: number) => {
    if (!selectedStrategy) return;

    try {
      await recordStrategyUse(learnerId, selectedStrategy.id, effectiveness);
      setIsPracticing(false);
      setSelectedStrategy(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('Failed to record strategy use:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    return categories.find((c) => c.value === category)?.icon || '🌟';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Practice Modal */}
      {isPracticing && selectedStrategy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedStrategy.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedStrategy.duration} minute practice
                  </p>
                </div>
                <button
                  onClick={() => setIsPracticing(false)}
                  className="text-slate-400 hover:text-slate-500"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span>Step {currentStep + 1} of {selectedStrategy.steps.length}</span>
                  <span>{Math.round(((currentStep + 1) / selectedStrategy.steps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentStep + 1) / selectedStrategy.steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Step */}
              <div className="bg-indigo-50 rounded-lg p-6 mb-6">
                <p className="text-lg text-slate-800">{selectedStrategy.steps[currentStep]}</p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                {currentStep < selectedStrategy.steps.length - 1 ? (
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Next →
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => completePractice(3)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                    >
                      Somewhat Helpful
                    </button>
                    <button
                      onClick={() => completePractice(5)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Very Helpful ✓
                    </button>
                  </div>
                )}
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

        {/* Strategy Grid */}
        {filteredStrategies.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <p className="text-slate-500">No strategies found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{getCategoryIcon(strategy.category)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(strategy.difficulty)}`}>
                    {strategy.difficulty}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">{strategy.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{strategy.description}</p>

                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <span>⏱️ {strategy.duration} min</span>
                  <span>{strategy.steps.length} steps</span>
                </div>

                <button
                  onClick={() => startPractice(strategy)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Try This Strategy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
