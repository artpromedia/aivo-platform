import { ArrowLeft, BookOpen, Clock, Star, Users, Play, CheckCircle, Award } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';

// In production, this would come from an API/CMS
const courseData: Record<string, {
  title: string;
  description: string;
  longDescription: string;
  category: string;
  level: string;
  lessons: number;
  duration: string;
  rating: number;
  students: number;
  instructor: string;
  color: string;
  objectives: string[];
  curriculum: { title: string; lessons: number; duration: string }[];
}> = {
  'introduction-to-coding': {
    title: 'Introduction to Coding',
    description: 'Learn the fundamentals of programming through interactive, visual coding exercises designed for young learners.',
    longDescription: 'This comprehensive course introduces students to the world of programming through fun, interactive exercises. Using visual block-based coding and guided projects, learners build foundational skills in computational thinking, problem-solving, and logical reasoning. Our AI tutor adapts each lesson to the student\'s pace and learning style.',
    category: 'Technology',
    level: 'Beginner',
    lessons: 24,
    duration: '6 weeks',
    rating: 4.9,
    students: 1240,
    instructor: 'AIVO AI Tutor',
    color: 'from-theme-primary-500 to-theme-primary-700',
    objectives: [
      'Understand basic programming concepts',
      'Write simple programs with visual blocks',
      'Debug and fix code errors',
      'Build interactive projects and games',
      'Develop computational thinking skills',
    ],
    curriculum: [
      { title: 'Getting Started with Code', lessons: 4, duration: '1 week' },
      { title: 'Variables & Data Types', lessons: 4, duration: '1 week' },
      { title: 'Loops & Repetition', lessons: 4, duration: '1 week' },
      { title: 'Conditionals & Logic', lessons: 4, duration: '1 week' },
      { title: 'Functions & Reuse', lessons: 4, duration: '1 week' },
      { title: 'Final Project', lessons: 4, duration: '1 week' },
    ],
  },
};

// Fallback for any slug not in the map
const defaultCourse = {
  title: 'Course',
  description: 'An expert-designed course with AI-powered personalization.',
  longDescription: 'This course provides comprehensive coverage of the subject with adaptive AI tutoring, interactive exercises, and real-time progress tracking. Every lesson is personalized to the learner\'s unique style and pace.',
  category: 'General',
  level: 'Beginner',
  lessons: 20,
  duration: '5 weeks',
  rating: 4.8,
  students: 500,
  instructor: 'AIVO AI Tutor',
  color: 'from-theme-primary-500 to-theme-primary-700',
  objectives: [
    'Master core concepts',
    'Apply knowledge through projects',
    'Build real-world skills',
    'Track progress with AI insights',
  ],
  curriculum: [
    { title: 'Introduction', lessons: 4, duration: '1 week' },
    { title: 'Core Concepts', lessons: 6, duration: '2 weeks' },
    { title: 'Applied Practice', lessons: 6, duration: '1 week' },
    { title: 'Final Project', lessons: 4, duration: '1 week' },
  ],
};

export function generateMetadata({ params }: { params: { slug: string } }) {
  const course = courseData[params.slug] || defaultCourse;
  return {
    title: `${course.title} | AIVO Learning`,
    description: course.description,
  };
}

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  const course = courseData[params.slug] || { ...defaultCourse, title: params.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') };
  const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com';

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* Hero Banner */}
        <section className={`bg-gradient-to-br ${course.color} pt-32 pb-16 relative overflow-hidden`}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/courses" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </Link>

            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                  {course.level}
                </span>
              </div>

              <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4">
                {course.title}
              </h1>
              <p className="text-xl text-white/90 mb-8 max-w-2xl">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm mb-8">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.lessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-sunshine-400" />
                  <span>{course.rating} rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{course.students.toLocaleString()} students</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white text-theme-primary-600 hover:bg-white/90 rounded-full px-8" asChild>
                  <Link href={`${parentAppUrl}/register`}>
                    <Play className="w-5 h-5" />
                    Start Free Trial
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Course Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="lg:grid lg:grid-cols-3 lg:gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* About */}
              <section>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">About This Course</h2>
                <p className="text-gray-600 leading-relaxed text-lg">{course.longDescription}</p>
              </section>

              {/* Learning Objectives */}
              <section>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">What You&apos;ll Learn</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {course.objectives.map((obj) => (
                    <div key={obj} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-mint-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700">{obj}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Curriculum */}
              <section>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">Curriculum</h2>
                <div className="space-y-3">
                  {course.curriculum.map((module, i) => (
                    <div key={module.title} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-theme-primary-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-theme-primary-100 rounded-xl flex items-center justify-center">
                            <span className="font-display font-bold text-theme-primary-600">{i + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{module.title}</h3>
                            <p className="text-sm text-gray-500">{module.lessons} lessons • {module.duration}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="mt-12 lg:mt-0">
              <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-soft p-6 space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">Free</div>
                  <p className="text-gray-500 text-sm">with 14-day trial</p>
                </div>

                <Button size="lg" className="w-full bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-full" asChild>
                  <Link href={`${parentAppUrl}/register`}>
                    Start Free Trial
                  </Link>
                </Button>

                <hr className="border-gray-100" />

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 text-gray-600">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span>{course.lessons} interactive lessons</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{course.duration} to complete</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>AI-powered tutoring</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
