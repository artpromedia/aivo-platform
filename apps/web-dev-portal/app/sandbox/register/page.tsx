'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SandboxRegisterPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactRole: '',
    integrationType: [] as string[],
    useCase: '',
    expectedVolume: '',
    timeline: '',
    agreedToTerms: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would submit to the backend
    console.log('Registration submitted:', formData);
    setSubmitted(true);
  };

  const handleIntegrationChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      integrationType: prev.integrationType.includes(type)
        ? prev.integrationType.filter(t => t !== type)
        : [...prev.integrationType, type],
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your interest in the Aivo Developer Program. Our team will 
            review your application and get back to you within 2-3 business days.
          </p>
          <p className="text-gray-600 mb-8">
            Check your email at <strong>{formData.contactEmail}</strong> for confirmation.
          </p>
          <Link 
            href="/docs"
            className="inline-block px-6 py-3 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors font-medium"
          >
            Explore Documentation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-portal-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="font-semibold text-xl">Aivo Developers</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Sandbox Access</h1>
          <p className="text-gray-600">
            Complete this form to apply for access to the Aivo Developer Sandbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
          {/* Company Information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Company Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                  placeholder="Acme Education Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                  placeholder="https://acme-education.com"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                    placeholder="Jane Developer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactRole}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactRole: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                    placeholder="Software Engineer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                  placeholder="jane@acme-education.com"
                />
              </div>
            </div>
          </div>

          {/* Integration Details */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Integration Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Integration Types *
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'api', label: 'Public API (learner progress, sessions)' },
                    { id: 'webhooks', label: 'Webhooks (event notifications)' },
                    { id: 'lti', label: 'LTI 1.3 (LMS integration)' },
                    { id: 'sis', label: 'SIS/Rostering (OneRoster)' },
                    { id: 'sso', label: 'SSO (SAML/OIDC)' },
                  ].map((type) => (
                    <label key={type.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.integrationType.includes(type.id)}
                        onChange={() => handleIntegrationChange(type.id)}
                        className="w-4 h-4 text-portal-primary border-gray-300 rounded focus:ring-portal-primary"
                      />
                      <span className="text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe Your Use Case *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.useCase}
                  onChange={(e) => setFormData(prev => ({ ...prev, useCase: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                  placeholder="We want to integrate Aivo with our district's student portal to display learning progress and sync grades with our LMS..."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected API Volume
                  </label>
                  <select
                    value={formData.expectedVolume}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedVolume: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="low">Low (&lt; 1,000 requests/day)</option>
                    <option value="medium">Medium (1,000-10,000/day)</option>
                    <option value="high">High (10,000-100,000/day)</option>
                    <option value="enterprise">Enterprise (&gt; 100,000/day)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Launch Timeline
                  </label>
                  <select
                    value={formData.timeline}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portal-primary focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="exploring">Just exploring</option>
                    <option value="1month">Within 1 month</option>
                    <option value="3months">Within 3 months</option>
                    <option value="6months">Within 6 months</option>
                    <option value="later">Later / Not sure</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="pt-4 border-t border-gray-200">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                checked={formData.agreedToTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                className="w-4 h-4 mt-0.5 text-portal-primary border-gray-300 rounded focus:ring-portal-primary"
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <a href="/terms" className="text-portal-primary hover:underline">Developer Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-portal-primary hover:underline">Privacy Policy</a>
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-portal-primary text-white rounded-lg hover:bg-portal-primary/90 transition-colors font-medium"
            >
              Submit Application
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have access? <Link href="/dashboard" className="text-portal-primary hover:underline">Sign in to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
