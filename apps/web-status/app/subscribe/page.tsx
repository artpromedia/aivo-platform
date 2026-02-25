'use client';

import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { subscribe } from '@/lib/api';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await subscribe(email, webhookUrl || undefined);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscribed!</h1>
        <p className="text-gray-600">
          We&apos;ve sent a verification email to <strong>{email}</strong>.
          Please click the link in the email to confirm your subscription.
        </p>
        <a href="/" className="text-aivo-600 hover:text-aivo-700 text-sm mt-6 inline-block">
          ← Back to status page
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <Bell className="w-10 h-10 text-aivo-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">Subscribe to Updates</h1>
        <p className="text-sm text-gray-600 mt-2">
          Get notified when AIVO services experience issues or scheduled maintenance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-aivo-500 focus:ring-1 focus:ring-aivo-500 outline-none transition"
          />
        </div>

        {/* Webhook (optional) */}
        <div>
          <label htmlFor="webhook" className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="webhook"
            type="url"
            value={webhookUrl}
            onChange={(e) => { setWebhookUrl(e.target.value); }}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-aivo-500 focus:ring-1 focus:ring-aivo-500 outline-none transition"
          />
          <p className="text-xs text-gray-400 mt-1">
            Receive JSON payloads for programmatic integrations (Slack, PagerDuty, etc.)
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-aivo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-aivo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Subscribing…' : 'Subscribe to Updates'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          You can unsubscribe at any time via the link in every notification email.
        </p>
      </form>
    </div>
  );
}
