'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  type ClassroomHomeworkUsage,
  type ClassroomFocusPatterns,
  fetchClassroomHomeworkUsage,
  fetchClassroomFocusPatterns,
} from '@/lib/classroom-analytics';
import { HomeworkTab } from '@/components/analytics/HomeworkTab';
import { FocusTab } from '@/components/analytics/FocusTab';

type TabId = 'homework' | 'focus';

export default function ClassroomAnalyticsPage() {
  const params = useParams();
  const classroomId = params?.classroomId as string;
  const tenantId = 'demo-tenant'; // In production, get from session/context

  const [activeTab, setActiveTab] = useState<TabId>('homework');
  const [homeworkData, setHomeworkData] = useState<ClassroomHomeworkUsage | null>(null);
  const [focusData, setFocusData] = useState<ClassroomFocusPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!classroomId) return;

      setLoading(true);
      setError(null);

      try {
        // Mock access token for demo - in production, get from auth provider
        const accessToken = 'demo-token';

        const [homework, focus] = await Promise.all([
          fetchClassroomHomeworkUsage(tenantId, classroomId, accessToken),
          fetchClassroomFocusPatterns(tenantId, classroomId, accessToken),
        ]);

        setHomeworkData(homework);
        setFocusData(focus);
      } catch (err) {
        console.error('Failed to load classroom analytics:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [classroomId, tenantId]);

  if (!classroomId) {
    return (
      <div className="p-6">
        <div className="text-red-600">No classroom ID provided</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Classroom Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Homework & Focus metrics for classroom {classroomId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Period:</span>
              <select className="text-sm border rounded-lg px-3 py-1.5 bg-white">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>This semester</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b -mb-px">
            <TabButton
              id="homework"
              label="Homework Helper"
              icon="📚"
              active={activeTab === 'homework'}
              onClick={() => setActiveTab('homework')}
            />
            <TabButton
              id="focus"
              label="Focus & Regulation"
              icon="🧘"
              active={activeTab === 'focus'}
              onClick={() => setActiveTab('focus')}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            {activeTab === 'homework' && homeworkData && (
              <HomeworkTab data={homeworkData} />
            )}
            {activeTab === 'focus' && focusData && (
              <FocusTab data={focusData} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function TabButton({
  id,
  label,
  icon,
  active,
  onClick,
}: {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="text-red-600 text-lg mb-2">⚠️ {message}</div>
      <button
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
}
