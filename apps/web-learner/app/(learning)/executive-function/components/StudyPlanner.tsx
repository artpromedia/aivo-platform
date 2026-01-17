'use client';

import { useState } from 'react';
import { createStudyPlan, updateStudyPlan } from '../../../../lib/executive-function-api';
import type { StudyPlan, StudySession } from '../../../../lib/executive-function-api';

interface StudyPlannerProps {
  learnerId: string;
  plans: StudyPlan[];
  onUpdate: () => void;
}

/**
 * Study Planner Component
 * 
 * Helps learners create and manage study schedules
 */
export function StudyPlanner({ learnerId, plans, onUpdate }: Readonly<StudyPlannerProps>) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);

  const activePlans = plans.filter((p) => p.status === 'active');
  const draftPlans = plans.filter((p) => p.status === 'draft');
  const completedPlans = plans.filter((p) => p.status === 'completed');

  async function handleCreatePlan(planData: Partial<StudyPlan>) {
    try {
      await createStudyPlan(learnerId, planData);
      setShowCreateForm(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create study plan:', error);
      alert('Failed to create study plan. Please try again.');
    }
  }

  async function handleUpdatePlan(planId: string, updates: Partial<StudyPlan>) {
    try {
      await updateStudyPlan(planId, updates);
      setSelectedPlan(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update study plan:', error);
      alert('Failed to update study plan. Please try again.');
    }
  }

  function getUpcomingSession(plan: StudyPlan): StudySession | null {
    const now = new Date();
    const upcoming = plan.sessions
      .filter((s) => !s.completed && new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] || null;
  }

  function getProgress(plan: StudyPlan): number {
    if (plan.sessions.length === 0) return 0;
    const completed = plan.sessions.filter((s) => s.completed).length;
    return Math.round((completed / plan.sessions.length) * 100);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{activePlans.length}</div>
          <div className="mt-1 text-sm text-white/80">Active Plans</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{draftPlans.length}</div>
          <div className="mt-1 text-sm text-white/80">Drafts</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{completedPlans.length}</div>
          <div className="mt-1 text-sm text-white/80">Completed</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Study Plan
        </button>
      </div>

      {/* Active Plans */}
      {activePlans.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Active Plans</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activePlans.map((plan) => {
              const upcoming = getUpcomingSession(plan);
              const progress = getProgress(plan);

              return (
                <button
                  key={plan.id}
                  type="button"
                  className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-lg text-left w-full"
                  onClick={() => setSelectedPlan(plan)}
                >
                  <h4 className="font-bold text-slate-900">{plan.title}</h4>
                  {plan.description && (
                    <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-medium text-slate-900">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {upcoming && (
                    <div className="mt-4 rounded-lg bg-blue-50 p-3">
                      <div className="text-xs font-medium text-blue-900">Next Session</div>
                      <div className="mt-1 text-sm font-bold text-blue-700">{upcoming.title}</div>
                      <div className="mt-1 text-xs text-blue-600">
                        {new Date(upcoming.date).toLocaleDateString()} at {upcoming.startTime}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.goals.slice(0, 3).map((goal, index) => (
                      <span
                        key={`${goal.slice(0, 10)}-${index}`}
                        className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Draft Plans */}
      {draftPlans.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Drafts</h3>
          <div className="space-y-3">
            {draftPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-white p-4 shadow transition hover:shadow-md text-left"
                onClick={() => setSelectedPlan(plan)}
              >
                <div>
                  <h4 className="font-bold text-slate-900">{plan.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">{plan.sessions.length} sessions planned</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdatePlan(plan.id, { status: 'active' });
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Activate
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <div className="text-5xl">📚</div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No study plans yet</h3>
          <p className="mt-2 text-slate-600">Create a study plan to organize your learning schedule</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Study Plan
          </button>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateForm && (
        <StudyPlanForm
          learnerId={learnerId}
          onSubmit={handleCreatePlan}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Plan Details Modal */}
      {selectedPlan && (
        <PlanDetailsModal
          plan={selectedPlan}
          onUpdate={(updates) => handleUpdatePlan(selectedPlan.id, updates)}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  );
}

// Study Plan Form Component
function StudyPlanForm({
  learnerId,
  onSubmit,
  onCancel,
}: Readonly<{
  learnerId: string;
  onSubmit: (data: Partial<StudyPlan>) => void;
  onCancel: () => void;
}>) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    goals: '',
  });

  const [sessions, setSessions] = useState<Partial<StudySession>[]>([
    { title: '', date: '', startTime: '09:00', endTime: '10:00', subject: '', topics: [], materials: [] },
  ]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...formData,
      goals: formData.goals.split(',').map((g) => g.trim()).filter(Boolean),
      sessions: sessions as StudySession[],
      status: 'draft',
    });
  }

  function addSession() {
    setSessions([
      ...sessions,
      { title: '', date: '', startTime: '09:00', endTime: '10:00', subject: '', topics: [], materials: [] },
    ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">New Study Plan</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label htmlFor="plan-title" className="block text-sm font-medium text-slate-700">Plan Title *</label>
            <input
              id="plan-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Algebra Final Exam Prep"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="plan-description" className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="plan-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Brief description of this study plan"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-start-date" className="block text-sm font-medium text-slate-700">Start Date *</label>
              <input
                id="plan-start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="plan-end-date" className="block text-sm font-medium text-slate-700">End Date *</label>
              <input
                id="plan-end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-goals" className="block text-sm font-medium text-slate-700">
              Goals (comma-separated)
            </label>
            <input
              id="plan-goals"
              type="text"
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="Master quadratic equations, Practice word problems"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="block text-sm font-medium text-slate-700">Study Sessions</span>
              <button
                type="button"
                onClick={addSession}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                + Add Session
              </button>
            </div>
            <div className="space-y-4">
              {sessions.map((session, index) => (
                <div key={session.id || `session-${index}`} className="rounded-lg border-2 border-slate-200 p-4">
                  <div className="grid gap-3">
                    <input
                      type="text"
                      value={session.title || ''}
                      onChange={(e) => {
                        const newSessions = [...sessions];
                        newSessions[index] = { ...session, title: e.target.value };
                        setSessions(newSessions);
                      }}
                      placeholder="Session title"
                      className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        value={session.date || ''}
                        onChange={(e) => {
                          const newSessions = [...sessions];
                          newSessions[index] = { ...session, date: e.target.value };
                          setSessions(newSessions);
                        }}
                        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="time"
                        value={session.startTime || '09:00'}
                        onChange={(e) => {
                          const newSessions = [...sessions];
                          newSessions[index] = { ...session, startTime: e.target.value };
                          setSessions(newSessions);
                        }}
                        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="time"
                        value={session.endTime || '10:00'}
                        onChange={(e) => {
                          const newSessions = [...sessions];
                          newSessions[index] = { ...session, endTime: e.target.value };
                          setSessions(newSessions);
                        }}
                        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={session.subject || ''}
                      onChange={(e) => {
                        const newSessions = [...sessions];
                        newSessions[index] = { ...session, subject: e.target.value };
                        setSessions(newSessions);
                      }}
                      placeholder="Subject (e.g., Math)"
                      className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Create Plan
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Plan Details Modal Component
function PlanDetailsModal({
  plan,
  onUpdate,
  onClose,
}: Readonly<{
  plan: StudyPlan;
  onUpdate: (updates: Partial<StudyPlan>) => void;
  onClose: () => void;
}>) {
  function toggleSessionComplete(sessionId: string) {
    const updatedSessions = plan.sessions.map((s) =>
      s.id === sessionId ? { ...s, completed: !s.completed } : s
    );
    onUpdate({ sessions: updatedSessions });
  }

  const progress = plan.sessions.length > 0
    ? Math.round((plan.sessions.filter((s) => s.completed).length / plan.sessions.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{plan.title}</h2>
            {plan.description && <p className="mt-2 text-slate-600">{plan.description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Overall Progress</span>
            <span className="font-medium text-slate-900">{progress}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-bold text-slate-900">Study Sessions</h3>
          <div className="mt-4 space-y-3">
            {plan.sessions.map((session) => (
              <div key={session.id} className="rounded-lg border-2 border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={session.completed}
                    onChange={() => toggleSessionComplete(session.id)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600"
                  />
                  <div className="flex-1">
                    <h4
                      className={`font-bold ${
                        session.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {session.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>📅 {new Date(session.date).toLocaleDateString()}</span>
                      <span>
                        ⏰ {session.startTime} - {session.endTime}
                      </span>
                      <span>📖 {session.subject}</span>
                    </div>
                    {session.topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {session.topics.map((topic, index) => (
                          <span
                            key={`${topic.slice(0, 15)}-${index}`}
                            className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {plan.goals.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-slate-900">Goals</h3>
            <ul className="mt-2 space-y-2">
              {plan.goals.map((goal, index) => (
                <li key={`${goal.slice(0, 15)}-${index}`} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-green-500">✓</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {plan.status === 'active' && (
            <button
              onClick={() => onUpdate({ status: 'completed' })}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
            >
              Mark as Completed
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
