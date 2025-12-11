'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Overview', href: '/docs' },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Concepts', href: '/docs/concepts' },
    ],
  },
  {
    title: 'Authentication',
    items: [
      { title: 'Overview', href: '/docs/authentication' },
      { title: 'API Keys', href: '/docs/authentication/api-keys' },
      { title: 'OAuth 2.0', href: '/docs/authentication/oauth' },
      { title: 'SSO Integration', href: '/docs/authentication/sso' },
    ],
  },
  {
    title: 'SIS & Rostering',
    items: [
      { title: 'Overview', href: '/docs/sis-rostering' },
      { title: 'OneRoster CSV', href: '/docs/sis-rostering/oneroster-csv' },
      { title: 'OneRoster API', href: '/docs/sis-rostering/oneroster-api' },
      { title: 'SFTP Upload', href: '/docs/sis-rostering/sftp' },
    ],
  },
  {
    title: 'LMS & LTI',
    items: [
      { title: 'Overview', href: '/docs/lms-lti' },
      { title: 'LTI 1.3 Setup', href: '/docs/lms-lti/lti-setup' },
      { title: 'Deep Linking', href: '/docs/lms-lti/deep-linking' },
      { title: 'Grade Passback', href: '/docs/lms-lti/grade-passback' },
    ],
  },
  {
    title: 'Webhooks & Events',
    items: [
      { title: 'Overview', href: '/docs/webhooks' },
      { title: 'Event Types', href: '/docs/webhooks/event-types' },
      { title: 'Signature Verification', href: '/docs/webhooks/signature-verification' },
      { title: 'Retry Policy', href: '/docs/webhooks/retry-policy' },
    ],
  },
  {
    title: 'Public APIs',
    items: [
      { title: 'Overview', href: '/docs/public-apis' },
      { title: 'Learner Progress', href: '/docs/public-apis/learner-progress' },
      { title: 'Session Data', href: '/docs/public-apis/session-data' },
      { title: 'External Events', href: '/docs/public-apis/external-events' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Interactive Docs', href: '/docs/api-reference' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Webhooks Quickstart', href: '/docs/guides/webhooks-quickstart' },
      { title: 'LTI Integration', href: '/docs/guides/lti-integration' },
      { title: 'OneRoster Import', href: '/docs/guides/oneroster-import' },
    ],
  },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-portal-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="font-semibold text-xl">Aivo Developers</span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600 font-medium">Documentation</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/docs" className="text-gray-900 font-medium">
                Docs
              </Link>
              <Link href="/api-reference" className="text-gray-600 hover:text-gray-900 transition-colors">
                API Reference
              </Link>
              <Link href="/sandbox" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sandbox
              </Link>
              <Link 
                href="/dashboard" 
                className="px-4 py-2 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors"
              >
                Dashboard
              </Link>
            </nav>
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 pt-16 
          transform transition-transform md:relative md:transform-none
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="h-full overflow-y-auto py-6 px-4">
            {navigation.map((section) => (
              <div key={section.title} className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {section.title}
                </h4>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
