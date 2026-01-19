'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

// Mock course data
const COURSES: Record<string, {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  progress: number;
  lessons: Array<{
    id: string;
    title: string;
    duration: string;
    completed: boolean;
    type: 'video' | 'interactive' | 'quiz' | 'practice';
  }>;
}> = {
  'math-101': {
    id: 'math-101',
    title: 'Math 5',
    description: 'Master 5th grade math concepts including fractions, decimals, and geometry',
    emoji: '🧮',
    color: 'from-blue-500 to-indigo-600',
    progress: 65,
    lessons: [
      { id: 'lesson-1', title: 'Multiplying Fractions', duration: '15 min', completed: false, type: 'interactive' },
      { id: 'lesson-2', title: 'Dividing Fractions', duration: '18 min', completed: false, type: 'video' },
      { id: 'lesson-3', title: 'Fraction Word Problems', duration: '20 min', completed: false, type: 'practice' },
      { id: 'lesson-4', title: 'Fractions Quiz', duration: '10 min', completed: false, type: 'quiz' },
      { id: 'lesson-5', title: 'Introduction to Decimals', duration: '12 min', completed: true, type: 'video' },
      { id: 'lesson-6', title: 'Adding Decimals', duration: '15 min', completed: true, type: 'interactive' },
      { id: 'lesson-7', title: 'Subtracting Decimals', duration: '15 min', completed: true, type: 'interactive' },
      { id: 'lesson-8', title: 'Decimals Quiz', duration: '10 min', completed: true, type: 'quiz' },
    ],
  },
  'science-101': {
    id: 'science-101',
    title: 'Science 5',
    description: 'Explore the wonders of science including earth systems, matter, and energy',
    emoji: '🔬',
    color: 'from-green-500 to-teal-600',
    progress: 30,
    lessons: [
      { id: 'lesson-1', title: 'The Water Cycle', duration: '20 min', completed: false, type: 'interactive' },
      { id: 'lesson-2', title: 'Weather Patterns', duration: '18 min', completed: false, type: 'video' },
      { id: 'lesson-3', title: 'Climate vs Weather', duration: '15 min', completed: false, type: 'practice' },
      { id: 'lesson-4', title: 'Earth Systems Quiz', duration: '10 min', completed: false, type: 'quiz' },
      { id: 'lesson-5', title: 'States of Matter', duration: '15 min', completed: true, type: 'video' },
      { id: 'lesson-6', title: 'Physical Changes', duration: '18 min', completed: true, type: 'interactive' },
    ],
  },
  'reading-101': {
    id: 'reading-101',
    title: 'Reading 5',
    description: 'Build reading comprehension and analytical skills',
    emoji: '📖',
    color: 'from-purple-500 to-pink-600',
    progress: 45,
    lessons: [
      { id: 'lesson-1', title: 'Finding Main Ideas', duration: '15 min', completed: true, type: 'interactive' },
      { id: 'lesson-2', title: 'Supporting Details', duration: '18 min', completed: true, type: 'video' },
      { id: 'lesson-3', title: 'Making Inferences', duration: '20 min', completed: false, type: 'practice' },
      { id: 'lesson-4', title: 'Context Clues', duration: '15 min', completed: false, type: 'interactive' },
      { id: 'lesson-5', title: 'Comprehension Quiz', duration: '12 min', completed: false, type: 'quiz' },
    ],
  },
  'writing-101': {
    id: 'writing-101',
    title: 'Writing 5',
    description: 'Develop strong writing skills for essays, stories, and more',
    emoji: '✍️',
    color: 'from-orange-500 to-red-600',
    progress: 20,
    lessons: [
      { id: 'lesson-1', title: 'Paragraph Structure', duration: '15 min', completed: true, type: 'video' },
      { id: 'lesson-2', title: 'Topic Sentences', duration: '12 min', completed: false, type: 'interactive' },
      { id: 'lesson-3', title: 'Supporting Details', duration: '18 min', completed: false, type: 'practice' },
      { id: 'lesson-4', title: 'Writing Practice', duration: '25 min', completed: false, type: 'practice' },
    ],
  },
};

const LESSON_TYPE_ICONS = {
  video: '🎬',
  interactive: '🎮',
  quiz: '📝',
  practice: '✏️',
};

export default function CoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const course = COURSES[courseId];

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Course Not Found</h1>
        <p className="text-slate-600 mb-6">This course doesn&apos;t exist or has been moved.</p>
        <Link
          href="/courses"
          className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Browse All Courses
        </Link>
      </div>
    );
  }

  const completedLessons = course.lessons.filter((l) => l.completed).length;

  return (
    <div className="space-y-8">
      {/* Course Header */}
      <section className={`rounded-2xl bg-gradient-to-r ${course.color} p-8 text-white shadow-lg`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-5xl">
            {course.emoji}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="mt-2 text-white/80">{course.description}</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{completedLessons} of {course.lessons.length} lessons completed</span>
                <span className="font-bold">{course.progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          </div>
          <Link
            href={`/courses/${courseId}/lessons/${course.lessons.find((l) => !l.completed)?.id ?? course.lessons[0].id}`}
            className="rounded-xl bg-white/20 px-6 py-3 font-medium text-white backdrop-blur-sm hover:bg-white/30 text-center"
          >
            Continue Learning ▶️
          </Link>
        </div>
      </section>

      {/* Lessons List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">📚 Lessons</h2>
        <div className="space-y-3">
          {course.lessons.map((lesson, index) => (
            <Link
              key={lesson.id}
              href={`/courses/${courseId}/lessons/${lesson.id}`}
              className={`flex items-center gap-4 rounded-xl p-4 transition ${
                lesson.completed
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {/* Lesson Number */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                  lesson.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {lesson.completed ? '✓' : index + 1}
              </div>

              {/* Lesson Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{LESSON_TYPE_ICONS[lesson.type]}</span>
                  <span className="font-medium text-slate-900">{lesson.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                  <span>{lesson.duration}</span>
                  <span className="capitalize">{lesson.type}</span>
                </div>
              </div>

              {/* Status */}
              {lesson.completed ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Completed
                </span>
              ) : (
                <span className="text-blue-600">Start →</span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
