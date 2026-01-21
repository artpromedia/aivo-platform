'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ParentAssessmentQuestion {
  id: string;
  category: string;
  questionText: string;
  questionType: 'multiple_choice' | 'rating_scale' | 'open_ended' | 'multi_select';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  required: boolean;
  helpText?: string;
}

interface ParentAssessmentProps {
  assessmentId: string;
  profileId: string;
}

const CATEGORY_INFO = {
  learning_style: { title: 'Learning Style', icon: '🎓', description: 'How your child learns best' },
  strengths: { title: 'Strengths', icon: '💪', description: 'Your child\'s talents and abilities' },
  challenges: { title: 'Challenges', icon: '🎯', description: 'Areas where they need support' },
  behavior: { title: 'Behavior', icon: '🌟', description: 'Engagement and motivation patterns' },
  preferences: { title: 'Preferences', icon: '❤️', description: 'Interests and learning preferences' },
  social_emotional: { title: 'Social-Emotional', icon: '🤝', description: 'Confidence and resilience' },
};

export default function ParentAssessmentPage({ assessmentId, profileId }: Readonly<ParentAssessmentProps>) {
  const router = useRouter();
  const [questions, setQuestions] = useState<ParentAssessmentQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [currentCategory, setCurrentCategory] = useState(0);
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = Object.keys(CATEGORY_INFO) as (keyof typeof CATEGORY_INFO)[];
  const currentCategoryKey = categories[currentCategory];
  const categoryQuestions = questions.filter(q => q.category === currentCategoryKey);
  const totalCategories = categories.length;
  const progress = ((currentCategory + 1) / totalCategories) * 100;

  useEffect(() => {
    loadAssessment();
  }, [assessmentId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        saveProgress();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [status, responses]);

  async function loadAssessment() {
    try {
      const [assessmentRes, questionsRes] = await Promise.all([
        fetch(`/api/parent-assessment/${assessmentId}`),
        fetch('/api/parent-assessment/questions'),
      ]);

      if (!assessmentRes.ok || !questionsRes.ok) {
        throw new Error('Failed to load assessment');
      }

      const assessment = await assessmentRes.json();
      const questionsData = await questionsRes.json();

      setStatus(assessment.status);
      setQuestions(questionsData.questions);
      
      if (assessment.responses) {
        setResponses(assessment.responses);
      }

      // If pending, mark as started
      if (assessment.status === 'PENDING') {
        await fetch(`/api/parent-assessment/${assessmentId}/start`, { method: 'POST' });
        setStatus('IN_PROGRESS');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  async function saveProgress() {
    try {
      await fetch(`/api/parent-assessment/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }

  async function submitAssessment() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/parent-assessment/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit assessment');
      }

      setStatus('COMPLETED');
      // Redirect to child's profile or dashboard
      router.push(`/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }

  function handleResponse(questionId: string, value: unknown) {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }

  function handleNext() {
    if (currentCategory < totalCategories - 1) {
      setCurrentCategory(prev => prev + 1);
      saveProgress();
    }
  }

  function handlePrevious() {
    if (currentCategory > 0) {
      setCurrentCategory(prev => prev - 1);
    }
  }

  function isCategoryComplete() {
    return categoryQuestions
      .filter(q => q.required)
      .every(q => responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (status === 'COMPLETED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-teal-50 p-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Assessment Complete!</h1>
          <p className="mb-6 text-gray-600">
            Thank you for sharing your insights. Your child can now begin their baseline assessment.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const categoryInfo = CATEGORY_INFO[currentCategoryKey];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-teal-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Parent Assessment</h1>
          <p className="text-gray-600">Help us understand your child&apos;s learning needs</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Section {currentCategory + 1} of {totalCategories}
            </span>
            <span className="text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Category Header */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{categoryInfo.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{categoryInfo.title}</h2>
              <p className="text-gray-600">{categoryInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {categoryQuestions.map((question, index) => (
            <div key={question.id} className="rounded-xl bg-white p-6 shadow-md">
              <label className="block">
                <div className="mb-4">
                  <span className="text-sm font-semibold text-violet-600">
                    Question {index + 1}
                    {question.required && <span className="text-red-500"> *</span>}
                  </span>
                  <h3 className="mt-1 text-lg font-medium text-gray-900">{question.questionText}</h3>
                  {question.helpText && (
                    <p className="mt-1 text-sm text-gray-500">{question.helpText}</p>
                  )}
                </div>

                {/* Multiple Choice */}
                {question.questionType === 'multiple_choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-colors hover:border-violet-300"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={responses[question.id] === option}
                          onChange={(e) => handleResponse(question.id, e.target.value)}
                          className="h-4 w-4 text-violet-600"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Multi Select */}
                {question.questionType === 'multi_select' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const currentValues = (responses[question.id] as string[]) || [];
                      const isChecked = currentValues.includes(option);
                      const handleCheckboxChange = (checked: boolean) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter(v => v !== option);
                        handleResponse(question.id, newValues);
                      };
                      return (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-colors hover:border-violet-300"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(e.target.checked)}
                            className="h-4 w-4 text-violet-600"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Rating Scale */}
                {question.questionType === 'rating_scale' && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      {Array.from({ length: question.scaleMax! - question.scaleMin! + 1 }).map((_, idx) => {
                        const value = question.scaleMin! + idx;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleResponse(question.id, value)}
                            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-semibold transition-all ${
                              responses[question.id] === value
                                ? 'border-violet-600 bg-violet-600 text-white'
                                : 'border-gray-300 text-gray-600 hover:border-violet-300'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                    {question.scaleLabels && (
                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>{question.scaleLabels.min}</span>
                        <span>{question.scaleLabels.max}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Open Ended */}
                {question.questionType === 'open_ended' && (
                  <textarea
                    value={(responses[question.id] as string) || ''}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border-2 border-gray-200 p-3 focus:border-violet-500 focus:outline-none"
                    placeholder="Share your thoughts..."
                  />
                )}
              </label>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentCategory === 0}
            className="rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
          >
            Previous
          </button>

          {currentCategory < totalCategories - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCategoryComplete()}
              className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Next Section
            </button>
          ) : (
            <button
              onClick={submitAssessment}
              disabled={!isCategoryComplete() || submitting}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-teal-500 px-8 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Complete Assessment'}
            </button>
          )}
        </div>

        {/* Auto-save indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Your progress is automatically saved</span>
        </div>
      </div>
    </div>
  );
}
