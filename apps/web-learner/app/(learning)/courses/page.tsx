import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

// Mock data - would come from API in production
const MOCK_COURSES = [
  {
    id: 'math-101',
    title: 'Math 5',
    description: 'Master fractions, decimals, and problem-solving',
    thumbnail: '🧮',
    progress: 45,
    totalLessons: 24,
    completedLessons: 11,
    color: 'from-blue-500 to-cyan-500',
    nextLesson: {
      id: 'lesson-1',
      title: 'Multiplying Fractions',
    },
  },
  {
    id: 'science-101',
    title: 'Science 5',
    description: 'Explore earth science, life science, and physics',
    thumbnail: '🔬',
    progress: 30,
    totalLessons: 20,
    completedLessons: 6,
    color: 'from-green-500 to-emerald-500',
    nextLesson: {
      id: 'lesson-2',
      title: 'The Water Cycle',
    },
  },
  {
    id: 'reading-101',
    title: 'Reading & Language Arts',
    description: 'Improve reading comprehension and writing skills',
    thumbnail: '📚',
    progress: 60,
    totalLessons: 18,
    completedLessons: 11,
    color: 'from-purple-500 to-pink-500',
    nextLesson: {
      id: 'lesson-3',
      title: 'Story Elements',
    },
  },
  {
    id: 'social-101',
    title: 'Social Studies',
    description: 'Learn about history, geography, and civics',
    thumbnail: '🌍',
    progress: 20,
    totalLessons: 16,
    completedLessons: 3,
    color: 'from-orange-500 to-red-500',
    nextLesson: {
      id: 'lesson-4',
      title: 'American Revolution',
    },
  },
];

export default async function CoursesPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <p className="mt-1 text-slate-600">Continue where you left off or start something new</p>
      </div>

      {/* Course Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {MOCK_COURSES.map((course) => (
          <div
            key={course.id}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            {/* Course Header */}
            <div className={`bg-gradient-to-r ${course.color} p-6`}>
              <div className="flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm">
                  {course.thumbnail}
                </div>
                <div className="text-right text-white">
                  <div className="text-2xl font-bold">{course.progress}%</div>
                  <div className="text-sm text-white/80">Complete</div>
                </div>
              </div>
            </div>

            {/* Course Content */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{course.description}</p>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {course.completedLessons} of {course.totalLessons} lessons
                  </span>
                  <span>{course.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${course.color} transition-all`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              {/* Next Lesson */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-slate-500">Next:</span>{' '}
                  <span className="font-medium text-slate-700">{course.nextLesson.title}</span>
                </div>
                <Link
                  href={`/courses/${course.id}/lessons/${course.nextLesson.id}`}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Continue ▶️
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Explore More Section */}
      <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="text-4xl">🌟</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-700">Want to learn more?</h3>
        <p className="mt-1 text-sm text-slate-500">
          Explore additional courses and topics available in your learning path
        </p>
        <Link
          href="/explore"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Explore Courses →
        </Link>
      </section>
    </div>
  );
}
