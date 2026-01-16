import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

// Types matching goal-svc
type GoalStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
type GoalDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL' | 'OTHER';

interface Goal {
  id: string;
  title: string;
  description: string;
  domain: GoalDomain;
  status: GoalStatus;
  targetDate: string;
  progressPercent: number;
  objectives: Objective[];
  emoji: string;
  streakDays: number;
  xpReward: number;
}

interface Objective {
  id: string;
  description: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'MET';
  progressPercent: number;
}

// Mock data for development
const MOCK_GOALS: Goal[] = [
  {
    id: 'goal-1',
    title: 'Master Multiplication Tables',
    description: 'Learn all multiplication facts from 1-12 with 95% accuracy',
    domain: 'MATH',
    status: 'ACTIVE',
    targetDate: '2025-03-15',
    progressPercent: 72,
    emoji: '🧮',
    streakDays: 5,
    xpReward: 500,
    objectives: [
      { id: 'obj-1', description: 'Complete 1-5 multiplication facts', status: 'MET', progressPercent: 100 },
      { id: 'obj-2', description: 'Complete 6-9 multiplication facts', status: 'IN_PROGRESS', progressPercent: 65 },
      { id: 'obj-3', description: 'Complete 10-12 multiplication facts', status: 'NOT_STARTED', progressPercent: 0 },
    ],
  },
  {
    id: 'goal-2',
    title: 'Read 20 Books This Year',
    description: 'Read and complete comprehension quizzes for 20 chapter books',
    domain: 'ELA',
    status: 'ACTIVE',
    targetDate: '2025-06-01',
    progressPercent: 35,
    emoji: '📚',
    streakDays: 12,
    xpReward: 1000,
    objectives: [
      { id: 'obj-4', description: 'Read 5 fiction books', status: 'MET', progressPercent: 100 },
      { id: 'obj-5', description: 'Read 5 non-fiction books', status: 'IN_PROGRESS', progressPercent: 40 },
      { id: 'obj-6', description: 'Read 5 mystery books', status: 'NOT_STARTED', progressPercent: 0 },
      { id: 'obj-7', description: 'Read 5 science books', status: 'NOT_STARTED', progressPercent: 0 },
    ],
  },
  {
    id: 'goal-3',
    title: 'Science Explorer Badge',
    description: 'Complete all units in the Science Explorer module',
    domain: 'SCIENCE',
    status: 'ACTIVE',
    targetDate: '2025-04-01',
    progressPercent: 50,
    emoji: '🔬',
    streakDays: 3,
    xpReward: 750,
    objectives: [
      { id: 'obj-8', description: 'Complete Life Science unit', status: 'MET', progressPercent: 100 },
      { id: 'obj-9', description: 'Complete Earth Science unit', status: 'IN_PROGRESS', progressPercent: 50 },
      { id: 'obj-10', description: 'Complete Physical Science unit', status: 'NOT_STARTED', progressPercent: 0 },
    ],
  },
  {
    id: 'goal-4',
    title: 'Spelling Champion',
    description: 'Score 100% on 10 weekly spelling tests',
    domain: 'ELA',
    status: 'ACTIVE',
    targetDate: '2025-05-01',
    progressPercent: 60,
    emoji: '✍️',
    streakDays: 0,
    xpReward: 400,
    objectives: [
      { id: 'obj-11', description: 'Complete weeks 1-5 with 100%', status: 'MET', progressPercent: 100 },
      { id: 'obj-12', description: 'Complete weeks 6-10 with 100%', status: 'IN_PROGRESS', progressPercent: 20 },
    ],
  },
];

const COMPLETED_GOALS = [
  {
    id: 'goal-c1',
    title: 'Addition & Subtraction Master',
    domain: 'MATH',
    completedDate: '2024-12-15',
    xpEarned: 300,
    emoji: '➕',
  },
  {
    id: 'goal-c2',
    title: 'First Chapter Book',
    domain: 'ELA',
    completedDate: '2024-11-20',
    xpEarned: 200,
    emoji: '📖',
  },
];

function getDomainColor(domain: GoalDomain): { bg: string; text: string; border: string } {
  switch (domain) {
    case 'MATH': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    case 'ELA': return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
    case 'SCIENCE': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    case 'SPEECH': return { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' };
    case 'SEL': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

function getStatusBadge(status: GoalStatus): { color: string; label: string } {
  switch (status) {
    case 'ACTIVE': return { color: 'bg-green-100 text-green-800', label: 'Active' };
    case 'COMPLETED': return { color: 'bg-blue-100 text-blue-800', label: 'Completed' };
    case 'ON_HOLD': return { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' };
    case 'DRAFT': return { color: 'bg-gray-100 text-gray-800', label: 'Draft' };
    case 'ARCHIVED': return { color: 'bg-gray-100 text-gray-500', label: 'Archived' };
    default: return { color: 'bg-gray-100 text-gray-800', label: status };
  }
}

export default async function GoalsPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  const firstName = session.name?.split(' ')[0] ?? 'Learner';
  const totalActiveGoals = MOCK_GOALS.filter(g => g.status === 'ACTIVE').length;
  const averageProgress = Math.round(
    MOCK_GOALS.filter(g => g.status === 'ACTIVE').reduce((sum, g) => sum + g.progressPercent, 0) / totalActiveGoals
  );
  const totalXpPossible = MOCK_GOALS.reduce((sum, g) => sum + g.xpReward, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">My Learning Goals</h1>
            <p className="mt-2 text-indigo-100">
              Keep working hard, {firstName}! You&apos;re making great progress.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm text-indigo-100">Active Goals</p>
              <p className="text-2xl font-bold">{totalActiveGoals}</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm text-indigo-100">Avg Progress</p>
              <p className="text-2xl font-bold">{averageProgress}%</p>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-indigo-100">Overall Goal Progress</span>
            <span className="font-medium">{averageProgress}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>
      </section>

      {/* XP Progress */}
      <section className="rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500 text-3xl shadow-lg">
            ⭐
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-yellow-900">XP Rewards Available</h3>
            <p className="text-sm text-yellow-700">
              Complete your goals to earn up to <span className="font-bold">{totalXpPossible} XP</span>
            </p>
          </div>
          <Link
            href="/achievements"
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-600"
          >
            View Rewards
          </Link>
        </div>
      </section>

      {/* Active Goals */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Active Goals</h2>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {totalActiveGoals} in progress
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_GOALS.filter(g => g.status === 'ACTIVE').map((goal) => {
            const domainColor = getDomainColor(goal.domain);
            const daysUntilDue = Math.ceil(
              (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const completedObjectives = goal.objectives.filter(o => o.status === 'MET').length;

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${domainColor.bg} text-2xl`}>
                      {goal.emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">
                        {goal.title}
                      </h3>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${domainColor.bg} ${domainColor.text}`}>
                        {goal.domain}
                      </span>
                    </div>
                  </div>
                  {goal.streakDays > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-sm font-medium text-orange-700">
                      🔥 {goal.streakDays}
                    </div>
                  )}
                </div>

                <p className="mb-4 text-sm text-slate-600">{goal.description}</p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-medium text-indigo-600">{goal.progressPercent}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.progressPercent >= 70
                          ? 'bg-green-500'
                          : goal.progressPercent >= 40
                            ? 'bg-yellow-500'
                            : 'bg-indigo-500'
                      }`}
                      style={{ width: `${goal.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Objectives Preview */}
                <div className="mb-4 rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Objectives: {completedObjectives}/{goal.objectives.length} completed
                  </p>
                  <div className="flex gap-1">
                    {goal.objectives.map((obj) => (
                      <div
                        key={obj.id}
                        className={`h-2 flex-1 rounded-full ${
                          obj.status === 'MET'
                            ? 'bg-green-500'
                            : obj.status === 'IN_PROGRESS'
                              ? 'bg-yellow-500'
                              : 'bg-slate-200'
                        }`}
                        title={obj.description}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm">
                  <span className={`${daysUntilDue <= 7 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                    {daysUntilDue > 0 ? `${daysUntilDue} days left` : 'Due today!'}
                  </span>
                  <span className="flex items-center gap-1 text-yellow-600">
                    ⭐ {goal.xpReward} XP
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Completed Goals */}
      {COMPLETED_GOALS.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Completed Goals</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {COMPLETED_GOALS.length} achieved
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            {COMPLETED_GOALS.map((goal, idx) => (
              <div
                key={goal.id}
                className={`flex items-center justify-between p-4 ${
                  idx !== COMPLETED_GOALS.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
                    {goal.emoji}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{goal.title}</h3>
                    <p className="text-xs text-slate-500">
                      Completed {new Date(goal.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                    ⭐ +{goal.xpEarned} XP
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm text-white">
                    ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Motivational Footer */}
      <section className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
        <h3 className="text-lg font-bold text-green-800">Keep Up the Great Work!</h3>
        <p className="mt-2 text-green-700">
          Every step forward brings you closer to achieving your goals. You&apos;ve got this! 💪
        </p>
      </section>
    </div>
  );
}
