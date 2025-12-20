import { FileText, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Terms of Service | AIVO Learning',
  description:
    'AIVO Learning Terms of Service - Terms and conditions for using our AI-powered educational platform.',
};

export default function TermsOfService() {
  const lastUpdated = 'December 19, 2025';
  const effectiveDate = 'December 19, 2025';

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <FileText className="w-3 h-3 mr-1" />
              Legal
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-500">
              Last updated: {lastUpdated} | Effective: {effectiveDate}
            </p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto prose prose-gray prose-lg">
            {/* Agreement to Terms */}
            <section>
              <h2>1. Agreement to Terms</h2>
              <p>
                By accessing or using the AIVO Learning platform (the &quot;Service&quot;), you
                agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree
                with any part of these terms, you may not access the Service.
              </p>
              <p>
                These Terms apply to all visitors, users, and others who access or use the Service,
                including students, parents, guardians, teachers, and administrators.
              </p>
            </section>

            {/* Description of Service */}
            <section>
              <h2>2. Description of Service</h2>
              <p>
                AIVO Learning provides an AI-powered educational platform designed to support
                neurodiverse learners. Our Service includes:
              </p>
              <ul>
                <li>Personalized AI tutoring and learning paths</li>
                <li>Interactive educational content and activities</li>
                <li>Progress tracking and reporting tools</li>
                <li>IEP goal management features</li>
                <li>Parent and teacher dashboards</li>
                <li>Communication and collaboration tools</li>
              </ul>
              <p>
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at
                any time without prior notice.
              </p>
            </section>

            {/* User Accounts */}
            <section>
              <h2>3. User Accounts</h2>

              <h3>Account Creation</h3>
              <p>
                To use certain features of the Service, you must create an account. You agree to:
              </p>
              <ul>
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly update any changes to your information</li>
                <li>Accept responsibility for all activity under your account</li>
              </ul>

              <h3>Accounts for Minors</h3>
              <p>
                For users under 18 years of age, a parent or guardian must create and manage the
                account. For users under 13, we require verifiable parental consent in compliance
                with COPPA.
              </p>

              <h3>Account Termination</h3>
              <p>
                You may terminate your account at any time by contacting us or using the account
                settings. We may terminate or suspend your account if you violate these Terms.
              </p>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2>4. Acceptable Use</h2>
              <p>You agree NOT to use the Service to:</p>
              <ul>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the rights of others</li>
                <li>Share your account credentials with others</li>
                <li>Attempt unauthorized access to any part of the Service</li>
                <li>Upload harmful, offensive, or inappropriate content</li>
                <li>Interfere with the proper operation of the Service</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Collect data about other users without consent</li>
                <li>Engage in any activity that could harm minors</li>
              </ul>
              <p>
                We reserve the right to remove any content and terminate accounts that violate these
                guidelines.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2>5. Intellectual Property</h2>

              <h3>Our Content</h3>
              <p>
                The Service and its original content, features, and functionality are owned by AIVO
                Learning and are protected by copyright, trademark, and other intellectual property
                laws.
              </p>

              <h3>Your Content</h3>
              <p>
                You retain ownership of any content you submit to the Service. By submitting
                content, you grant us a license to use, store, and process that content for the
                purpose of providing the Service.
              </p>

              <h3>Permitted Use</h3>
              <p>
                You are granted a limited, non-exclusive, non-transferable license to access and use
                the Service for personal, educational purposes only.
              </p>
            </section>

            {/* Subscription and Payment */}
            <section>
              <h2>6. Subscription and Payment</h2>

              <h3>Pricing</h3>
              <p>
                Some features of the Service require a paid subscription. Prices are listed on our
                website and may change with notice.
              </p>

              <h3>Billing</h3>
              <p>
                Subscriptions are billed in advance on a monthly or annual basis. Payment is due at
                the beginning of each billing cycle.
              </p>

              <h3>Cancellation</h3>
              <p>
                You may cancel your subscription at any time. Cancellation takes effect at the end
                of the current billing period. No refunds are provided for partial periods.
              </p>

              <h3>Free Trials</h3>
              <p>
                We may offer free trials. If you do not cancel before the trial ends, you will be
                automatically charged for the subscription.
              </p>

              <h3>Refunds</h3>
              <p>
                We offer a 30-day money-back guarantee for first-time subscribers. Refund requests
                after this period are handled on a case-by-case basis. Contact
                support@aivolearning.com for assistance.
              </p>
            </section>

            {/* Educational Disclaimer */}
            <section>
              <h2>7. Educational Content Disclaimer</h2>
              <p>
                The Service is intended to supplement, not replace, formal education. We make no
                guarantees regarding:
              </p>
              <ul>
                <li>Specific educational outcomes or improvements</li>
                <li>Alignment with every curriculum or educational standard</li>
                <li>Suitability for every learning difference or need</li>
              </ul>
              <p>
                Parents, guardians, and educators should use their judgment to determine if the
                Service is appropriate for individual learners. The Service should not be used as a
                substitute for professional educational, medical, or therapeutic advice.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2>8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, AIVO LEARNING SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
                LIMITED TO:
              </p>
              <ul>
                <li>Loss of profits, data, or other intangible losses</li>
                <li>Damages resulting from unauthorized access to your account</li>
                <li>Damages resulting from errors or interruptions in service</li>
                <li>Damages resulting from third-party content or conduct</li>
              </ul>
              <p>
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12)
                MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section>
              <h2>9. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul>
                <li>Implied warranties of merchantability</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy or completeness of content</li>
              </ul>
              <p>
                We do not warrant that the Service will be uninterrupted, secure, or error-free.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2>10. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless AIVO Learning, its officers,
                directors, employees, and agents from any claims, damages, losses, or expenses
                (including attorney fees) arising from:
              </p>
              <ul>
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Content you submit to the Service</li>
              </ul>
            </section>

            {/* Termination */}
            <section>
              <h2>11. Termination</h2>

              <h3>By You</h3>
              <p>
                You may terminate your account and stop using the Service at any time. Contact us or
                use the account settings to close your account.
              </p>

              <h3>By Us</h3>
              <p>
                We may suspend or terminate your access to the Service immediately, without prior
                notice, if:
              </p>
              <ul>
                <li>You breach these Terms</li>
                <li>We are required to do so by law</li>
                <li>We discontinue the Service</li>
              </ul>

              <h3>Effect of Termination</h3>
              <p>
                Upon termination, your right to use the Service ceases immediately. We may delete
                your data in accordance with our Privacy Policy. Provisions that by their nature
                should survive termination will remain in effect.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2>12. Dispute Resolution</h2>

              <h3>Informal Resolution</h3>
              <p>
                Before filing a formal dispute, you agree to contact us at legal@aivolearning.com to
                attempt informal resolution. We will work in good faith to resolve the issue within
                30 days.
              </p>

              <h3>Arbitration</h3>
              <p>
                Any dispute not resolved informally shall be resolved by binding arbitration in
                accordance with the rules of the American Arbitration Association. The arbitration
                shall take place in California, and the decision shall be final and binding.
              </p>

              <h3>Class Action Waiver</h3>
              <p>
                You agree that any dispute resolution will be conducted only on an individual basis
                and not as a class action or representative proceeding.
              </p>

              <h3>Exceptions</h3>
              <p>
                This arbitration agreement does not apply to claims that may be brought in small
                claims court or to claims for injunctive relief.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2>13. Changes to Terms</h2>
              <p>We reserve the right to modify these Terms at any time. When we make changes:</p>
              <ul>
                <li>We will update the &quot;Last updated&quot; date at the top</li>
                <li>
                  For material changes, we will provide notice via email or prominent notice on the
                  Service
                </li>
                <li>Continued use after changes constitutes acceptance of the new Terms</li>
              </ul>
              <p>If you do not agree to the modified Terms, you must stop using the Service.</p>
            </section>

            {/* Governing Law */}
            <section>
              <h2>14. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the
                State of California, United States, without regard to its conflict of law
                provisions.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2>15. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that
                provision shall be limited or eliminated to the minimum extent necessary, and the
                remaining provisions shall remain in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2>16. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy and any other agreements expressly
                incorporated by reference, constitute the entire agreement between you and AIVO
                Learning regarding the Service.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2>17. Contact Information</h2>
              <p>If you have questions about these Terms, please contact us:</p>
              <div className="bg-gray-50 rounded-xl p-6 not-prose">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Legal Department</p>
                    <p className="text-gray-600">AIVO Learning, Inc.</p>
                    <p className="text-gray-600">
                      Email:{' '}
                      <a
                        href="mailto:legal@aivolearning.com"
                        className="text-theme-primary-600 hover:underline"
                      >
                        legal@aivolearning.com
                      </a>
                    </p>
                  </div>
                </div>
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
    </>
  );
}
