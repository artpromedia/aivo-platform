import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

// Mock data - would come from API in production
const MOCK_CONTINUE_LEARNING = [
  {
    id: 'lesson-1',
    courseId: 'math-101',
    title: 'Multiplying Fractions',
    courseName: 'Math 5',
    progress: 65,
    thumbnail: '🧮',
    estimatedTime: '15 min',
  },
  {
    id: 'lesson-2',
    courseId: 'science-101',
    title: 'The Water Cycle',
    courseName: 'Science 5',
    progress: 30,
    thumbnail: '🌊',
    estimatedTime: '20 min',
  },
];

const MOCK_DAILY_GOALS = [
  { id: 'g1', title: 'Complete 2 lessons', current: 1, target: 2, emoji: '📖' },
  { id: 'g2', title: 'Earn 100 XP', current: 75, target: 100, emoji: '⭐' },
  { id: 'g3', title: 'Practice math for 15 min', current: 10, target: 15, emoji: '🧮' },
];

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', title: 'First Steps', emoji: '👣', earned: true },
  { id: 'a2', title: 'Math Whiz', emoji: '🧠', earned: true },
  { id: 'a3', title: 'Science Star', emoji: '🌟', earned: false },
  { id: 'a4', title: 'Reading Pro', emoji: '📚', earned: false },
];

const MOCK_UPCOMING = [
  { id: 'u1', title: 'Math Quiz', dueDate: '2024-01-17', type: 'quiz', emoji: '📝' },
  { id: 'u2', title: 'Science Project', dueDate: '2024-01-20', type: 'project', emoji: '🔬' },
];

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  const firstName = session.name?.split(' ')[0] ?? 'Learner';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="mt-2 text-blue-100">Ready to learn something amazing today?</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-6 py-3 font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            Start Learning ▶️
          </Link>
        </div>

        {/* Daily Goals Progress */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {MOCK_DAILY_GOALS.map((goal) => (
            <div key={goal.id} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span>{goal.emoji}</span>
                <span className="truncate">{goal.title}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-blue-100">
                {goal.current}/{goal.target}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Continue Learning */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Continue Learning</h2>
              <Link href="/courses" className="text-sm text-blue-600 hover:underline">
                View all →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {MOCK_CONTINUE_LEARNING.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${lesson.courseId}/lessons/${lesson.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-2xl">
                      {lesson.thumbnail}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {lesson.estimatedTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                    {lesson.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{lesson.courseName}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-medium text-blue-600">{lesson.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${lesson.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* AI Tutor Quick Access */}
          <section className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl text-white shadow-lg">
                🤖
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-900">Need Help?</h3>
                <p className="text-sm text-purple-700">
                  Ask your AI tutor anything about your lessons
                </p>
              </div>
              <Link
                href="/tutor"
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
              >
                Chat Now
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Due */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">📅 Upcoming</h2>
            <div className="space-y-3">
              {MOCK_UPCOMING.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500">
                      Due {new Date(item.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Achievements */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">🏆 Achievements</h2>
              <Link href="/achievements" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MOCK_ACHIEVEMENTS.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 ${
                    achievement.earned ? 'bg-yellow-50' : 'bg-slate-100 opacity-50'
                  }`}
                  title={achievement.title}
                >
                  <span className="text-2xl">{achievement.emoji}</span>
                  <span className="text-[10px] text-slate-600">{achievement.earned ? '✓' : '?'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Learning Streak */}
          <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-2xl text-white">
                🔥
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-700">5 Days</div>
                <div className="text-sm text-orange-600">Learning Streak!</div>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div key={day + i} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                      i < 5
                        ? 'bg-orange-500 text-white'
                        : i === 5
                          ? 'border-2 border-dashed border-orange-300 text-orange-400'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {i < 5 ? '✓' : day}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
