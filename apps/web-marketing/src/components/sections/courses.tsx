'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Code, Palette, Calculator, FlaskConical, Languages } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const categories = [
  { label: 'All', value: 'all' },
  { label: 'Technology', value: 'technology' },
  { label: 'Design', value: 'design' },
  { label: 'Math', value: 'math' },
  { label: 'Science', value: 'science' },
  { label: 'Languages', value: 'languages' },
];

const courses = [
  {
    title: 'Introduction to Coding',
    category: 'technology',
    icon: Code,
    color: 'bg-theme-primary-100 text-theme-primary-600',
    level: 'Beginner',
    lessons: 24,
    duration: '6 weeks',
    rating: 4.9,
    students: 1240,
  },
  {
    title: 'Creative Design Basics',
    category: 'design',
    icon: Palette,
    color: 'bg-accent-100 text-accent-600',
    level: 'Beginner',
    lessons: 18,
    duration: '4 weeks',
    rating: 4.8,
    students: 890,
  },
  {
    title: 'Algebra Foundations',
    category: 'math',
    icon: Calculator,
    color: 'bg-mint-100 text-mint-600',
    level: 'Intermediate',
    lessons: 32,
    duration: '8 weeks',
    rating: 4.7,
    students: 2150,
  },
  {
    title: 'Exploring Earth Science',
    category: 'science',
    icon: FlaskConical,
    color: 'bg-sky-100 text-sky-600',
    level: 'Beginner',
    lessons: 20,
    duration: '5 weeks',
    rating: 4.9,
    students: 1560,
  },
  {
    title: 'Spanish for Beginners',
    category: 'languages',
    icon: Languages,
    color: 'bg-sunshine-100 text-sunshine-600',
    level: 'Beginner',
    lessons: 30,
    duration: '10 weeks',
    rating: 4.8,
    students: 980,
  },
  {
    title: 'Advanced Reading Skills',
    category: 'technology',
    icon: BookOpen,
    color: 'bg-coral-100 text-coral-600',
    level: 'Advanced',
    lessons: 16,
    duration: '4 weeks',
    rating: 4.6,
    students: 670,
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function CoursesSection() {
  const [active, setActive] = React.useState('all');

  const filtered = active === 'all' ? courses : courses.filter((c) => c.category === active);

  return (
    <Section id="courses" background="white" padding="lg">
      <SectionHeader
        badge="Popular Courses"
        title={
          <>
            Explore Our <span className="text-gradient-primary">Course Catalog</span>
          </>
        }
        description="Hundreds of expert-designed courses across every subject, tailored for K-12 learners with personalized AI support."
      />

      {/* Category Filter */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActive(cat.value)}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-medium transition-all',
              active === cat.value
                ? 'bg-theme-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course, index) => {
          const Icon = course.icon;
          return (
            <motion.div
              key={course.title}
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white rounded-2xl border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 pb-0">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-3 rounded-xl', course.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-theme-primary-600 bg-theme-primary-50 px-3 py-1 rounded-full">
                    {course.level}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-gray-900 mb-2 group-hover:text-theme-primary-600 transition-colors">
                  {course.title}
                </h3>

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
                    <span className="text-sunshine-500">★</span>
                    <span className="text-sm font-semibold text-gray-900">{course.rating}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {course.students.toLocaleString()} students
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-theme-primary-600 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View All CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <Button variant="outline" size="lg" asChild>
          <Link href="/courses">
            View All Courses
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
      </motion.div>
    </Section>
  );
}
