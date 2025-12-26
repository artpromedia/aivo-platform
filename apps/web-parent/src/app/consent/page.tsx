'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ConsentManager } from '@/components/consent-manager';
import { api } from '@/lib/api';

export default function ConsentPage() {
  const { t } = useTranslation('parent');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['parent-profile'],
    queryFn: () => api.get<{ students: Array<{ id: string; name: string; age?: number }> }>('/parent/profile'),
  });

  // Auto-select first student
  if (profile?.students?.length && !selectedStudentId) {
    setSelectedStudentId(profile.students[0].id);
  }

  const selectedStudent = profile?.students.find((s) => s.id === selectedStudentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('consent.title')}</h1>

      {/* Student Tabs */}
      {profile?.students && profile.students.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {profile.students.map((student) => (
            <button
              key={student.id}
              onClick={() => setSelectedStudentId(student.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedStudentId === student.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {student.name}
            </button>
          ))}
        </div>
      )}

      {/* Consent Manager */}
      {selectedStudent && (
        <div className="card">
          <ConsentManager
            studentId={selectedStudent.id}
            studentName={selectedStudent.name}
            studentAge={selectedStudent.age}
          />
        </div>
      )}
    </main>
  );
}
