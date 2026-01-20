/**
 * New Assignment Page
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { AssignmentForm } from '@/components/assignments/assignment-form';
import { PageHeader } from '@/components/layout/breadcrumb';
import { assignmentsApi } from '@/lib/api';
import type { CreateAssignmentDto } from '@/lib/types';

export default function NewAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get classId from search params, default to empty string (form may handle class selection)
  const classId = searchParams.get('classId') ?? '';

  const handleSubmit = async (data: CreateAssignmentDto) => {
    setLoading(true);
    setError(null);
    try {
      // Use the classId from the data (which includes the one from the form)
      await assignmentsApi.create(data.classId, data);
      router.push('/assignments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Assignment" description="Create a new assignment for your class" />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-white p-6">
        <AssignmentForm
          classId={classId}
          onSubmit={handleSubmit}
          onCancel={() => {
            router.back();
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
