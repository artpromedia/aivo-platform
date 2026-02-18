'use client';

import {
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  BookOpen,
  Video,
  Gamepad2,
  FileText,
  PenTool,
  ChevronRight,
} from 'lucide-react';
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

const LESSON_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  interactive: Gamepad2,
  quiz: FileText,
  practice: PenTool,
};

export default function CoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const course = COURSES[courseId];

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Course Not Found</h1>
        <p className="text-gray-500 mb-6">This course doesn&apos;t exist or has been moved.</p>
        <Link
          href="/courses"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Browse All Courses
        </Link>
      </div>
    );
  }

  const completedLessons = course.lessons.filter((l) => l.completed).length;
  const nextLesson = course.lessons.find((l) => !l.completed) ?? course.lessons[0];
  const totalDuration = course.lessons.reduce((sum, l) => {
    const mins = parseInt(l.duration);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back link */}
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </Link>

      {/* Course header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${course.color}`} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-4xl shrink-0">
              {course.emoji}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-500 mt-1">{course.description}</p>

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {course.lessons.length} lessons
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {totalDuration} min total
                </span>
              </div>

              {/* Progress */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">
                    {completedLessons} of {course.lessons.length} completed
                  </span>
                  <span className="font-semibold text-indigo-600">{course.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Continue button */}
          <div className="mt-6 flex justify-end">
            <Link
              href={`/courses/${courseId}/lessons/${nextLesson.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Play className="w-4 h-4" />
              Continue Learning
            </Link>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Curriculum</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {course.lessons.map((lesson, index) => {
            const TypeIcon = LESSON_TYPE_ICON[lesson.type] ?? BookOpen;
            return (
              <Link
                key={lesson.id}
                href={`/courses/${courseId}/lessons/${lesson.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition group"
              >
                {/* Status circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    lesson.completed
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {lesson.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${lesson.completed ? 'text-gray-400' : 'text-gray-900 group-hover:text-indigo-600'} transition-colors`}>
                    {lesson.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <TypeIcon className="w-3.5 h-3.5" />
                      <span className="capitalize">{lesson.type}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {lesson.duration}
                    </span>
                  </div>
                </div>

                {/* Action */}
                {lesson.completed ? (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Done</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
