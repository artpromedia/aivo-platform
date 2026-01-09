/**
 * New Assignment Page
 */

'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AssignmentForm } from '@/components/assignments/assignment-form';
import { PageHeader } from '@/components/layout/breadcrumb';
import type { CreateAssignmentDto } from '@/lib/types';

export default function NewAssignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (data: CreateAssignmentDto) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push('/assignments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Assignment" description="Create a new assignment for your class" />

      <div className="mt-6 rounded-xl border bg-white p-6">
        <AssignmentForm
          classId="1"
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
