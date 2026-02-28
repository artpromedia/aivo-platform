/**
 * New Message (Compose) Page
 *
 * Compose & send a message. Supports ?studentId= pre-select.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useAccessToken, useStudents } from '@/hooks';
import { sendMessage, fetchConversations } from '@/lib/api/messages-standalone';

export const dynamic = 'force-dynamic';

export default function NewMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAccessToken();
  const { students } = useStudents();

  const preSelectedStudentId = searchParams.get('studentId') ?? '';

  const [recipientId, setRecipientId] = React.useState(preSelectedStudentId);
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync preSelected on mount
  React.useEffect(() => {
    if (preSelectedStudentId) setRecipientId(preSelectedStudentId);
  }, [preSelectedStudentId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Message body is required.');
      return;
    }
    if (!accessToken) {
      setError('Not authenticated. Please reload the page.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find or create a conversation, then send the message.
      // If we have a recipientId, look up an existing conversation with that student;
      // otherwise fall back to creating a new conversation via the send endpoint.
      let conversationId: string | undefined;

      if (recipientId) {
        const conversations = await fetchConversations(accessToken);
        // Conversation doesn't have a participants array — match by studentName or id
        const existing = conversations.find(
          (c) => c.id === recipientId,
        );
        conversationId = existing?.id;
      }

      // Build a rich first-message body with subject prefix when present
      const fullBody = subject ? `[${subject}] ${body}` : body;

      await sendMessage(conversationId ?? recipientId ?? 'new', fullBody, accessToken);
      router.push('/messages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Message" description="Compose and send a message" />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSend} className="mt-6 rounded-xl border bg-white p-6">
        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a recipient…</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Optional subject line"
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Body */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Write your message…"
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send Message'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
