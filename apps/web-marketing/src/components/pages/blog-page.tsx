'use client';

import { motion } from 'framer-motion';
import {
  Calendar,
  BookOpen,
  TrendingUp,
  Users,
  Brain,
  Sparkles,
  ArrowRight,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Navigation, Footer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  featured?: boolean;
  icon: React.ElementType;
}

const categories = ['All', 'Product', 'Research', 'Education', 'Neurodiversity', 'Company'];

const posts: BlogPost[] = [
  {
    slug: 'introducing-adaptive-ai-tutor',
    title: `Introducing AIVO's Adaptive AI Tutor`,
    excerpt: `Our AI tutor adapts in real-time to each learner's pace, learning style, and IEP goals — delivering truly personalised education at scale.`,
    category: 'Product',
    date: 'Jan 28, 2026',
    readTime: '5 min read',
    featured: true,
    icon: Brain,
  },
  {
    slug: 'neurodiversity-in-the-classroom',
    title: 'Embracing Neurodiversity in the Modern Classroom',
    excerpt:
      'How schools are shifting from accommodation to empowerment — and how technology is making inclusive education achievable for every teacher.',
    category: 'Education',
    date: 'Jan 15, 2026',
    readTime: '7 min read',
    icon: Users,
  },
  {
    slug: 'iep-goal-tracking-with-ai',
    title: 'How AI Is Transforming IEP Goal Tracking',
    excerpt:
      'Tracking IEP objectives manually is time-consuming. See how AI-powered analytics give educators measurable, exportable data in seconds.',
    category: 'Research',
    date: 'Jan 8, 2026',
    readTime: '6 min read',
    icon: TrendingUp,
  },
  {
    slug: 'pilot-results-150-students',
    title: 'Pilot Results: 150+ Students, 4.9/5 Satisfaction',
    excerpt:
      'Our initial pilot programme delivered remarkable results — 87% engagement improvement and a 4.9/5 satisfaction rating from families.',
    category: 'Company',
    date: 'Dec 20, 2025',
    readTime: '4 min read',
    icon: Sparkles,
  },
  {
    slug: 'multi-sensory-learning-explained',
    title: 'Multi-Sensory Learning: Why It Works',
    excerpt:
      'Visual, auditory, and kinesthetic activities combined create stronger neural pathways. Here is the research behind our approach.',
    category: 'Research',
    date: 'Dec 10, 2025',
    readTime: '8 min read',
    icon: BookOpen,
  },
  {
    slug: 'building-a-product-for-every-mind',
    title: 'Building a Product for Every Mind',
    excerpt:
      'A behind-the-scenes look at how the AIVO team designs experiences that work for learners with ADHD, Autism, Dyslexia, and more.',
    category: 'Product',
    date: 'Nov 28, 2025',
    readTime: '6 min read',
    icon: Brain,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BlogPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-theme-primary-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="primary" className="mb-4">
                Blog
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Insights &amp; <span className="text-gradient-primary">Stories</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                News, research, and ideas from the AIVO team on inclusive education, AI-powered
                learning, and neurodiversity.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Categories ──────────────────────────────────────── */}
        <section className="pb-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {categories.map((cat, i) => (
                <motion.button
                  key={cat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={
                    i === 0
                      ? 'px-4 py-2 rounded-full text-sm font-medium bg-theme-primary-500 text-white'
                      : 'px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'
                  }
                >
                  {cat}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Post ───────────────────────────────────── */}
        {posts
          .filter((p) => p.featured)
          .map((post) => (
            <section key={post.slug} className="py-12">
              <div className="container mx-auto px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-4xl mx-auto bg-gradient-to-br from-theme-primary-50 to-coral-50 rounded-3xl p-8 md:p-12 border border-theme-primary-100"
                >
                  <Badge variant="gradient" className="mb-4">
                    Featured
                  </Badge>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 text-lg mb-6">{post.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <BookOpen className="w-4 h-4" />
                      {post.readTime}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-theme-primary-600">
                      <Tag className="w-4 h-4" />
                      {post.category}
                    </span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 mt-6 text-theme-primary-600 font-semibold hover:text-theme-primary-700 transition-colors"
                  >
                    Read Article <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            </section>
          ))}

        {/* ── Post Grid ───────────────────────────────────────── */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {posts
                .filter((p) => !p.featured)
                .map((post, i) => (
                  <motion.article
                    key={post.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-soft hover:shadow-soft-lg transition-shadow overflow-hidden group"
                  >
                    {/* Icon banner */}
                    <div className="h-40 bg-gradient-to-br from-theme-primary-100 to-coral-50 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
                        <post.icon className="w-8 h-8 text-theme-primary-500" />
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {post.category}
                        </Badge>
                        <span className="text-xs text-gray-400">{post.readTime}</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-gray-900 mb-2 group-hover:text-theme-primary-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{post.date}</span>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-theme-primary-600 text-sm font-medium hover:text-theme-primary-700 transition-colors inline-flex items-center gap-1"
                        >
                          Read <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
            </div>
          </div>
        </section>

        {/* ── Newsletter CTA ──────────────────────────────────── */}
        <section className="py-20 bg-gradient-to-br from-theme-primary-600 to-purple-700">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Stay in the Loop
              </h2>
              <p className="text-theme-primary-100 text-lg max-w-xl mx-auto mb-8">
                Get the latest articles on inclusive education, product updates, and neurodiversity
                research delivered to your inbox.
              </p>
              <form
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-xl border-0 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white/50"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-theme-primary-600 font-semibold rounded-xl hover:shadow-lg transition-shadow"
                >
                  Subscribe
                </button>
              </form>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
