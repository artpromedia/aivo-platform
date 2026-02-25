'use client';

import { useState, useCallback } from 'react';

import type { SetupStepProps } from '../PostSignUpSetup';

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

interface InviteEntry {
  email: string;
  role: 'DISTRICT_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER';
}

export function InviteAdminsStep({ tenantId, accessToken, onComplete, onSkip, onBack, isCompleted }: SetupStepProps) {
  const [invites, setInvites] = useState<InviteEntry[]>([
    { email: '', role: 'DISTRICT_ADMIN' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);

  const addRow = useCallback(() => {
    setInvites((prev) => [...prev, { email: '', role: 'DISTRICT_ADMIN' }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setInvites((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateRow = useCallback((index: number, updates: Partial<InviteEntry>) => {
    setInvites((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) {
      setError('Enter at least one email address');
      return;
    }

    const invalidEmails = validInvites.filter(
      (inv) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email),
    );
    if (invalidEmails.length > 0) {
      setError(`Invalid email: ${invalidEmails[0].email}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/invitations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ invitations: validInvites }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to send invitations');
      }

      setSentCount(validInvites.length);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCompleted || sentCount > 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Invite Admins</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> Invitations sent{sentCount > 0 ? ` (${sentCount})` : ''}.
          </p>
          <p className="mt-1 text-sm text-green-700">
            Invited administrators will receive an email with login instructions.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onComplete} className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Invite Administrators</h2>
      <p className="mb-6 text-sm text-gray-600">
        Invite colleagues to help manage your district on Aivo.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {invites.map((invite, index) => (
          <div key={index} className="flex items-center gap-3">
            <input
              type="email"
              placeholder="colleague@district.edu"
              value={invite.email}
              onChange={(e) => updateRow(index, { email: e.target.value })}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={invite.role}
              onChange={(e) => updateRow(index, { role: e.target.value as InviteEntry['role'] })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DISTRICT_ADMIN">District Admin</option>
              <option value="SCHOOL_ADMIN">School Admin</option>
              <option value="TEACHER">Teacher</option>
            </select>
            {invites.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                title="Remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <span>+</span> Add another
        </button>

        <div className="flex justify-between pt-2">
          <div className="flex gap-3">
            {onBack && (
              <button type="button" onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                ← Back
              </button>
            )}
            {onSkip && (
              <button type="button" onClick={onSkip} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                Skip for now
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send Invitations →'}
          </button>
        </div>
      </form>
    </div>
  );
}
