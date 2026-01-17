'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/study-skills-api';

export function TestPrep() {
  const [plans, setPlans] = useState<api.TestPrepPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<api.TestPrepPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [practiceTests, setPracticeTests] = useState<api.PracticeTest[]>([]);
  const [takingTest, setTakingTest] = useState<api.PracticeTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<{
    test: api.PracticeTest;
    analytics: api.TestAnalytics;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, testsData] = await Promise.all([
        api.getTestPrepPlans('user123'),
        api.getPracticeTests('user123'),
      ]);
      setPlans(plansData);
      setPracticeTests(testsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (
    testName: string,
    testDate: string,
    subject: string,
    description: string
  ) => {
    try {
      const plan = await api.createTestPrepPlan({
        userId: 'user123',
        testName,
        testDate,
        subject,
        description,
      });
      setPlans([...plans, plan]);
      setCreating(false);
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    if (!selectedPlan) return;
    try {
      const updated = await api.completeStudySession(selectedPlan.id, sessionId);
      setSelectedPlan(updated);
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Delete this test prep plan?')) return;
    try {
      await api.deleteTestPrepPlan(planId);
      setPlans(plans.filter((p) => p.id !== planId));
      setSelectedPlan(null);
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleCreatePracticeTest = async (name: string, subject: string, duration: number) => {
    try {
      const test = await api.createPracticeTest({
        userId: 'user123',
        name,
        subject,
        duration,
        testPrepPlanId: selectedPlan?.id,
      });
      setPracticeTests([...practiceTests, test]);
    } catch (error) {
      console.error('Failed to create practice test:', error);
    }
  };

  const handleSubmitTest = async () => {
    if (!takingTest) return;
    try {
      const results = await api.submitPracticeTest(takingTest.id, answers);
      setTestResults(results);
      setTakingTest(null);
      setAnswers({});
    } catch (error) {
      console.error('Failed to submit test:', error);
    }
  };

  const getDaysUntilTest = (testDate: string) => {
    const days = Math.ceil(
      (new Date(testDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (testResults) {
    const { test, analytics } = testResults;
    const percentage = Math.round((analytics.correctAnswers / analytics.totalQuestions) * 100);

    return (
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => setTestResults(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-8">
          <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">Test Results</h2>

          <div className="mb-8 text-center">
            <div className="mb-2 text-6xl font-bold text-indigo-600">{percentage}%</div>
            <div className="text-slate-600">
              {analytics.correctAnswers} / {analytics.totalQuestions} correct
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold text-slate-900">Strong Topics</h3>
              <ul className="space-y-2">
                {analytics.strongTopics.map((topic) => (
                  <li key={topic} className="flex items-center gap-2 text-green-700">
                    ✓ {topic}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-slate-900">Areas to Improve</h3>
              <ul className="space-y-2">
                {analytics.weakTopics.map((topic) => (
                  <li key={topic} className="flex items-center gap-2 text-red-700">
                    ✗ {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {analytics.recommendedFocus.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-slate-900">Recommended Focus</h3>
              <div className="flex flex-wrap gap-2">
                {analytics.recommendedFocus.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (takingTest) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => {
              setTakingTest(null);
              setAnswers({});
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            ← Cancel Test
          </button>
          <div className="text-sm text-slate-600">{takingTest.duration} minutes</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-6 text-xl font-bold text-slate-900">{takingTest.name}</h2>

          <div className="space-y-6">
            {takingTest.questions.map((question, index) => (
              <div key={question.id} className="rounded border border-slate-200 p-4">
                <div className="mb-3 font-medium text-slate-900">
                  {index + 1}. {question.question}
                </div>

                {question.type === 'multipleChoice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) =>
                            setAnswers({ ...answers, [question.id]: e.target.value })
                          }
                          className="h-4 w-4 text-indigo-600"
                        />
                        <span className="text-slate-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'trueFalse' && (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value="true"
                        checked={answers[question.id] === 'true'}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="h-4 w-4 text-indigo-600"
                      />
                      <span className="text-slate-700">True</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value="false"
                        checked={answers[question.id] === 'false'}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="h-4 w-4 text-indigo-600"
                      />
                      <span className="text-slate-700">False</span>
                    </label>
                  </div>
                )}

                {(question.type === 'shortAnswer' || question.type === 'essay') && (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    rows={question.type === 'essay' ? 6 : 2}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    placeholder="Your answer..."
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitTest}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Submit Test
          </button>
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    const daysUntil = getDaysUntilTest(selectedPlan.testDate);
    const completedSessions = selectedPlan.studySessions.filter((s) => s.isCompleted).length;
    const totalSessions = selectedPlan.studySessions.length;

    return (
      <div>
        <button
          onClick={() => setSelectedPlan(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Plans
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedPlan.testName}</h2>
              <p className="text-slate-600">
                {selectedPlan.subject} • {new Date(selectedPlan.testDate).toLocaleDateString()}
              </p>
              <p
                className={`mt-1 text-sm font-medium ${daysUntil < 7 ? 'text-red-600' : 'text-slate-600'}`}
              >
                {daysUntil > 0 ? `${daysUntil} days until test` : 'Test day!'}
              </p>
            </div>
            <button
              onClick={() => handleDeletePlan(selectedPlan.id)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-600">Progress</span>
              <span className="font-medium text-slate-900">
                {completedSessions}/{totalSessions} sessions
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-indigo-600"
                style={{ width: `${selectedPlan.progress}%` }}
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Study Sessions</h3>
            <div className="space-y-3">
              {selectedPlan.studySessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded border p-4 ${session.isCompleted ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-900">
                        {new Date(session.date).toLocaleDateString()} at {session.time}
                      </div>
                      <div className="text-sm text-slate-600">
                        {session.duration} min • {session.topics.join(', ')}
                      </div>
                    </div>
                    {!session.isCompleted && (
                      <button
                        onClick={() => handleCompleteSession(session.id)}
                        className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Practice Tests</h3>
            <div className="space-y-3">
              {practiceTests
                .filter((t) => t.testPrepPlanId === selectedPlan.id)
                .map((test) => (
                  <div key={test.id} className="rounded border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{test.name}</div>
                        <div className="text-sm text-slate-600">
                          {test.questions.length} questions • {test.duration} min
                        </div>
                        {test.completedAt && (
                          <div className="text-sm text-green-600">
                            Completed • Score: {test.score}%
                          </div>
                        )}
                      </div>
                      {!test.completedAt && (
                        <button
                          onClick={() => setTakingTest(test)}
                          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                        >
                          Start Test
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Test Prep Plans</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + New Plan
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create Test Prep Plan</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreatePlan(
                formData.get('testName') as string,
                formData.get('testDate') as string,
                formData.get('subject') as string,
                formData.get('description') as string
              );
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Test Name</label>
              <input
                type="text"
                name="testName"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Test Date</label>
              <input
                type="date"
                name="testDate"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
              <input
                type="text"
                name="subject"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description (optional)
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg bg-slate-200 px-6 py-2 font-medium text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const daysUntil = getDaysUntilTest(plan.testDate);
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md"
            >
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{plan.testName}</h3>
              <p className="mb-1 text-sm text-slate-600">{plan.subject}</p>
              <p className="mb-3 text-sm text-slate-600">
                {new Date(plan.testDate).toLocaleDateString()}
              </p>
              <div
                className={`text-sm font-medium ${daysUntil < 7 ? 'text-red-600' : 'text-slate-600'}`}
              >
                {daysUntil > 0 ? `${daysUntil} days away` : 'Test day!'}
              </div>
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-indigo-600" style={{ width: `${plan.progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">No test prep plans yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
