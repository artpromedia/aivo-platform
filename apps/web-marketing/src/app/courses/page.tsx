import { ArrowRight, BookOpen, Code, Palette, Calculator, FlaskConical, Languages, Search, Star } from 'lucide-react';
import Link from 'next/link';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';

const categories = [
  { label: 'All Courses', value: 'all', count: 200 },
  { label: 'Technology', value: 'technology', count: 45 },
  { label: 'Design', value: 'design', count: 32 },
  { label: 'Mathematics', value: 'math', count: 38 },
  { label: 'Science', value: 'science', count: 35 },
  { label: 'Languages', value: 'languages', count: 28 },
  { label: 'Reading & ELA', value: 'ela', count: 22 },
];

const courses = [
  {
    slug: 'introduction-to-coding',
    title: 'Introduction to Coding',
    description: 'Learn the fundamentals of programming through interactive, visual coding exercises designed for young learners.',
    category: 'Technology',
    icon: Code,
    color: 'bg-theme-primary-100 text-theme-primary-600',
    level: 'Beginner',
    lessons: 24,
    duration: '6 weeks',
    rating: 4.9,
    students: 1240,
  },
  {
    slug: 'creative-design-basics',
    title: 'Creative Design Basics',
    description: 'Explore colors, shapes, and digital design tools in this hands-on creative course.',
    category: 'Design',
    icon: Palette,
    color: 'bg-accent-100 text-accent-600',
    level: 'Beginner',
    lessons: 18,
    duration: '4 weeks',
    rating: 4.8,
    students: 890,
  },
  {
    slug: 'algebra-foundations',
    title: 'Algebra Foundations',
    description: 'Build a solid foundation in algebraic thinking with adaptive exercises and real-world applications.',
    category: 'Math',
    icon: Calculator,
    color: 'bg-mint-100 text-mint-600',
    level: 'Intermediate',
    lessons: 32,
    duration: '8 weeks',
    rating: 4.7,
    students: 2150,
  },
  {
    slug: 'exploring-earth-science',
    title: 'Exploring Earth Science',
    description: 'Discover the wonders of our planet through interactive simulations and virtual experiments.',
    category: 'Science',
    icon: FlaskConical,
    color: 'bg-sky-100 text-sky-600',
    level: 'Beginner',
    lessons: 20,
    duration: '5 weeks',
    rating: 4.9,
    students: 1560,
  },
  {
    slug: 'spanish-for-beginners',
    title: 'Spanish for Beginners',
    description: 'Start your language learning journey with AI-powered pronunciation and vocabulary building.',
    category: 'Languages',
    icon: Languages,
    color: 'bg-sunshine-100 text-sunshine-600',
    level: 'Beginner',
    lessons: 30,
    duration: '10 weeks',
    rating: 4.8,
    students: 980,
  },
  {
    slug: 'advanced-reading-skills',
    title: 'Advanced Reading Skills',
    description: 'Strengthen comprehension, critical thinking, and analytical reading skills with personalized content.',
    category: 'ELA',
    icon: BookOpen,
    color: 'bg-coral-100 text-coral-600',
    level: 'Advanced',
    lessons: 16,
    duration: '4 weeks',
    rating: 4.6,
    students: 670,
  },
  {
    slug: 'geometry-visual-thinking',
    title: 'Geometry & Visual Thinking',
    description: 'Master geometric concepts through visual, kinesthetic learning with interactive 3D models.',
    category: 'Math',
    icon: Calculator,
    color: 'bg-mint-100 text-mint-600',
    level: 'Intermediate',
    lessons: 28,
    duration: '7 weeks',
    rating: 4.8,
    students: 1100,
  },
  {
    slug: 'web-design-for-kids',
    title: 'Web Design for Kids',
    description: 'Create real websites with HTML, CSS, and JavaScript in a fun, guided environment.',
    category: 'Technology',
    icon: Code,
    color: 'bg-theme-primary-100 text-theme-primary-600',
    level: 'Intermediate',
    lessons: 22,
    duration: '6 weeks',
    rating: 4.9,
    students: 750,
  },
  {
    slug: 'biology-life-science',
    title: 'Biology & Life Science',
    description: 'Explore living organisms, ecosystems, and the human body with immersive virtual labs.',
    category: 'Science',
    icon: FlaskConical,
    color: 'bg-sky-100 text-sky-600',
    level: 'Beginner',
    lessons: 26,
    duration: '6 weeks',
    rating: 4.7,
    students: 1320,
  },
];

export const metadata = {
  title: 'Course Catalog | AIVO Learning',
  description: 'Browse hundreds of expert-designed courses across every subject, tailored for K-12 learners with personalized AI support.',
};

export default function CoursesPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <section className="bg-gradient-to-br from-theme-primary-600 to-theme-primary-800 pt-32 pb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4">
              Course Catalog
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Explore 200+ expert-designed courses with AI-powered personalization
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                className="w-full pl-12 pr-4 py-4 rounded-full bg-white shadow-lg text-gray-900 border-0 focus:ring-2 focus:ring-accent-400 outline-none text-base"
              />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
            {/* Sidebar Filters */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
                <h3 className="font-display font-bold text-gray-900 mb-4">Categories</h3>
                <nav className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span>{cat.label}</span>
                      <span className="text-xs text-gray-400">{cat.count}</span>
                    </button>
                  ))}
                </nav>

                <hr className="my-6 border-gray-100" />

                <h3 className="font-display font-bold text-gray-900 mb-4">Level</h3>
                <div className="space-y-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                    <label key={level} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-theme-primary-600 focus:ring-theme-primary-500" />
                      {level}
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            {/* Course Grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-500 text-sm">Showing {courses.length} courses</p>
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700">
                  <option>Most Popular</option>
                  <option>Highest Rated</option>
                  <option>Newest</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const Icon = course.icon;
                  return (
                    <Link
                      key={course.slug}
                      href={`/courses/${course.slug}`}
                      className="group bg-white rounded-2xl border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="p-6 pb-0">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-xl ${course.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-medium text-theme-primary-600 bg-theme-primary-50 px-3 py-1 rounded-full">
                            {course.level}
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-gray-900 mb-2 group-hover:text-theme-primary-600 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-2">
                          {course.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{course.lessons} lessons</span>
                          <span>•</span>
                          <span>{course.duration}</span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-6 pt-4 flex items-center justify-between border-t border-gray-50 mt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-sunshine-500 fill-current" />
                            <span className="text-sm font-semibold text-gray-900">{course.rating}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {course.students.toLocaleString()} students
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-theme-primary-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
