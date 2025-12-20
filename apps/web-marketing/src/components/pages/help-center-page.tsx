'use client';

import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  CreditCard,
  Settings,
  Users,
  Shield,
  Smartphone,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Sparkles,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Help categories
const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to AIVO? Start here.',
    icon: Sparkles,
    color: 'bg-theme-primary-100 text-theme-primary-600',
    articles: 12,
  },
  {
    id: 'account',
    title: 'Account & Billing',
    description: 'Manage your account and subscription.',
    icon: CreditCard,
    color: 'bg-mint-100 text-mint-600',
    articles: 8,
  },
  {
    id: 'learning',
    title: 'Learning & Lessons',
    description: 'Get the most out of AIVO learning.',
    icon: GraduationCap,
    color: 'bg-coral-100 text-coral-600',
    articles: 15,
  },
  {
    id: 'progress',
    title: 'Progress & Reports',
    description: "Understand your child's progress.",
    icon: BarChart3,
    color: 'bg-sunshine-100 text-sunshine-600',
    articles: 10,
  },
  {
    id: 'parents',
    title: 'Parent Dashboard',
    description: 'Navigate the parent experience.',
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
    articles: 9,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'How we protect your data.',
    icon: Shield,
    color: 'bg-purple-100 text-purple-600',
    articles: 6,
  },
  {
    id: 'mobile',
    title: 'Mobile App',
    description: 'Using AIVO on mobile devices.',
    icon: Smartphone,
    color: 'bg-pink-100 text-pink-600',
    articles: 7,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Fix common issues.',
    icon: Settings,
    color: 'bg-orange-100 text-orange-600',
    articles: 11,
  },
];

// Popular articles
const popularArticles = [
  {
    id: 1,
    title: 'How to create your first learner profile',
    category: 'Getting Started',
    views: 12500,
  },
  {
    id: 2,
    title: "Understanding your child's progress dashboard",
    category: 'Progress & Reports',
    views: 9800,
  },
  {
    id: 3,
    title: 'How to import IEP goals into AIVO',
    category: 'Getting Started',
    views: 8200,
  },
  {
    id: 4,
    title: 'Managing your subscription and billing',
    category: 'Account & Billing',
    views: 7500,
  },
  {
    id: 5,
    title: 'Setting up accessibility accommodations',
    category: 'Learning & Lessons',
    views: 6900,
  },
  {
    id: 6,
    title: 'How the AI tutor adapts to your child',
    category: 'Learning & Lessons',
    views: 6200,
  },
];

// FAQs
const faqs = [
  {
    question: 'How does AIVO personalize learning for my child?',
    answer:
      'AIVO uses AI to create a unique "Virtual Brain" for each learner. It adapts content, pacing, and presentation based on your child\'s learning style, strengths, and areas for growth.',
  },
  {
    question: "Is AIVO suitable for my child's specific learning difference?",
    answer:
      'AIVO is designed to support learners with ADHD, Autism, Dyslexia, and many other learning differences. Our platform adapts to each individual, regardless of their specific needs.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'You can cancel your subscription anytime from your account settings. Go to Settings > Subscription > Cancel. Your access continues until the end of your billing period.',
  },
  {
    question: "Is my child's data safe?",
    answer:
      "Absolutely. AIVO is FERPA and COPPA compliant. We use bank-level encryption, never sell data, and never show ads. Your child's privacy is our top priority.",
  },
];

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchFocused, setSearchFocused] = React.useState(false);

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-coral-50/30 -z-10" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="primary" className="mb-6">
                <HelpCircle className="w-3 h-3 mr-1" />
                Help Center
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                How can we help you?
              </h1>

              <p className="text-xl text-gray-600 mb-8">
                Search our knowledge base or browse categories below.
              </p>

              {/* Search Box */}
              <div className="relative max-w-2xl mx-auto">
                <div
                  className={cn(
                    'relative bg-white rounded-2xl border-2 transition-all duration-200',
                    searchFocused
                      ? 'border-theme-primary-500 shadow-lg shadow-theme-primary-100'
                      : 'border-gray-200 shadow-sm'
                  )}
                >
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      setSearchFocused(true);
                    }}
                    onBlur={() =>
                      setTimeout(() => {
                        setSearchFocused(false);
                      }, 200)
                    }
                    placeholder="Search for answers..."
                    className="w-full pl-14 pr-6 py-5 text-lg rounded-2xl focus:outline-none"
                  />
                </div>

                {/* Search suggestions */}
                {searchFocused && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-10"
                  >
                    <div className="p-2">
                      {popularArticles
                        .filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 4)
                        .map((article) => (
                          <Link
                            key={article.id}
                            href={`/help/article/${article.id}`}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            <BookOpen className="w-5 h-5 text-gray-400" />
                            <div className="flex-1 text-left">
                              <p className="text-gray-900 font-medium">{article.title}</p>
                              <p className="text-sm text-gray-500">{article.category}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        ))}
                      {popularArticles.filter((a) =>
                        a.title.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                          No articles found. Try a different search term.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-8 text-center">
              Browse by Category
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/help/category/${category.id}`}
                      className="block bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                    >
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                          category.color
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{category.title}</h3>
                      <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                      <span className="text-xs text-gray-400">{category.articles} articles</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular Articles */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-8 text-center">
                Popular Articles
              </h2>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {popularArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/help/article/${article.id}`}
                    className={cn(
                      'flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors',
                      index !== popularArticles.length - 1 && 'border-b border-gray-100'
                    )}
                  >
                    <BookOpen className="w-5 h-5 text-theme-primary-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{article.title}</h3>
                      <p className="text-sm text-gray-500">{article.category}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-8 text-center">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                  </motion.div>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link href="/#faq">
                  <Button variant="outline">
                    View All FAQs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Support CTA */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 bg-theme-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-theme-primary-600" />
              </div>

              <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                Still need help?
              </h2>
              <p className="text-gray-600 mb-8">
                Our support team is here to help. Reach out and we&apos;ll get back to you within 24
                hours.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button className="bg-coral-500 hover:bg-coral-600 text-white" size="lg" asChild>
                  <Link href="/contact">
                    Contact Support
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="mailto:support@aivolearning.com">Email Us</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
