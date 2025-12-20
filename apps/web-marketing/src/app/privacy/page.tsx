import { Shield, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Privacy Policy | AIVO Learning',
  description:
    'AIVO Learning Privacy Policy - Learn how we collect, use, and protect your personal information. FERPA and COPPA compliant.',
};

export default function PrivacyPolicy() {
  const lastUpdated = 'December 19, 2025';

  return (
    <>
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <Badge variant="primary" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              Legal
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-500">Last updated: {lastUpdated}</p>
          </div>

          {/* Content */}
          <article className="max-w-4xl mx-auto prose prose-gray prose-lg">
            {/* Introduction */}
            <section>
              <h2>Introduction</h2>
              <p>
                AIVO Learning, Inc. (&quot;AIVO,&quot; &quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;) is committed to protecting the privacy of all users of our
                educational platform, including students, parents, guardians, and educators.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our website, mobile applications, and services
                (collectively, the &quot;Platform&quot;).
              </p>
              <div className="bg-mint-50 border border-mint-200 rounded-xl p-4 not-prose">
                <p className="text-mint-800 font-medium flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  AIVO is fully compliant with FERPA and COPPA regulations.
                </p>
              </div>
            </section>

            {/* Information We Collect */}
            <section>
              <h2>Information We Collect</h2>

              <h3>Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul>
                <li>Name and email address</li>
                <li>Role (parent, student, teacher, administrator)</li>
                <li>Password (stored securely using encryption)</li>
                <li>Profile information you choose to provide</li>
              </ul>

              <h3>Learning Data</h3>
              <p>To provide personalized learning experiences, we collect:</p>
              <ul>
                <li>Learning activities and progress</li>
                <li>Assessment results and performance data</li>
                <li>Interactions with AI tutoring features</li>
                <li>Learning preferences and accommodations</li>
                <li>IEP goals (when provided by parents or educators)</li>
              </ul>

              <h3>Technical Data</h3>
              <p>We automatically collect certain technical information:</p>
              <ul>
                <li>Device type, operating system, and browser</li>
                <li>IP address and general location</li>
                <li>Usage patterns and session duration</li>
                <li>Error logs for troubleshooting</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2>Children&apos;s Privacy (COPPA Compliance)</h2>
              <p>
                AIVO takes children&apos;s privacy very seriously. We comply fully with the
                Children&apos;s Online Privacy Protection Act (COPPA).
              </p>

              <h3>Parental Consent</h3>
              <p>
                For users under 13 years of age, we require verifiable parental consent before
                collecting personal information. Parents or guardians must create and manage
                accounts for children under 13.
              </p>

              <h3>Information from Children</h3>
              <p>
                We collect only the minimum information necessary to provide our educational
                services to children. This includes:
              </p>
              <ul>
                <li>First name (or nickname)</li>
                <li>Learning activities and progress</li>
                <li>Preferences for accessibility and accommodations</li>
              </ul>

              <h3>Parental Rights</h3>
              <p>Parents and guardians have the right to:</p>
              <ul>
                <li>Review their child&apos;s personal information</li>
                <li>Request deletion of their child&apos;s data</li>
                <li>Refuse further collection of their child&apos;s information</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2>How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide personalized learning experiences</li>
                <li>Track educational progress and generate reports</li>
                <li>Improve our AI algorithms and content</li>
                <li>Communicate important updates and information</li>
                <li>Ensure platform security and prevent abuse</li>
                <li>Comply with legal obligations</li>
                <li>Provide customer support</li>
              </ul>
              <p>
                <strong>We do not:</strong>
              </p>
              <ul>
                <li>Sell your personal information to third parties</li>
                <li>Use student data for advertising purposes</li>
                <li>Share data with advertisers or data brokers</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2>Data Security</h2>
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul>
                <li>
                  <strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at
                  rest (AES-256)
                </li>
                <li>
                  <strong>Access Controls:</strong> Strict role-based access controls limit who can
                  access data
                </li>
                <li>
                  <strong>Regular Audits:</strong> We conduct regular security audits and
                  penetration testing
                </li>
                <li>
                  <strong>Employee Training:</strong> All employees receive privacy and security
                  training
                </li>
                <li>
                  <strong>Incident Response:</strong> We have procedures to detect and respond to
                  data breaches
                </li>
              </ul>
            </section>

            {/* FERPA Compliance */}
            <section>
              <h2>FERPA Compliance</h2>
              <p>
                For educational institutions using AIVO, we comply with the Family Educational
                Rights and Privacy Act (FERPA).
              </p>
              <ul>
                <li>
                  We act as a &quot;school official&quot; with legitimate educational interest
                </li>
                <li>We use student data only for authorized educational purposes</li>
                <li>We maintain appropriate security for education records</li>
                <li>We do not disclose student information without proper authorization</li>
              </ul>
              <p>
                Schools using AIVO can enter into agreements that ensure FERPA compliance. Contact
                us at <a href="mailto:privacy@aivolearning.com">privacy@aivolearning.com</a> for
                more information.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2>Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>
                  <strong>Access:</strong> Request a copy of your personal data
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your data (subject to legal
                  requirements)
                </li>
                <li>
                  <strong>Export:</strong> Request your data in a portable format
                </li>
                <li>
                  <strong>Opt-out:</strong> Unsubscribe from marketing communications
                </li>
              </ul>
              <p>
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@aivolearning.com">privacy@aivolearning.com</a>.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2>Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to
                provide our services. Specifically:
              </p>
              <ul>
                <li>
                  <strong>Active accounts:</strong> Data is retained while the account is active
                </li>
                <li>
                  <strong>Inactive accounts:</strong> Data is retained for 2 years after last
                  activity
                </li>
                <li>
                  <strong>Deleted accounts:</strong> Data is permanently deleted within 30 days of
                  deletion request
                </li>
                <li>
                  <strong>Legal holds:</strong> Some data may be retained longer if required by law
                </li>
              </ul>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2>Third-Party Services</h2>
              <p>We use trusted third-party services to operate our Platform. These include:</p>
              <ul>
                <li>
                  <strong>Cloud hosting:</strong> For secure data storage
                </li>
                <li>
                  <strong>Analytics:</strong> To understand how our Platform is used (anonymized)
                </li>
                <li>
                  <strong>Payment processing:</strong> To handle subscription payments securely
                </li>
                <li>
                  <strong>Customer support:</strong> To provide help desk services
                </li>
              </ul>
              <p>
                All third-party providers are contractually bound to protect your data and use it
                only for the purposes we specify.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section>
              <h2>Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by:
              </p>
              <ul>
                <li>Posting the new policy on this page</li>
                <li>Updating the &quot;Last updated&quot; date</li>
                <li>Sending an email notification for significant changes</li>
              </ul>
              <p>
                Your continued use of the Platform after changes constitutes acceptance of the
                updated policy.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2>Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please
                contact us:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 not-prose">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Data Protection Officer</p>
                    <p className="text-gray-600">AIVO Learning, Inc.</p>
                    <p className="text-gray-600">
                      Email:{' '}
                      <a
                        href="mailto:privacy@aivolearning.com"
                        className="text-theme-primary-600 hover:underline"
                      >
                        privacy@aivolearning.com
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
