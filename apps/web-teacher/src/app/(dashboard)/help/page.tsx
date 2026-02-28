/**
 * Help & Support Page
 *
 * Help categories, FAQ accordion, keyboard shortcuts, and support contact.
 */

'use client';

import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

/* ─── data ────────────────────────────────────────────────────────────── */

const helpCategories = [
  {
    icon: '📚',
    title: 'Getting Started',
    description: 'Learn the basics of setting up your classes, students, and lessons.',
    href: '#getting-started',
  },
  {
    icon: '📝',
    title: 'Assignments & Grading',
    description: 'Create assignments, grade submissions, and manage your gradebook.',
    href: '#assignments',
  },
  {
    icon: '🤖',
    title: 'AI Features',
    description: 'Use AI-powered lesson generation, feedback assistance, and analytics.',
    href: '#ai-features',
  },
  {
    icon: '👥',
    title: 'Students & IEPs',
    description: 'Manage student profiles, track IEP goals, and monitor progress.',
    href: '#students',
  },
  {
    icon: '💬',
    title: 'Messages & Notifications',
    description: 'Communicate with parents and manage notification preferences.',
    href: '#messages',
  },
  {
    icon: '📊',
    title: 'Reports & Analytics',
    description: 'Generate progress reports, class summaries, and data exports.',
    href: '#reports',
  },
];

const faqs = [
  {
    question: 'How do I create a new class?',
    answer:
      'Navigate to Classes from the sidebar, then click the "New Class" button. Fill in the class name, subject, grade level, and schedule, then save.',
  },
  {
    question: 'How do I generate a lesson plan with AI?',
    answer:
      'Go to Lessons → AI Generate. Enter the subject, grade level, topic, and any standards you want to cover. The AI will generate a complete lesson plan that you can customize.',
  },
  {
    question: 'How do I invite parents to the platform?',
    answer:
      'Open a student\'s profile page, then look for the "Parent Access" section. You can send an invitation email directly from there.',
  },
  {
    question: 'How do I set up grading scales?',
    answer:
      'Go to Settings → Grading tab. You can configure grade scales, weighting categories, and late-work policies that apply across all your classes.',
  },
  {
    question: 'How do I export a report?',
    answer:
      'Go to Reports and select the type of report you need. Configure the date range and class, then click Generate. Once ready you can download it as PDF.',
  },
  {
    question: 'Can I use the platform offline?',
    answer:
      'Currently the platform requires an internet connection. Offline support for viewing class rosters and previously-loaded lesson plans is on our roadmap.',
  },
];

const keyboardShortcuts = [
  { keys: ['⌘', 'K'], description: 'Open quick search' },
  { keys: ['⌘', 'N'], description: 'Quick add (new item)' },
  { keys: ['⌘', '/'], description: 'Toggle sidebar' },
  { keys: ['Esc'], description: 'Close dialog / cancel' },
];

/* ─── component ───────────────────────────────────────────────────────── */

export default function HelpPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <div>
      <PageHeader title="Help & Support" description="Find answers and get assistance" />

      {/* ── Categories ────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Browse Topics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {helpCategories.map((cat) => (
            <a
              key={cat.title}
              href={cat.href}
              className="rounded-xl border bg-white p-5 transition hover:shadow-md"
            >
              <span className="text-2xl">{cat.icon}</span>
              <h3 className="mt-2 font-semibold text-gray-900">{cat.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{cat.description}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── FAQ accordion ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y rounded-xl border bg-white">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <span className="ml-4 text-gray-400">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-600">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Keyboard Shortcuts ────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
        <div className="mt-4 rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Shortcut</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keyboardShortcuts.map((s, i) => (
                <tr key={i}>
                  <td className="px-5 py-3">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="mx-1 text-gray-400">+</span>}
                        <kbd className="rounded border bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Contact Support ───────────────────────────────────────────── */}
      <section className="mt-10 mb-10">
        <h2 className="text-lg font-semibold text-gray-900">Contact Support</h2>
        <div className="mt-4 rounded-xl border bg-white p-6">
          <p className="text-sm text-gray-600">
            Can&apos;t find what you&apos;re looking for? Reach out and we&apos;ll be happy to help.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="mailto:support@aivo.education"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Email Support
            </a>
            <a
              href="https://docs.aivo.education"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Documentation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
