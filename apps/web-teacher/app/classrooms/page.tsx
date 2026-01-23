'use client';

import { Card, Heading, Button } from '@aivo/ui-web';
import Link from 'next/link';
import * as React from 'react';

import { classesApi } from '@/lib/api';
import type { ClassSummary } from '@/lib/types';

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = React.useState<ClassSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const data = await classesApi.list();
        setClassrooms(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch classrooms'));
      } finally {
        setLoading(false);
      }
    };
    void fetchClassrooms();
  }, []);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <Heading kicker="My Classes" className="text-headline font-semibold">
            Classrooms
          </Heading>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading classrooms...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <Heading kicker="My Classes" className="text-headline font-semibold">
            Classrooms
          </Heading>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">{error.message}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading kicker="My Classes" className="text-headline font-semibold">
          Classrooms
        </Heading>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <Card
            key={classroom.id}
            title={classroom.name}
            subtitle={`${classroom.gradeLevel} • ${classroom.studentCount} students`}
          >
            <div className="flex gap-2 mt-4">
              <Link href={`/classrooms/${classroom.id}/analytics`}>
                <Button variant="primary" className="text-sm">
                  View Analytics
                </Button>
              </Link>
              <Button variant="ghost" className="text-sm">
                Roster
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
