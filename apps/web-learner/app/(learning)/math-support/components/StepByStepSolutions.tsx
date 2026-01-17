'use client';

import { useState } from 'react';
import { requestSolution, logSolutionRequest, type Solution } from '../../../../lib/math-api';

interface StepByStepSolutionsProps {
  learnerId: string;
}

/**
 * Step-by-Step Solutions Component
 * 
 * Helps learners understand how to solve math problems:
 * - Enter any math problem
 * - Get detailed step-by-step solutions
 * - View explanations for each step
 * - Access hints when stuck
 * - See visual aids for complex concepts
 */
export function StepByStepSolutions({ learnerId }: Readonly<StepByStepSolutionsProps>) {
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState('algebra');
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showHints, setShowHints] = useState(false);

  const topics = [
    { value: 'algebra', label: 'Algebra' },
    { value: 'geometry', label: 'Geometry' },
    { value: 'trigonometry', label: 'Trigonometry' },
    { value: 'calculus', label: 'Calculus' },
    { value: 'statistics', label: 'Statistics' },
    { value: 'arithmetic', label: 'Arithmetic' },
  ];

  const sampleProblems = [
    { question: 'Solve for x: 2x + 5 = 13', topic: 'algebra' },
    { question: 'Find the area of a circle with radius 5 cm', topic: 'geometry' },
    { question: 'Calculate: 3/4 + 2/3', topic: 'arithmetic' },
    { question: 'Solve: x² - 5x + 6 = 0', topic: 'algebra' },
  ];

  const handleSolveProblem = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const solutionData = await requestSolution(question, topic);
      setSolution(solutionData);
      setCurrentStep(0);
      setShowHints(false);

      await logSolutionRequest({
        learnerId,
        problemId: solutionData.problemId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to get solution:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = (sample: typeof sampleProblems[0]) => {
    setQuestion(sample.question);
    setTopic(sample.topic);
    setSolution(null);
  };

  const handleClear = () => {
    setQuestion('');
    setSolution(null);
    setCurrentStep(0);
    setShowHints(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Panel */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Enter Your Problem</h2>

          <div className="mb-4">
            <label htmlFor="topic-select" className="block text-sm font-medium text-slate-700 mb-2">
              Topic
            </label>
            <select
              id="topic-select"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {topics.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="problem-textarea" className="block text-sm font-medium text-slate-700 mb-2">
              Problem
            </label>
            <textarea
              id="problem-textarea"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your math problem here..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSolveProblem}
              disabled={isLoading || !question.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Solving...' : '🔍 Solve'}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Sample Problems */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Sample Problems</h3>
          <div className="space-y-2">
            {sampleProblems.map((sample, index) => (
              <button
                key={`${sample.question.slice(0, 20)}-${index}`}
                onClick={() => handleLoadSample(sample)}
                className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <div className="font-medium text-slate-900">{sample.question}</div>
                <div className="text-xs text-slate-500 mt-0.5">{sample.topic}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Solution Panel */}
      <div className="lg:col-span-2">
        {solution ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Solution</h2>
                <p className="text-sm text-slate-600 mt-1">{question}</p>
              </div>
              <button
                onClick={() => setShowHints(!showHints)}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 text-sm rounded-lg hover:bg-yellow-200"
              >
                {showHints ? 'Hide Hints' : '💡 Show Hints'}
              </button>
            </div>

            {/* Steps Navigation */}
            <div className="mb-6">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {solution.steps.map((step, index) => (
                  <button
                    key={`step-${step.stepNumber}`}
                    onClick={() => setCurrentStep(index)}
                    className={`px-4 py-2 rounded-lg border-2 whitespace-nowrap transition-all ${
                      currentStep === index
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    Step {step.stepNumber}
                  </button>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="flex gap-1">
                {solution.steps.map((step, index) => (
                  <div
                    key={`progress-${step.stepNumber}`}
                    className={`h-2 flex-1 rounded ${
                      index <= currentStep ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Current Step */}
            {solution.steps[currentStep] && (
              <div className="mb-6">
                <div className="bg-indigo-50 rounded-lg p-6 mb-4">
                  <div className="text-sm font-medium text-indigo-900 mb-2">
                    Step {solution.steps[currentStep].stepNumber}:
                  </div>
                  <div className="text-lg font-semibold text-slate-900 mb-3">
                    {solution.steps[currentStep].description}
                  </div>
                  <div className="bg-white rounded-lg p-4 font-mono text-lg text-center">
                    {solution.steps[currentStep].mathematical_notation}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-sm font-medium text-slate-900 mb-2">Explanation:</div>
                  <div className="text-slate-700">
                    {solution.steps[currentStep].explanation}
                  </div>
                </div>

                {solution.steps[currentStep].visual_aid && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-900 mb-2">Visual Aid:</div>
                    <div className="text-blue-800">
                      {solution.steps[currentStep].visual_aid}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hints */}
            {showHints && solution.hints.length > 0 && (
              <div className="mb-6 bg-yellow-50 rounded-lg p-4">
                <div className="text-sm font-medium text-yellow-900 mb-2">💡 Hints:</div>
                <ul className="space-y-2">
                  {solution.hints.map((hint, index) => (
                    <li key={`${hint.slice(0, 15)}-${index}`} className="text-sm text-yellow-800 flex gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Step
              </button>

              <div className="text-sm text-slate-600">
                Step {currentStep + 1} of {solution.steps.length}
              </div>

              <button
                onClick={() => setCurrentStep(Math.min(solution.steps.length - 1, currentStep + 1))}
                disabled={currentStep === solution.steps.length - 1}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step →
              </button>
            </div>

            {/* Overall Explanation */}
            {currentStep === solution.steps.length - 1 && (
              <div className="mt-6 bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-900 mb-2">✓ Complete Solution:</div>
                <div className="text-green-800">{solution.explanation}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📐</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready to Solve Problems!
            </h3>
            <p className="text-slate-600">
              Enter a math problem on the left or try one of the sample problems to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
