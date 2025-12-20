import { Accessibility, CheckCircle, Mail, Phone, Eye, Ear, Hand, Brain } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Accessibility Statement | AIVO Learning',
  description:
    'AIVO Learning is committed to ensuring digital accessibility for people with disabilities. Learn about our accessibility features and standards.',
};

export default function AccessibilityStatement() {
  const lastUpdated = 'December 19, 2025';

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Accessibility className="w-3 h-3 mr-1" />
              Accessibility
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Accessibility Statement
            </h1>
            <p className="text-gray-500">Last updated: {lastUpdated}</p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto">
            {/* Commitment Section */}
            <section className="mb-12">
              <div className="bg-gradient-to-br from-theme-primary-50 to-coral-50 rounded-3xl p-8 mb-8">
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                  Our Commitment
                </h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                  AIVO Learning is committed to ensuring digital accessibility for people with
                  disabilities. We are continually improving the user experience for everyone and
                  applying the relevant accessibility standards. As a platform designed specifically
                  for neurodiverse learners, accessibility is at the core of everything we build.
                </p>
              </div>
            </section>

            {/* Standards Section */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Accessibility Standards
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-mint-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-mint-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">WCAG 2.1 Level AA</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at
                    Level AA. These guidelines explain how to make web content more accessible for
                    people with disabilities.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-mint-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-mint-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Section 508</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Our platform is designed to meet Section 508 requirements, ensuring
                    accessibility for users of federal agencies and educational institutions.
                  </p>
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Accessibility Features
              </h2>

              <div className="space-y-6">
                {/* Visual */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Eye className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Visual Accessibility</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>High contrast mode and customizable color themes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Adjustable text sizes (up to 200% zoom)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Screen reader compatible with ARIA labels</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Alternative text for all images and media</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Dyslexia-friendly font options (OpenDyslexic)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Auditory */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                      <Ear className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Auditory Accessibility</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Closed captions for all video content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Transcripts available for audio content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Visual indicators for audio alerts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Volume controls and mute options</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Motor */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center shrink-0">
                      <Hand className="w-6 h-6 text-coral-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Motor Accessibility</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Full keyboard navigation support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Large click/touch targets (minimum 44x44px)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>No time limits on interactions (or adjustable)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Skip navigation links</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Switch device compatibility</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Cognitive */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sunshine-100 rounded-xl flex items-center justify-center shrink-0">
                      <Brain className="w-6 h-6 text-sunshine-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Cognitive Accessibility</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Clear, simple language throughout the platform</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Consistent navigation and layout</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Progress indicators and breadcrumbs</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Reduced motion option for animations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Distraction-free reading modes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                          <span>Visual schedules and predictable routines</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Testing Section */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Accessibility Testing
              </h2>
              <div className="prose prose-gray max-w-none">
                <p>We regularly test our platform for accessibility using:</p>
                <ul>
                  <li>Automated accessibility testing tools (axe, WAVE, Lighthouse)</li>
                  <li>Manual testing with screen readers (NVDA, VoiceOver, JAWS)</li>
                  <li>Keyboard-only navigation testing</li>
                  <li>User testing with people with disabilities</li>
                  <li>Third-party accessibility audits</li>
                </ul>
              </div>
            </section>

            {/* Known Issues Section */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Known Limitations
              </h2>
              <div className="bg-sunshine-50 border border-sunshine-200 rounded-2xl p-6">
                <p className="text-gray-700 mb-4">
                  While we strive for full accessibility, some areas are still being improved:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-sunshine-600">•</span>
                    <span>
                      Some older PDF resources may not be fully accessible (being remediated)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sunshine-600">•</span>
                    <span>
                      Live video sessions have auto-generated captions (human review in progress)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sunshine-600">•</span>
                    <span>
                      Some third-party embedded content may have accessibility limitations
                    </span>
                  </li>
                </ul>
                <p className="text-gray-700 mt-4">
                  We are actively working to address these issues and welcome feedback.
                </p>
              </div>
            </section>

            {/* Feedback Section */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Feedback & Contact
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <p className="text-gray-600 mb-6">
                  We welcome your feedback on the accessibility of AIVO Learning. Please let us know
                  if you encounter accessibility barriers or have suggestions for improvement.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <a
                    href="mailto:accessibility@aivolearning.com"
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-theme-primary-100 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-theme-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-500">accessibility@aivolearning.com</p>
                    </div>
                  </a>

                  <a
                    href="tel:+18002486338"
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-theme-primary-100 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-theme-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-500">1-800-AIVO-EDU</p>
                    </div>
                  </a>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                  We aim to respond to accessibility feedback within 2 business days.
                </p>
              </div>
            </section>
          </article>

          {/* Back to Home */}
          <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="text-theme-primary-600 hover:underline inline-flex items-center gap-2"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
