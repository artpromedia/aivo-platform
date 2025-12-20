'use client';

import { Cookie, Settings, Shield, BarChart3, Target, CheckCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Metadata for this page (used by layout or parent components if needed)
const _metadata: Metadata = {
  title: 'Cookie Policy | AIVO Learning',
  description:
    'Learn how AIVO Learning uses cookies and similar technologies to improve your experience.',
};

export default function CookiePolicy() {
  const lastUpdated = 'December 19, 2025';

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Cookie className="w-3 h-3 mr-1" />
              Legal
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Cookie Policy
            </h1>
            <p className="text-gray-500">Last updated: {lastUpdated}</p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto">
            {/* Quick Summary */}
            <section className="mb-12">
              <div className="bg-theme-primary-50 border border-theme-primary-100 rounded-2xl p-6">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-theme-primary-600" />
                  Quick Summary
                </h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                    <span>
                      We use cookies to make AIVO work properly and improve your experience
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                    <span>Essential cookies are required for the platform to function</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                    <span>
                      You can control optional cookies through your browser or our preferences
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-mint-500 mt-1 shrink-0" />
                    <span>We never use cookies to track children for advertising purposes</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* What Are Cookies */}
            <section className="prose prose-gray max-w-none mb-12">
              <h2>What Are Cookies?</h2>
              <p>
                Cookies are small text files that are placed on your device when you visit a
                website. They are widely used to make websites work more efficiently and provide
                information to the website owners.
              </p>
              <p>
                We also use similar technologies like local storage and session storage, which work
                similarly to cookies. When we refer to &quot;cookies&quot; in this policy, we
                include these similar technologies.
              </p>
            </section>

            {/* Types of Cookies */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Types of Cookies We Use
              </h2>

              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-mint-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Essential Cookies</h3>
                        <Badge variant="success">Required</Badge>
                      </div>
                      <p className="text-gray-600 mb-4">
                        These cookies are necessary for the website to function properly. They
                        enable core functionality such as security, authentication, and
                        accessibility.
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Examples:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Session cookies to keep you logged in</li>
                          <li>• Security cookies to prevent fraud</li>
                          <li>• Preference cookies for accessibility settings</li>
                          <li>• Load balancing cookies for performance</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Analytics Cookies</h3>
                        <Badge variant="outline">Optional</Badge>
                      </div>
                      <p className="text-gray-600 mb-4">
                        These cookies help us understand how visitors interact with our website by
                        collecting and reporting information anonymously. This helps us improve the
                        platform.
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Examples:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Page view statistics</li>
                          <li>• Feature usage patterns</li>
                          <li>• Error tracking for debugging</li>
                          <li>• Performance monitoring</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                      <Settings className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Functional Cookies</h3>
                        <Badge variant="outline">Optional</Badge>
                      </div>
                      <p className="text-gray-600 mb-4">
                        These cookies enable enhanced functionality and personalization, such as
                        remembering your preferences and settings.
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Examples:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Language preferences</li>
                          <li>• Theme settings (light/dark mode)</li>
                          <li>• Recently viewed content</li>
                          <li>• Customized dashboard layouts</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center shrink-0">
                      <Target className="w-6 h-6 text-coral-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Marketing Cookies</h3>
                        <Badge variant="outline">Optional</Badge>
                      </div>
                      <p className="text-gray-600 mb-4">
                        These cookies are used to track visitors across websites to display relevant
                        advertisements.{' '}
                        <strong>
                          Note: We do not use marketing cookies on pages accessible to children.
                        </strong>
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Examples:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Conversion tracking for marketing campaigns</li>
                          <li>• Social media sharing functionality</li>
                          <li>• Remarketing pixels (adult-facing pages only)</li>
                        </ul>
                      </div>
                      <div className="mt-4 p-3 bg-mint-50 border border-mint-200 rounded-lg">
                        <p className="text-sm text-mint-800">
                          <strong>COPPA Compliance:</strong> Marketing cookies are never used on the
                          learner dashboard or any child-facing interfaces.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cookie Table */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Specific Cookies We Use
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Cookie Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Provider</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Purpose</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Duration</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-4 font-mono text-xs">aivo_session</td>
                      <td className="py-3 px-4">AIVO</td>
                      <td className="py-3 px-4">User authentication</td>
                      <td className="py-3 px-4">Session</td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm">
                          Essential
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono text-xs">aivo_csrf</td>
                      <td className="py-3 px-4">AIVO</td>
                      <td className="py-3 px-4">Security token</td>
                      <td className="py-3 px-4">Session</td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm">
                          Essential
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono text-xs">aivo_preferences</td>
                      <td className="py-3 px-4">AIVO</td>
                      <td className="py-3 px-4">User preferences</td>
                      <td className="py-3 px-4">1 year</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm">
                          Functional
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono text-xs">_ga</td>
                      <td className="py-3 px-4">Google</td>
                      <td className="py-3 px-4">Analytics</td>
                      <td className="py-3 px-4">2 years</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm">
                          Analytics
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono text-xs">_gid</td>
                      <td className="py-3 px-4">Google</td>
                      <td className="py-3 px-4">Analytics</td>
                      <td className="py-3 px-4">24 hours</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm">
                          Analytics
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono text-xs">intercom-*</td>
                      <td className="py-3 px-4">Intercom</td>
                      <td className="py-3 px-4">Customer support</td>
                      <td className="py-3 px-4">9 months</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" size="sm">
                          Functional
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Managing Cookies */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Managing Your Cookie Preferences
              </h2>

              <div className="prose prose-gray max-w-none mb-6">
                <p>You have several options for managing cookies:</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">1. Cookie Preferences Center</h3>
                  <p className="text-gray-600 mb-4">
                    You can manage your cookie preferences at any time by clicking the button below
                    or through the &quot;Cookie Preferences&quot; link in our website footer.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Open cookie preferences modal
                      console.log('Open cookie preferences');
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Cookie Preferences
                  </Button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">2. Browser Settings</h3>
                  <p className="text-gray-600 mb-4">
                    Most web browsers allow you to control cookies through their settings. Here are
                    links to cookie settings for common browsers:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://support.google.com/chrome/answer/95647"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      Chrome
                    </a>
                    <a
                      href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      Firefox
                    </a>
                    <a
                      href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      Safari
                    </a>
                    <a
                      href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      Edge
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">3. Opt-Out Tools</h3>
                  <p className="text-gray-600 mb-4">
                    You can opt out of certain third-party cookies using these tools:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://tools.google.com/dlpage/gaoptout"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      Google Analytics Opt-out
                    </a>
                    <a
                      href="https://optout.networkadvertising.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      NAI Opt-out
                    </a>
                    <a
                      href="https://optout.aboutads.info/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 hover:underline text-sm"
                    >
                      DAA Opt-out
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-sunshine-50 border border-sunshine-200 rounded-2xl p-6">
                <p className="text-gray-700">
                  <strong>Note:</strong> Blocking essential cookies may prevent you from using
                  certain features of the AIVO platform, such as logging in or saving your progress.
                </p>
              </div>
            </section>

            {/* Updates */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Changes to This Policy
              </h2>
              <div className="prose prose-gray max-w-none">
                <p>
                  We may update this Cookie Policy from time to time. When we make changes, we will
                  update the &quot;Last updated&quot; date at the top of this page. We encourage you
                  to review this policy periodically.
                </p>
                <p>
                  For significant changes, we may also provide additional notice, such as a banner
                  on our website or an email notification.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="mb-12">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="text-gray-600 mb-4">
                  If you have questions about our use of cookies, please contact us:
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:privacy@aivolearning.com"
                    className="text-theme-primary-600 hover:underline"
                  >
                    privacy@aivolearning.com
                  </a>
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
