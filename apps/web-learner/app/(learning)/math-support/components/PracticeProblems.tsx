'use client';

import { useState, useEffect } from 'react';
import {
  generatePracticeSet,
  submitPracticeResults,
  getPracticeHistory,
  type PracticeSet,
  type PracticeScore,
} from '../../../../lib/math-api';

type Difficulty = 'easy' | 'medium' | 'hard';

interface PracticeProblemsProps {
  learnerId: string;
}

type View = 'select' | 'practice' | 'results' | 'history';

/**
 * Practice Problems Component
 * 
 * Provides practice exercises for math skills:
 * - Select practice sets by topic and difficulty
 * - Generate custom practice sets
 * - Answer problems with immediate feedback
 * - View detailed results and recommendations
 * - Track practice history
 */
export function PracticeProblems({ learnerId }: Readonly<PracticeProblemsProps>) {
  const [view, setView] = useState<View>('select');
  const [selectedSet, setSelectedSet] = useState<PracticeSet | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<PracticeScore | null>(null);
  const [history, setHistory] = useState<PracticeScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const topics = [
    'Algebra',
    'Geometry',
    'Trigonometry',
    'Calculus',
    'Statistics',
    'Arithmetic',
    'Fractions',
    'Percentages',
  ];

  const difficulties: Array<{ value: Difficulty; label: string }> = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  const [selectedTopic, setSelectedTopic] = useState(topics[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [problemCount, setProblemCount] = useState(10);

  useEffect(() => {
    if (view === 'history') {
      loadHistory();
    }
  }, [view, learnerId]);

  const loadHistory = async () => {
    try {
      const data = await getPracticeHistory(learnerId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleGenerateSet = async () => {
    setIsLoading(true);
    try {
      const set = await generatePracticeSet(selectedTopic, selectedDifficulty, problemCount);
      setSelectedSet(set);
      setAnswers({});
      setCurrentProblemIndex(0);
      setView('practice');
    } catch (error) {
      console.error('Failed to generate practice set:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (problemId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [problemId]: answer }));
  };

  const handleSubmit = async () => {
    if (!selectedSet) return;

    setIsLoading(true);
    try {
      const result = await submitPracticeResults({
        learnerId,
        setId: selectedSet.id,
        answers: selectedSet.problems.map((p) => answers[p.id] || ''),
        timestamp: new Date().toISOString(),
      });
      setResults(result);
      setView('results');
    } catch (error) {
      console.error('Failed to submit results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentProblem = selectedSet?.problems[currentProblemIndex];

  return (
    <div>
      {/* View: Select/Generate Practice Set */}
      {view === 'select' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Generate Practice Set
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="topic-select" className="block text-sm font-medium text-slate-700 mb-2">
                  Topic
                </label>
                <select
                  id="topic-select"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-slate-700 mb-2">
                  Difficulty
                </legend>
                <div className="flex gap-3">
                  {difficulties.map((diff) => (
                    <label
                      key={diff.value}
                      className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center transition-all ${
                        selectedDifficulty === diff.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="difficulty"
                        value={diff.value}
                        checked={selectedDifficulty === diff.value}
                        onChange={(e) => setSelectedDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                        className="sr-only"
                      />
                      <span className="font-medium">{diff.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Problems: {problemCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={problemCount}
                  onChange={(e) => setProblemCount(Number.parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Shorter</span>
                  <span>Longer</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateSet}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : '✨ Generate Practice Set'}
              </button>
              <button
                onClick={() => setView('history')}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                📊 History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View: Practice */}
      {view === 'practice' && selectedSet && currentProblem && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedSet.name}
              </h2>
              <div className="text-sm text-slate-600">
                Problem {currentProblemIndex + 1} of {selectedSet.problems.length}
              </div>
            </div>

            {/* Problem */}
            <div className="mb-6">
              <div className="bg-slate-50 rounded-lg p-6 mb-4">
                <p className="text-lg font-medium text-slate-900">
                  {currentProblem.question}
                </p>
              </div>

              {/* Answer Input */}
              {currentProblem.options ? (
                // Multiple Choice
                <div className="space-y-2">
                  {currentProblem.options.map((option, index) => (
                    <label
                      key={`${option}-${index}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        answers[currentProblem.id] === option
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentProblem.id}
                        value={option}
                        checked={answers[currentProblem.id] === option}
                        onChange={(e) => handleAnswerChange(currentProblem.id, e.target.value)}
                        className="text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-slate-800">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                // Text Input
                <input
                  type="text"
                  value={answers[currentProblem.id] || ''}
                  onChange={(e) => handleAnswerChange(currentProblem.id, e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your answer..."
                />
              )}

              {/* Hint */}
              {currentProblem.hint && (
                <details className="mt-4">
                  <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-700">
                    💡 Need a hint?
                  </summary>
                  <div className="mt-2 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                    {currentProblem.hint}
                  </div>
                </details>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
                disabled={currentProblemIndex === 0}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              {currentProblemIndex < selectedSet.problems.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentProblemIndex(Math.min(selectedSet.problems.length - 1, currentProblemIndex + 1))
                  }
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || Object.keys(answers).length < selectedSet.problems.length}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : 'Submit Answers'}
                </button>
              )}
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex gap-1">
                {selectedSet.problems.map((problem, index) => (
                  <div
                    key={problem.id}
                    className={`h-2 flex-1 rounded ${(() => {
                      if (answers[problem.id]) return 'bg-indigo-600';
                      if (index === currentProblemIndex) return 'bg-indigo-200';
                      return 'bg-slate-200';
                    })()}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">
                {Object.keys(answers).length} of {selectedSet.problems.length} answered
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View: Results */}
      {view === 'results' && results && selectedSet && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mb-4">
                <span className="text-4xl">
                  {(() => {
                    if (results.score >= 80) return '🎉';
                    if (results.score >= 60) return '👍';
                    return '💪';
                  })()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Practice Complete!</h2>
              <p className="text-lg text-slate-600">
                Score: {results.score}% ({results.correctAnswers}/{results.totalProblems})
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Time spent: {Math.floor(results.timeSpent / 60)}m {results.timeSpent % 60}s
              </p>
            </div>

            {/* Feedback */}
            {results.feedback && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                <p className="text-sm text-blue-800">{results.feedback}</p>
              </div>
            )}

            {/* Recommended Topics */}
            {results.recommendedTopics && results.recommendedTopics.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  Recommended topics to practice:
                </p>
                <div className="flex flex-wrap gap-2">
                  {results.recommendedTopics.map((topic, index) => (
                    <span
                      key={`${topic}-${index}`}
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Review */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Problem Review:</h3>
              <div className="space-y-3">
                {selectedSet.problems.map((problem, index) => {
                  const userAnswer = answers[problem.id] || '';
                  const isCorrect = userAnswer.toLowerCase().trim() === problem.correctAnswer.toLowerCase().trim();

                  return (
                    <div
                      key={problem.id}
                      className={`p-4 rounded-lg border-2 ${
                        isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="flex-shrink-0 text-xl">
                          {isCorrect ? '✅' : '❌'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{problem.question}</p>
                          <div className="mt-2 text-sm">
                            <p className="text-slate-600">
                              Your answer: <span className="font-medium">{userAnswer || '(no answer)'}</span>
                            </p>
                            {!isCorrect && (
                              <p className="text-green-700">
                                Correct answer: <span className="font-medium">{problem.correctAnswer}</span>
                              </p>
                            )}
                          </div>
                          {problem.explanation && (
                            <p className="mt-2 text-sm text-slate-600">
                              {problem.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setView('select');
                  setSelectedSet(null);
                  setAnswers({});
                  setResults(null);
                }}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Practice More
              </button>
              <button
                onClick={() => setView('history')}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                View History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View: History */}
      {view === 'history' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Practice History</h2>
              <button
                onClick={() => setView('select')}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ← Back
              </button>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((session, index) => (
                  <div key={`session-${session.totalProblems}-${session.correctAnswers}-${index}`} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-900">Practice Session</div>
                      <div className="text-sm text-slate-600">
                        {session.correctAnswers}/{session.totalProblems} correct
                        {' • '}
                        {Math.floor(session.timeSpent / 60)}m {session.timeSpent % 60}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">{session.score}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-600">
                No practice history yet. Start practicing to see your progress!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
