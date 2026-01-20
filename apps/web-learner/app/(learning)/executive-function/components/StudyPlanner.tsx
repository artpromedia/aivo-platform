'use client';

import { useState } from 'react';
import { createStudyPlan, updateStudyPlan, sendPlanningMessage } from '../../../../lib/executive-function-api';
import type { StudyPlan, StudySession } from '../../../../lib/executive-function-api';

// Subject-specific study templates
const STUDY_TEMPLATES = [
  {
    id: 'math-test',
    name: 'Math Test Prep',
    icon: '🔢',
    description: 'Prepare for a math exam with practice problems and concept review',
    defaultSessions: [
      { title: 'Review Key Concepts', subject: 'Math', duration: 45 },
      { title: 'Practice Problems Set 1', subject: 'Math', duration: 60 },
      { title: 'Practice Problems Set 2', subject: 'Math', duration: 60 },
      { title: 'Review Mistakes', subject: 'Math', duration: 30 },
      { title: 'Practice Test', subject: 'Math', duration: 90 },
    ],
  },
  {
    id: 'reading-book',
    name: 'Book Report',
    icon: '📖',
    description: 'Complete a book and write a report',
    defaultSessions: [
      { title: 'Read Chapters 1-3', subject: 'Reading', duration: 45 },
      { title: 'Read Chapters 4-6', subject: 'Reading', duration: 45 },
      { title: 'Read Chapters 7-9', subject: 'Reading', duration: 45 },
      { title: 'Take Notes & Outline', subject: 'Writing', duration: 30 },
      { title: 'Write Draft', subject: 'Writing', duration: 60 },
      { title: 'Edit & Finalize', subject: 'Writing', duration: 30 },
    ],
  },
  {
    id: 'science-project',
    name: 'Science Project',
    icon: '🔬',
    description: 'Plan and execute a science project',
    defaultSessions: [
      { title: 'Research Topic', subject: 'Science', duration: 45 },
      { title: 'Plan Experiment', subject: 'Science', duration: 30 },
      { title: 'Gather Materials', subject: 'Science', duration: 30 },
      { title: 'Conduct Experiment', subject: 'Science', duration: 60 },
      { title: 'Record Results', subject: 'Science', duration: 30 },
      { title: 'Create Presentation', subject: 'Science', duration: 45 },
    ],
  },
  {
    id: 'language-vocab',
    name: 'Vocabulary Study',
    icon: '🗣️',
    description: 'Learn new vocabulary with spaced repetition',
    defaultSessions: [
      { title: 'Learn New Words (Set 1)', subject: 'Language', duration: 20 },
      { title: 'Review Set 1 + Learn Set 2', subject: 'Language', duration: 25 },
      { title: 'Review Sets 1-2 + Learn Set 3', subject: 'Language', duration: 30 },
      { title: 'Practice All Words', subject: 'Language', duration: 30 },
      { title: 'Final Review', subject: 'Language', duration: 20 },
    ],
  },
  {
    id: 'history-essay',
    name: 'History Essay',
    icon: '📜',
    description: 'Research and write a history essay',
    defaultSessions: [
      { title: 'Research Sources', subject: 'History', duration: 60 },
      { title: 'Take Notes', subject: 'History', duration: 45 },
      { title: 'Create Outline', subject: 'Writing', duration: 30 },
      { title: 'Write Introduction', subject: 'Writing', duration: 30 },
      { title: 'Write Body Paragraphs', subject: 'Writing', duration: 60 },
      { title: 'Write Conclusion & Edit', subject: 'Writing', duration: 45 },
    ],
  },
];

// Spaced repetition intervals
const SPACED_REPETITION_TIP = 'For better retention, space out your study sessions! Review material after 1 day, then 3 days, then 7 days.';

interface StudyPlannerProps {
  learnerId: string;
  plans: StudyPlan[];
  onUpdate: () => void;
}

/**
 * Study Planner Component
 *
 * Helps learners create and manage study schedules with AI assistance
 */
export function StudyPlanner({ learnerId, plans, onUpdate }: Readonly<StudyPlannerProps>) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
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

      {/* Spaced Repetition Tip */}
      <div className="rounded-xl bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-medium text-yellow-800">Study Tip</h4>
            <p className="mt-1 text-sm text-yellow-700">{SPACED_REPETITION_TIP}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
          >
            📋 Use Template
          </button>
          <button
            onClick={() => setShowAIHelper(true)}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-blue-600"
          >
            ✨ AI Study Plan
          </button>
        </div>
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

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          learnerId={learnerId}
          onSelect={async (templateId) => {
            const template = STUDY_TEMPLATES.find((t) => t.id === templateId);
            if (!template) return;

            const today = new Date();
            const sessions = template.defaultSessions.map((s, index) => {
              const sessionDate = new Date(today);
              sessionDate.setDate(today.getDate() + index + 1);
              return {
                id: `session-${Date.now()}-${index}`,
                planId: '',
                title: s.title,
                date: sessionDate.toISOString().split('T')[0],
                startTime: '16:00',
                endTime: `${16 + Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, '0')}`,
                subject: s.subject,
                topics: [],
                materials: [],
                completed: false,
              };
            });

            try {
              await createStudyPlan(learnerId, {
                title: template.name,
                description: template.description,
                startDate: sessions[0].date,
                endDate: sessions[sessions.length - 1].date,
                sessions: sessions as StudySession[],
                goals: [`Complete ${template.name}`],
                status: 'draft',
              });
              setShowTemplates(false);
              onUpdate();
            } catch (error) {
              console.error('Failed to create plan from template:', error);
              alert('Failed to create plan. Please try again.');
            }
          }}
          onCancel={() => setShowTemplates(false)}
        />
      )}

      {/* AI Helper Modal */}
      {showAIHelper && (
        <AIStudyPlanHelper
          learnerId={learnerId}
          onPlanCreated={() => {
            setShowAIHelper(false);
            onUpdate();
          }}
          onCancel={() => setShowAIHelper(false)}
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

// Templates Modal Component
function TemplatesModal({
  learnerId,
  onSelect,
  onCancel,
}: Readonly<{
  learnerId: string;
  onSelect: (templateId: string) => void;
  onCancel: () => void;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Choose a Study Template</h2>
        <p className="mt-1 text-sm text-slate-600">
          Start with a pre-made template and customize it for your needs
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {STUDY_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className="rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-purple-500 hover:bg-purple-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{template.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900">{template.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {template.defaultSessions.length} sessions
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="mt-6 w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// AI Study Plan Helper Component
function AIStudyPlanHelper({
  learnerId,
  onPlanCreated,
  onCancel,
}: Readonly<{
  learnerId: string;
  onPlanCreated: () => void;
  onCancel: () => void;
}>) {
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input');
  const [input, setInput] = useState({
    subject: '',
    goal: '',
    deadline: '',
    dailyTime: '30',
  });
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!input.subject || !input.goal || !input.deadline) {
      setError('Please fill in all required fields');
      return;
    }

    setStep('generating');
    setError(null);

    try {
      const prompt = `Help me create a study plan for ${input.subject}. My goal is: ${input.goal}. I need to be ready by ${input.deadline}. I can study ${input.dailyTime} minutes per day. Please suggest a structured study plan with specific sessions.`;

      const response = await sendPlanningMessage(learnerId, prompt);
      setAiSuggestions(response.response);
      setStep('review');
    } catch (err) {
      console.error('Failed to generate plan:', err);
      setError('Failed to generate plan. Please try again.');
      setStep('input');
    }
  }

  async function handleCreatePlan() {
    try {
      const today = new Date();
      const deadline = new Date(input.deadline);
      const days = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const sessionsCount = Math.min(days, 10);

      const sessions = Array.from({ length: sessionsCount }, (_, i) => {
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + Math.floor((i * days) / sessionsCount));
        return {
          id: `session-${Date.now()}-${i}`,
          planId: '',
          title: `Study Session ${i + 1}: ${input.subject}`,
          date: sessionDate.toISOString().split('T')[0],
          startTime: '16:00',
          endTime: `${16 + Math.floor(parseInt(input.dailyTime, 10) / 60)}:${String(parseInt(input.dailyTime, 10) % 60).padStart(2, '0')}`,
          subject: input.subject,
          topics: [],
          materials: [],
          completed: false,
        };
      });

      await createStudyPlan(learnerId, {
        title: `${input.subject} - ${input.goal}`,
        description: `AI-generated study plan. ${aiSuggestions.slice(0, 200)}...`,
        startDate: sessions[0].date,
        endDate: input.deadline,
        sessions: sessions as StudySession[],
        goals: [input.goal],
        status: 'draft',
      });

      onPlanCreated();
    } catch (err) {
      console.error('Failed to create plan:', err);
      setError('Failed to create plan. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-2xl">
            ✨
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Study Plan Generator</h2>
            <p className="text-sm text-slate-600">Let AI help create a personalized study plan</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {step === 'input' && (
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="ai-subject" className="block text-sm font-medium text-slate-700">
                What subject are you studying? *
              </label>
              <input
                id="ai-subject"
                type="text"
                value={input.subject}
                onChange={(e) => setInput({ ...input, subject: e.target.value })}
                placeholder="e.g., Algebra, History, Spanish"
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="ai-goal" className="block text-sm font-medium text-slate-700">
                What&apos;s your goal? *
              </label>
              <input
                id="ai-goal"
                type="text"
                value={input.goal}
                onChange={(e) => setInput({ ...input, goal: e.target.value })}
                placeholder="e.g., Pass the final exam, Learn 100 vocabulary words"
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ai-deadline" className="block text-sm font-medium text-slate-700">
                  Deadline *
                </label>
                <input
                  id="ai-deadline"
                  type="date"
                  value={input.deadline}
                  onChange={(e) => setInput({ ...input, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ai-daily-time" className="block text-sm font-medium text-slate-700">
                  Daily study time (minutes)
                </label>
                <select
                  id="ai-daily-time"
                  value={input.dailyTime}
                  onChange={(e) => setInput({ ...input, dailyTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-purple-500 focus:outline-none"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleGenerate}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 font-bold text-white hover:from-purple-700 hover:to-blue-700"
              >
                ✨ Generate Study Plan
              </button>
              <button
                onClick={onCancel}
                className="rounded-lg border-2 border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="mt-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            <p className="mt-4 text-slate-600">AI is creating your personalized study plan...</p>
          </div>
        )}

        {step === 'review' && (
          <div className="mt-6">
            <h3 className="font-bold text-slate-900">AI Suggestions</h3>
            <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {aiSuggestions}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreatePlan}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700"
              >
                Create Plan
              </button>
              <button
                onClick={() => setStep('input')}
                className="rounded-lg bg-slate-100 px-4 py-3 font-medium text-slate-700 hover:bg-slate-200"
              >
                Edit Inputs
              </button>
              <button
                onClick={onCancel}
                className="rounded-lg border-2 border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
