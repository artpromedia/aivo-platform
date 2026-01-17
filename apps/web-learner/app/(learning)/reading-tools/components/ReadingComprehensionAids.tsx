'use client';

import { useState, useEffect } from 'react';
import { getComprehensionStrategies, getComprehensionQuestions, submitComprehensionResult, type ComprehensionStrategy, type ComprehensionQuestion, type ComprehensionResult } from '../../../../lib/reading-api';

interface ReadingComprehensionAidsProps {
  learnerId: string;
}

type Tab = 'strategies' | 'practice';

/**
 * Reading Comprehension Aids Component
 * 
 * Helps learners understand and retain what they read:
 * - Browse and learn comprehension strategies
 * - Practice with guided comprehension questions
 * - Receive feedback and track progress
 * - Support different question types (multiple choice, short answer, true/false)
 */
export function ReadingComprehensionAids({ learnerId }: Readonly<ReadingComprehensionAidsProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('strategies');
  const [strategies, setStrategies] = useState<ComprehensionStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<ComprehensionStrategy | null>(null);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ComprehensionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    if (activeTab === 'practice') {
      loadQuestions();
    }
  }, [activeTab]);

  const loadStrategies = async () => {
    try {
      const data = await getComprehensionStrategies();
      setStrategies(data);
      if (data.length > 0) {
        setSelectedStrategy(data[0]);
      }
    } catch (error) {
      console.error('Failed to load strategies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await getComprehensionQuestions();
      setQuestions(data);
      setAnswers({});
      setResults(null);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitAnswers = async () => {
    if (questions.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await submitComprehensionResult({
        learnerId,
        questionIds: questions.map((q) => q.id),
        answers: Object.values(answers),
        timestamp: new Date().toISOString(),
      });
      setResults(result);
    } catch (error) {
      console.error('Failed to submit answers:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPractice = () => {
    setAnswers({});
    setResults(null);
    setCurrentQuestionIndex(0);
    loadQuestions();
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading comprehension aids...</div>;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('strategies')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'strategies'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            📚 Strategies
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'practice'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            ✍️ Practice
          </button>
        </nav>
      </div>

      {/* Strategies Tab */}
      {activeTab === 'strategies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Comprehension Strategies
            </h2>
            <div className="space-y-2">
              {strategies.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    selectedStrategy?.id === strategy.id
                      ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-900'
                      : 'bg-slate-50 border-2 border-transparent hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{strategy.icon}</span>
                    <div>
                      <div className="font-medium">{strategy.name}</div>
                      <div className="text-xs opacity-70 mt-0.5">{strategy.category}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Details */}
          {selectedStrategy && (
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{selectedStrategy.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {selectedStrategy.name}
                  </h2>
                  <p className="text-sm text-slate-600">{selectedStrategy.category}</p>
                </div>
              </div>

              <p className="text-slate-700 mb-6">{selectedStrategy.description}</p>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  How to use this strategy:
                </h3>
                <ol className="space-y-2">
                  {selectedStrategy.steps.map((step, index) => (
                    <li key={`step-${step.slice(0, 20)}-${index}`} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-slate-700 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {selectedStrategy.example && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    📝 Example:
                  </h3>
                  <p className="text-sm text-blue-800">{selectedStrategy.example}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Practice Tab */}
      {activeTab === 'practice' && (
        <div className="max-w-4xl mx-auto">
          {results ? (
            // Results
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
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
                  Score: {results.score}% ({results.correctAnswers}/{results.totalQuestions})
                </p>
              </div>

              {/* Feedback */}
              {results.feedback && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                  <p className="text-sm text-blue-800">{results.feedback}</p>
                </div>
              )}

              {/* Try Again */}
              <button
                onClick={resetPractice}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Comprehension Practice
                </h2>
                <div className="text-sm text-slate-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
              </div>

              {questions.length > 0 && (
                <>
                  {/* Passage */}
                  {questions[currentQuestionIndex].passage && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700 mb-2">Passage:</p>
                      <p className="text-slate-800 leading-relaxed">
                        {questions[currentQuestionIndex].passage}
                      </p>
                    </div>
                  )}

                  {/* Question */}
                  <div className="mb-6">
                    <p className="text-lg font-medium text-slate-900 mb-4">
                      {questions[currentQuestionIndex].question}
                    </p>

                    {questions[currentQuestionIndex].type === 'multiple-choice' && (
                      <div className="space-y-2">
                        {questions[currentQuestionIndex].options?.map((option, index) => (
                          <label
                            key={`option-${option.slice(0, 15)}-${index}`}
                            className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50"
                            style={{
                              borderColor:
                                answers[questions[currentQuestionIndex].id] === option
                                  ? '#4f46e5'
                                  : '#e2e8f0',
                              backgroundColor:
                                answers[questions[currentQuestionIndex].id] === option
                                  ? '#eef2ff'
                                  : 'white',
                            }}
                          >
                            <input
                              type="radio"
                              name={questions[currentQuestionIndex].id}
                              value={option}
                              checked={answers[questions[currentQuestionIndex].id] === option}
                              onChange={(e) =>
                                handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)
                              }
                              className="text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-slate-800">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {questions[currentQuestionIndex].type === 'short-answer' && (
                      <textarea
                        value={answers[questions[currentQuestionIndex].id] || ''}
                        onChange={(e) =>
                          handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Type your answer here..."
                      />
                    )}

                    {questions[currentQuestionIndex].type === 'true-false' && (
                      <div className="flex gap-4">
                        {['True', 'False'].map((option) => (
                          <label
                            key={option}
                            className="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50 flex-1"
                            style={{
                              borderColor:
                                answers[questions[currentQuestionIndex].id] === option
                                  ? '#4f46e5'
                                  : '#e2e8f0',
                              backgroundColor:
                                answers[questions[currentQuestionIndex].id] === option
                                  ? '#eef2ff'
                                  : 'white',
                            }}
                          >
                            <input
                              type="radio"
                              name={questions[currentQuestionIndex].id}
                              value={option}
                              checked={answers[questions[currentQuestionIndex].id] === option}
                              onChange={(e) =>
                                handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)
                              }
                              className="text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-slate-800 font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>

                    {currentQuestionIndex < questions.length - 1 ? (
                      <button
                        onClick={() =>
                          setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                        }
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={submitAnswers}
                        disabled={isSubmitting || Object.keys(answers).length < questions.length}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Answers'}
                      </button>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex gap-1">
                      {questions.map((q, index) => (
                        <div
                          key={q.id}
                          className={`h-2 flex-1 rounded ${(() => {
                            if (answers[q.id]) return 'bg-indigo-600';
                            if (index === currentQuestionIndex) return 'bg-indigo-200';
                            return 'bg-slate-200';
                          })()}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 text-center">
                      {Object.keys(answers).length} of {questions.length} answered
                    </p>
                  </div>
                </>
              )}

              {questions.length === 0 && (
                <p className="text-center text-slate-600 py-12">
                  No practice questions available at this time.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
