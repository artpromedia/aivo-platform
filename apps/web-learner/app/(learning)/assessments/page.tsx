import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

// Types matching assessment-svc
type AssessmentType = 'QUIZ' | 'TEST' | 'PRACTICE' | 'DIAGNOSTIC' | 'ASSIGNMENT';
type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'graded';
type DifficultyLevel = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  subject: string;
  description: string;
  questionCount: number;
  timeLimit?: number; // in minutes
  dueDate?: string;
  status: AssessmentStatus;
  score?: number;
  maxScore?: number;
  difficulty: DifficultyLevel;
  attempts: number;
  maxAttempts: number;
  emoji: string;
  xpReward: number;
}

// Mock data for development
const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 'assess-1',
    title: 'Multiplication Facts Quiz',
    type: 'QUIZ',
    subject: 'Math',
    description: 'Test your knowledge of multiplication tables 1-12',
    questionCount: 20,
    timeLimit: 10,
    dueDate: '2025-01-20',
    status: 'not_started',
    difficulty: 'MEDIUM',
    attempts: 0,
    maxAttempts: 3,
    emoji: '🧮',
    xpReward: 100,
  },
  {
    id: 'assess-2',
    title: 'Reading Comprehension: The Water Cycle',
    type: 'ASSIGNMENT',
    subject: 'Science',
    description: 'Read the passage and answer questions about the water cycle',
    questionCount: 10,
    timeLimit: 30,
    dueDate: '2025-01-18',
    status: 'in_progress',
    difficulty: 'EASY',
    attempts: 1,
    maxAttempts: 2,
    emoji: '🌊',
    xpReward: 75,
  },
  {
    id: 'assess-3',
    title: 'Spelling Test - Week 15',
    type: 'TEST',
    subject: 'ELA',
    description: 'Weekly spelling test covering vocabulary words',
    questionCount: 15,
    timeLimit: 20,
    dueDate: '2025-01-17',
    status: 'not_started',
    difficulty: 'MEDIUM',
    attempts: 0,
    maxAttempts: 1,
    emoji: '✍️',
    xpReward: 150,
  },
  {
    id: 'assess-4',
    title: 'Math Practice: Fractions',
    type: 'PRACTICE',
    subject: 'Math',
    description: 'Practice adding and subtracting fractions',
    questionCount: 15,
    status: 'not_started',
    difficulty: 'MEDIUM',
    attempts: 0,
    maxAttempts: 999,
    emoji: '🔢',
    xpReward: 50,
  },
];

const COMPLETED_ASSESSMENTS: Assessment[] = [
  {
    id: 'assess-c1',
    title: 'Addition Quiz',
    type: 'QUIZ',
    subject: 'Math',
    description: 'Basic addition facts',
    questionCount: 20,
    status: 'graded',
    score: 18,
    maxScore: 20,
    difficulty: 'EASY',
    attempts: 1,
    maxAttempts: 3,
    emoji: '➕',
    xpReward: 80,
  },
  {
    id: 'assess-c2',
    title: 'Science Unit Test: Plants',
    type: 'TEST',
    subject: 'Science',
    description: 'Unit test on plant life cycles',
    questionCount: 25,
    status: 'graded',
    score: 22,
    maxScore: 25,
    difficulty: 'MEDIUM',
    attempts: 1,
    maxAttempts: 1,
    emoji: '🌱',
    xpReward: 200,
  },
  {
    id: 'assess-c3',
    title: 'Grammar Quiz: Parts of Speech',
    type: 'QUIZ',
    subject: 'ELA',
    description: 'Identify nouns, verbs, and adjectives',
    questionCount: 15,
    status: 'graded',
    score: 14,
    maxScore: 15,
    difficulty: 'MEDIUM',
    attempts: 1,
    maxAttempts: 2,
    emoji: '📝',
    xpReward: 100,
  },
];

function getTypeColor(type: AssessmentType): { bg: string; text: string } {
  switch (type) {
    case 'QUIZ': return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'TEST': return { bg: 'bg-purple-100', text: 'text-purple-700' };
    case 'PRACTICE': return { bg: 'bg-green-100', text: 'text-green-700' };
    case 'DIAGNOSTIC': return { bg: 'bg-orange-100', text: 'text-orange-700' };
    case 'ASSIGNMENT': return { bg: 'bg-pink-100', text: 'text-pink-700' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
}

function getDifficultyStars(difficulty: DifficultyLevel): number {
  switch (difficulty) {
    case 'BEGINNER': return 1;
    case 'EASY': return 2;
    case 'MEDIUM': return 3;
    case 'HARD': return 4;
    case 'EXPERT': return 5;
    default: return 3;
  }
}

function getScoreColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreEmoji(percentage: number): string {
  if (percentage >= 90) return '🌟';
  if (percentage >= 80) return '😊';
  if (percentage >= 70) return '👍';
  if (percentage >= 60) return '📈';
  return '💪';
}

export default async function AssessmentsPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  const firstName = session.name?.split(' ')[0] ?? 'Learner';
  const upcomingCount = MOCK_ASSESSMENTS.filter(a => a.status === 'not_started' || a.status === 'in_progress').length;
  const dueThisWeek = MOCK_ASSESSMENTS.filter(a => {
    if (!a.dueDate) return false;
    const daysUntilDue = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7 && daysUntilDue >= 0;
  });

  const averageScore = COMPLETED_ASSESSMENTS.length > 0
    ? Math.round(
        COMPLETED_ASSESSMENTS.reduce((sum, a) => sum + ((a.score || 0) / (a.maxScore || 1)) * 100, 0) /
          COMPLETED_ASSESSMENTS.length
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">My Assessments</h1>
            <p className="mt-2 text-emerald-100">
              Ready to show what you know, {firstName}?
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm text-emerald-100">Upcoming</p>
              <p className="text-2xl font-bold">{upcomingCount}</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm text-emerald-100">Avg Score</p>
              <p className="text-2xl font-bold">{averageScore}%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Due This Week Alert */}
      {dueThisWeek.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="font-semibold text-orange-800">Due This Week</h3>
              <p className="text-sm text-orange-700">
                You have {dueThisWeek.length} assessment{dueThisWeek.length > 1 ? 's' : ''} due in the next 7 days.
                Don&apos;t wait until the last minute!
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dueThisWeek.map(a => (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.id}`}
                    className="rounded-full bg-orange-200 px-3 py-1 text-sm font-medium text-orange-800 hover:bg-orange-300"
                  >
                    {a.emoji} {a.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Assessments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Ready to Take</h2>
          <div className="flex gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {MOCK_ASSESSMENTS.filter(a => a.status === 'not_started').length} new
            </span>
            {MOCK_ASSESSMENTS.filter(a => a.status === 'in_progress').length > 0 && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                {MOCK_ASSESSMENTS.filter(a => a.status === 'in_progress').length} in progress
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_ASSESSMENTS.map((assessment) => {
            const typeColor = getTypeColor(assessment.type);
            const stars = getDifficultyStars(assessment.difficulty);
            const daysUntilDue = assessment.dueDate
              ? Math.ceil((new Date(assessment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Link
                key={assessment.id}
                href={`/assessments/${assessment.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl">
                      {assessment.emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600">
                        {assessment.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColor.bg} ${typeColor.text}`}>
                          {assessment.type}
                        </span>
                        <span className="text-xs text-slate-500">{assessment.subject}</span>
                      </div>
                    </div>
                  </div>
                  {assessment.status === 'in_progress' && (
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                      In Progress
                    </span>
                  )}
                </div>

                <p className="mb-4 text-sm text-slate-600">{assessment.description}</p>

                {/* Details */}
                <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Questions</p>
                    <p className="font-medium text-slate-900">{assessment.questionCount}</p>
                  </div>
                  {assessment.timeLimit && (
                    <div>
                      <p className="text-xs text-slate-500">Time Limit</p>
                      <p className="font-medium text-slate-900">{assessment.timeLimit} min</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500">Difficulty</p>
                    <p className="font-medium text-yellow-500">
                      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Attempts</p>
                    <p className="font-medium text-slate-900">
                      {assessment.attempts}/{assessment.maxAttempts === 999 ? '∞' : assessment.maxAttempts}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div>
                    {daysUntilDue !== null && (
                      <span className={`text-sm ${
                        daysUntilDue <= 1 ? 'font-medium text-red-600' :
                        daysUntilDue <= 3 ? 'text-orange-600' : 'text-slate-500'
                      }`}>
                        {daysUntilDue === 0 ? 'Due today!' :
                         daysUntilDue === 1 ? 'Due tomorrow' :
                         `Due in ${daysUntilDue} days`}
                      </span>
                    )}
                    {!assessment.dueDate && (
                      <span className="text-sm text-slate-500">Practice anytime</span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                    ⭐ {assessment.xpReward} XP
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Practice Section */}
      <section className="rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 text-3xl text-white shadow-lg">
            🎯
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900">Practice Makes Perfect!</h3>
            <p className="text-sm text-green-700">
              Take unlimited practice quizzes to prepare for your tests. No grades, just learning!
            </p>
          </div>
          <Link
            href="/assessments?filter=practice"
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            Start Practice
          </Link>
        </div>
      </section>

      {/* Completed Assessments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Completed</h2>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {COMPLETED_ASSESSMENTS.length} finished
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Assessment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Type</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">Score</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">XP Earned</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COMPLETED_ASSESSMENTS.map((assessment) => {
                const percentage = Math.round(((assessment.score || 0) / (assessment.maxScore || 1)) * 100);
                const typeColor = getTypeColor(assessment.type);

                return (
                  <tr key={assessment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{assessment.emoji}</span>
                        <div>
                          <p className="font-medium text-slate-900">{assessment.title}</p>
                          <p className="text-xs text-slate-500">{assessment.subject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColor.bg} ${typeColor.text}`}>
                        {assessment.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-lg font-bold ${getScoreColor(percentage)}`}>
                          {percentage}%
                        </span>
                        <span>{getScoreEmoji(percentage)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {assessment.score}/{assessment.maxScore}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-yellow-600">
                        +{Math.round(assessment.xpReward * (percentage / 100))} XP
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/assessments/${assessment.id}/review`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Motivational Footer */}
      <section className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-6 text-center">
        <h3 className="text-lg font-bold text-purple-800">You&apos;re Doing Amazing!</h3>
        <p className="mt-2 text-purple-700">
          Your average score of <span className="font-bold">{averageScore}%</span> shows you&apos;re really learning.
          Keep it up! 🚀
        </p>
      </section>
    </div>
  );
}
