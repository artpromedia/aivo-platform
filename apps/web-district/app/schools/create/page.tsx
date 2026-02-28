'use client';

import { Button, Card, Heading, useGradeTheme } from '@aivo/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// ============================================================================
// Helpers
// ============================================================================

const TENANT_ID =
  typeof window !== 'undefined'
    ? (/aivo_tenant_id=([^;]+)/.exec(document.cookie)?.[1] ?? 'default')
    : 'default';

// ============================================================================
// Component
// ============================================================================

export default function CreateSchoolPage() {
  const router = useRouter();
  const { themeId } = useGradeTheme();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();
    const code = (form.get('code') as string).trim();
    const address = (form.get('address') as string).trim();
    const principalEmail = (form.get('principalEmail') as string).trim();

    if (!name) {
      setError('School name is required.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          name,
          address: address || undefined,
          external_id: code || undefined,
          principalEmail: principalEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Failed to create school (${res.status})`);
      }

      const school = (await res.json()) as { id: string };
      setSuccess(true);

      // Navigate to the new school detail page after a brief delay so user sees success
      setTimeout(() => {
        router.push(`/schools/${school.id}`);
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create school');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link href="/schools" className="hover:text-primary hover:underline">
          Schools
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">Create</span>
      </nav>

      <Heading kicker="New School" className="text-headline font-semibold">
        Create School
      </Heading>

      {/* Success message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          School created successfully! Redirecting...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card title="School details" subtitle={`Theme: ${themeId}`}>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-1">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-text">
              School Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Lincoln Elementary School"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Code / School Code (maps to externalId in backend) */}
          <div className="space-y-1">
            <label htmlFor="code" className="block text-sm font-medium text-text">
              School Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              placeholder="e.g. LINCOLN-001"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label htmlFor="address" className="block text-sm font-medium text-text">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="e.g. 100 Main Street, Springfield"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Principal Email */}
          <div className="space-y-1">
            <label htmlFor="principalEmail" className="block text-sm font-medium text-text">
              Principal Email
            </label>
            <input
              id="principalEmail"
              name="principalEmail"
              type="email"
              placeholder="e.g. principal@school.edu"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
            <Link href="/schools">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </section>
  );
}
