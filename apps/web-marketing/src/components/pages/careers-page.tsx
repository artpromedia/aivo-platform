'use client';

import { motion } from 'framer-motion';
import {
  Briefcase,
  MapPin,
  Clock,
  Heart,
  Zap,
  Users,
  GraduationCap,
  Home,
  Plane,
  DollarSign,
  Laptop,
  Brain,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Company values
const values = [
  {
    icon: Heart,
    title: 'Empathy First',
    description:
      'We design for real people with real needs. Every decision starts with understanding our users.',
  },
  {
    icon: Zap,
    title: 'Move Fast, Learn Faster',
    description:
      'We ship quickly, gather feedback, and iterate. Failure is a stepping stone to success.',
  },
  {
    icon: Users,
    title: 'Diverse Perspectives',
    description:
      'We believe the best solutions come from teams with varied backgrounds and viewpoints.',
  },
  {
    icon: Brain,
    title: 'Neurodiversity Champions',
    description: 'We celebrate all types of minds and actively create an inclusive workplace.',
  },
];

// Benefits
const benefits = [
  {
    icon: DollarSign,
    title: 'Competitive Salary',
    description: 'Top-tier compensation with equity',
  },
  { icon: Home, title: 'Remote-First', description: 'Work from anywhere in the US' },
  { icon: Laptop, title: 'Equipment Budget', description: '$2,500 for your home office' },
  {
    icon: GraduationCap,
    title: 'Learning Budget',
    description: '$1,500/year for courses & conferences',
  },
  { icon: Plane, title: 'Unlimited PTO', description: 'Take the time you need' },
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Full medical, dental, vision + mental health',
  },
];

// Open positions
const openPositions = [
  {
    id: 1,
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Remote (US)',
    type: 'Full-time',
    level: 'Senior',
    posted: '2 days ago',
    hot: true,
  },
  {
    id: 2,
    title: 'Machine Learning Engineer',
    department: 'AI/ML',
    location: 'Remote (US)',
    type: 'Full-time',
    level: 'Mid-Senior',
    posted: '1 week ago',
    hot: true,
  },
  {
    id: 3,
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote (US)',
    type: 'Full-time',
    level: 'Senior',
    posted: '3 days ago',
    hot: false,
  },
  {
    id: 4,
    title: 'Special Education Curriculum Designer',
    department: 'Content',
    location: 'Remote (US)',
    type: 'Full-time',
    level: 'Mid',
    posted: '1 week ago',
    hot: false,
  },
  {
    id: 5,
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Remote (US)',
    type: 'Full-time',
    level: 'Mid',
    posted: '2 weeks ago',
    hot: false,
  },
  {
    id: 6,
    title: 'Head of Marketing',
    department: 'Marketing',
    location: 'Remote (US) / SF Bay Area',
    type: 'Full-time',
    level: 'Director',
    posted: '1 day ago',
    hot: true,
  },
];

// Department filters
const departments = [
  'All',
  'Engineering',
  'AI/ML',
  'Design',
  'Content',
  'Customer Success',
  'Marketing',
];

export function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = React.useState('All');

  const filteredPositions =
    selectedDepartment === 'All'
      ? openPositions
      : openPositions.filter((p) => p.department === selectedDepartment);

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-coral-50/30 -z-10" />
          <motion.div
            className="absolute top-20 right-10 w-72 h-72 bg-theme-primary-200/30 rounded-full blur-3xl -z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="primary" className="mb-6">
                <Briefcase className="w-3 h-3 mr-1" />
                We&apos;re Hiring!
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
                Help Us Build the Future of{' '}
                <span className="bg-gradient-to-r from-theme-primary-600 to-coral-500 bg-clip-text text-transparent">
                  Inclusive Education
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Join a passionate team dedicated to making quality education accessible to every
                learner, regardless of how their mind works.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="coral" size="lg" asChild>
                  <a href="#positions">
                    View Open Positions
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/about">Learn About Us</Link>
                </Button>
              </div>

              {/* Quick stats */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
                {[
                  { value: '25+', label: 'Team Members' },
                  { value: '100%', label: 'Remote-First' },
                  { value: '150+', label: 'Students Served' },
                  { value: '$5M', label: 'Raised' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                These principles guide how we work, make decisions, and treat each other.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft"
                  >
                    <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-theme-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
                    <p className="text-gray-600 text-sm">{value.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
                Benefits & Perks
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We take care of our team so they can focus on what matters.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100"
                  >
                    <div className="w-10 h-10 bg-mint-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-mint-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="positions" className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">Open Positions</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Find your next role and help us make a difference.
              </p>
            </div>

            {/* Department Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    setSelectedDepartment(dept);
                  }}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    selectedDepartment === dept
                      ? 'bg-theme-primary-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  )}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Positions List */}
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredPositions.map((position, index) => (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/careers/${position.id}`}
                    className="block bg-white rounded-2xl p-6 border border-gray-100 hover:border-theme-primary-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-theme-primary-600 transition-colors">
                            {position.title}
                          </h3>
                          {position.hot && (
                            <Badge variant="coral" size="sm">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Hot
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {position.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {position.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {position.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">{position.posted}</span>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-theme-primary-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {filteredPositions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No positions found in this department.</p>
              </div>
            )}

            {/* Don't see a fit? */}
            <div className="mt-12 text-center">
              <div className="inline-block bg-white rounded-2xl p-8 border border-gray-100">
                <Globe className="w-10 h-10 text-theme-primary-500 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Don&apos;t see a perfect fit?</h3>
                <p className="text-gray-600 mb-4 max-w-md">
                  We&apos;re always looking for talented people. Send us your resume and we&apos;ll
                  keep you in mind for future opportunities.
                </p>
                <Button variant="outline" asChild>
                  <a href="mailto:careers@aivolearning.com">Send Your Resume</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Interview Process */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
                  Our Interview Process
                </h2>
                <p className="text-gray-600">
                  We aim to make the process clear, respectful, and efficient.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: 'Application Review',
                    description:
                      'We review your application and get back to you within 5 business days.',
                    duration: '3-5 days',
                  },
                  {
                    step: 2,
                    title: 'Initial Call',
                    description:
                      'A 30-minute call with our recruiting team to learn about you and answer your questions.',
                    duration: '30 min',
                  },
                  {
                    step: 3,
                    title: 'Technical/Role Interview',
                    description:
                      'A deeper dive into your skills and experience relevant to the role.',
                    duration: '60 min',
                  },
                  {
                    step: 4,
                    title: 'Team Interviews',
                    description: 'Meet with potential teammates and cross-functional partners.',
                    duration: '2-3 hours',
                  },
                  {
                    step: 5,
                    title: 'Offer',
                    description: 'We extend an offer and welcome you to the team!',
                    duration: '🎉',
                  },
                ].map((item, index) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-theme-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                        {item.step}
                      </div>
                      {index < 4 && <div className="w-0.5 h-full bg-theme-primary-200 my-2" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <Badge variant="outline" size="sm">
                          {item.duration}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
