'use client';

import { useState } from 'react';

import type { WizardStepProps } from '../OnboardingWizard';

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

const TERMS_OF_SERVICE = `AIVO PLATFORM TERMS OF SERVICE

Last Updated: January 2026

1. ACCEPTANCE OF TERMS
By accessing and using the AIVO platform ("Service"), you agree to be bound by these Terms of Service.

2. DESCRIPTION OF SERVICE
AIVO provides AI-assisted educational technology services including personalized learning, IEP management, progress monitoring, and accessibility tools for K-12 students.

3. DATA PRIVACY AND SECURITY
a) FERPA Compliance: AIVO operates as a "school official" with a legitimate educational interest under FERPA (34 CFR § 99.31(a)(1)). All student education records are handled in accordance with FERPA requirements.
b) COPPA Compliance: For students under 13, AIVO relies on school consent under the COPPA school authorization exception. No personal information is collected from children for commercial purposes.
c) Data Encryption: All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
d) Data Residency: Student data is stored within the United States.
e) Data Retention: Student data is retained for the duration of the agreement plus 90 days for backup purposes. Data is securely deleted upon contract termination.

4. PROHIBITED USES
a) The Service shall not be used to discriminate against students based on race, color, national origin, sex, disability, or age.
b) AI-generated recommendations are advisory only and do not replace professional educational judgment.
c) Student data shall not be used for targeted advertising.

5. INTELLECTUAL PROPERTY
The district retains ownership of all student data. AIVO retains ownership of the platform, algorithms, and aggregated de-identified insights.

6. SERVICE LEVEL AGREEMENT
AIVO guarantees 99.9% uptime during school hours (7 AM – 5 PM local time, Monday–Friday). Planned maintenance windows are scheduled outside school hours with 48-hour advance notice.

7. TERMINATION
Either party may terminate this agreement with 90 days written notice. Upon termination, AIVO will provide a complete data export within 30 days and securely delete all district data within 90 days.

8. LIMITATION OF LIABILITY
AIVO's liability is limited to the total fees paid by the district in the 12 months preceding the claim.

9. GOVERNING LAW
This agreement is governed by the laws of the State of Delaware.`;

const FERPA_AGREEMENT = `FERPA/COPPA DATA PROCESSING AGREEMENT

This Data Processing Agreement ("DPA") is entered into between the School District ("District") and AIVO, Inc. ("Provider").

1. PURPOSE
This DPA governs the collection, use, storage, and protection of student personally identifiable information (PII) from education records under FERPA (20 U.S.C. § 1232g) and children's personal information under COPPA (15 U.S.C. §§ 6501-6506).

2. DEFINITIONS
a) "Education Records" means records directly related to a student maintained by the District, as defined in FERPA (34 CFR § 99.3).
b) "Student PII" means personally identifiable information from education records as defined in 34 CFR § 99.3.
c) "Covered Information" means Student PII and children's personal information under COPPA.

3. DATA USE RESTRICTIONS
Provider shall:
a) Use Covered Information solely for the educational purposes specified in this DPA
b) Not sell Student PII or use it for targeted advertising
c) Not disclose Covered Information to third parties without District consent
d) Not use Covered Information to build profiles for non-educational purposes

4. SECURITY MEASURES
Provider implements and maintains:
a) SOC 2 Type II certified data security controls
b) Annual penetration testing and vulnerability assessments
c) Encryption of data in transit and at rest
d) Role-based access controls with principle of least privilege
e) Incident response plan with 72-hour breach notification

5. PARENT/GUARDIAN RIGHTS
Provider shall support the District in fulfilling parent/guardian rights under FERPA including:
a) Right to inspect and review education records
b) Right to request amendment of records
c) Right to consent to disclosure of PII
d) Right to file complaints with the U.S. Department of Education

6. DATA BREACH NOTIFICATION
Provider shall notify District within 72 hours of discovering a breach affecting Covered Information, including:
a) Description of the breach
b) Types of data affected
c) Number of individuals affected
d) Steps taken to mitigate harm
e) Corrective actions implemented

7. TERM AND TERMINATION
This DPA remains in effect for the duration of the service agreement. Upon termination, Provider shall delete all Covered Information within 90 days and certify destruction in writing.`;

export function MasterAgreementStep({ tenantId, onComplete, onBack, status }: WizardStepProps) {
  const isCompleted = status?.steps[1]?.completed ?? false;
  const [activeTab, setActiveTab] = useState<'tos' | 'ferpa'>('tos');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToFerpa, setAgreedToFerpa] = useState(false);
  const [signeeName, setSigneeName] = useState('');
  const [signeeTitle, setSigneeTitle] = useState('');
  const [signeeEmail, setSigneeEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isCompleted) {
    const details = status?.steps[1]?.details as
      | { signeeName?: string; signedAt?: string }
      | undefined;

    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Master Agreement</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> Master agreement has been signed.
          </p>
          {details && (
            <div className="mt-2 text-sm text-green-700">
              <p>Signed by: {details.signeeName}</p>
              {details.signedAt && (
                <p>
                  Date: {new Date(details.signedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-between">
          {onBack && (
            <button onClick={onBack} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
              ← Back
            </button>
          )}
          <button
            onClick={onComplete}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms || !agreedToFerpa) {
      setError('You must agree to both the Terms of Service and FERPA/COPPA agreement.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/onboarding/tenants/${tenantId}/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signeeName,
          signeeTitle,
          signeeEmail,
          agreedToTerms,
          agreedToFerpa,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? 'Failed to record agreement');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Master Agreement</h2>
      <p className="mb-6 text-sm text-gray-600">
        Review and sign the AIVO Terms of Service and FERPA/COPPA Data Processing Agreement.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabbed agreement display */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('tos')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'tos'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('ferpa')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'ferpa'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            FERPA/COPPA Agreement
          </button>
        </div>
        <div className="h-64 overflow-y-auto rounded-b-lg border border-t-0 border-gray-200 bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
            {activeTab === 'tos' ? TERMS_OF_SERVICE : FERPA_AGREEMENT}
          </pre>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Acknowledgment */}
        <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the <strong>AIVO Terms of Service</strong>. I am authorized
              to bind my school district to these terms.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToFerpa}
              onChange={(e) => setAgreedToFerpa(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the <strong>FERPA/COPPA Data Processing Agreement</strong>.
              I acknowledge our district&apos;s obligations under federal privacy law.
            </span>
          </label>
        </div>

        {/* Digital Signature */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700">Digital Signature</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signeeName" className="block text-sm font-medium text-gray-700">
                Full Legal Name *
              </label>
              <input
                id="signeeName"
                type="text"
                required
                value={signeeName}
                onChange={(e) => setSigneeName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div>
              <label htmlFor="signeeTitle" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                id="signeeTitle"
                type="text"
                required
                value={signeeTitle}
                onChange={(e) => setSigneeTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Superintendent"
              />
            </div>
          </div>
          <div>
            <label htmlFor="signeeEmail" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              id="signeeEmail"
              type="email"
              required
              value={signeeEmail}
              onChange={(e) => setSigneeEmail(e.target.value)}
              className="mt-1 block w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="jsmith@springfield.k12.us"
            />
          </div>
          {signeeName && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-1 text-xs text-gray-500">Digital Signature Preview</p>
              <p className="font-serif text-2xl italic text-gray-800">{signeeName}</p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </fieldset>

        <div className="flex justify-between border-t border-gray-200 pt-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !agreedToTerms || !agreedToFerpa || !signeeName || !signeeTitle || !signeeEmail}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Recording Agreement...' : 'Sign & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}
