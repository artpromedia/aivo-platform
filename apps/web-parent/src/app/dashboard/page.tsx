'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Clock,
  TrendingUp,
  MessageSquare,
  Download,
  ChevronDown,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { ProgressCard } from '@/components/progress-card';
import { SubjectProgress } from '@/components/subject-progress';
import { ActivityFeed } from '@/components/activity-feed';
import { TeacherNotes } from '@/components/teacher-notes';
import { ChildSelector } from '@/components/child-selector';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { t } = useTranslation('parent');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Fetch parent profile with children
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['parent-profile'],
    queryFn: () => api.get('/parent/profile'),
  });

  // Fetch selected child's summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['student-summary', selectedChildId],
    queryFn: () => api.get(`/parent/students/${selectedChildId}/summary`),
    enabled: !!selectedChildId,
  });

  // Fetch weekly progress
  const { data: weeklyProgress } = useQuery({
    queryKey: ['weekly-summary', selectedChildId],
    queryFn: () => api.get(`/parent/students/${selectedChildId}/weekly-summary`),
    enabled: !!selectedChildId,
  });

  // Auto-select first child
  if (profile?.students?.length && !selectedChildId) {
    setSelectedChildId(profile.students[0].id);
  }

  const handleDownloadReport = async () => {
    if (!selectedChildId) return;
    
    const response = await api.getBlob(`/reports/students/${selectedChildId}/progress.pdf`);
    const url = window.URL.createObjectURL(response);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${summary?.name || 'student'}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('dashboard.welcome', { name: profile?.firstName })}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-4">
          {/* Child Selector */}
          <ChildSelector
            children={profile?.students || []}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
          />

          {/* Download Report Button */}
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            aria-label={t('dashboard.downloadReport')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('dashboard.downloadReport')}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ProgressCard
            icon={<Clock className="w-5 h-5" />}
            label={t('progress.timeSpent')}
            value={`${summary.weeklyTimeSpent}`}
            unit={t('progress.minutes')}
            trend={summary.timeTrend}
          />
          <ProgressCard
            icon={<BookOpen className="w-5 h-5" />}
            label={t('progress.activeDays')}
            value={summary.activeDays}
            unit="/7"
          />
          <ProgressCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('progress.avgScore')}
            value={`${summary.averageScore}%`}
            trend={summary.scoreTrend}
          />
          <ProgressCard
            icon={<CheckCircle className="w-5 h-5" />}
            label={t('progress.completed')}
            value={summary.activitiesCompleted}
            unit={t('progress.activities')}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Subject Progress - 2 columns */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.subjects')}
            </h2>
            {summary?.subjectProgress ? (
              <SubjectProgress subjects={summary.subjectProgress} />
            ) : (
              <p className="text-gray-500">{t('common.loading')}</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.recentActivity')}
              </h2>
              <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                {t('dashboard.viewAll')}
              </button>
            </div>
            {summary?.recentActivity ? (
              <ActivityFeed activities={summary.recentActivity} />
            ) : (
              <p className="text-gray-500">{t('common.loading')}</p>
            )}
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Upcoming Assignments */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.upcomingAssignments')}
            </h2>
            {summary?.upcomingAssignments?.length > 0 ? (
              <ul className="space-y-3">
                {summary.upcomingAssignments.map((assignment: any) => (
                  <li
                    key={assignment.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        assignment.dueIn <= 1 ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-500">
                        {assignment.subject} • Due in {assignment.dueIn} days
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No upcoming assignments</p>
            )}
          </div>

          {/* Teacher Notes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.teacherNotes')}
              </h2>
              <MessageSquare className="w-5 h-5 text-gray-400" />
            </div>
            {summary?.teacherNotes?.length > 0 ? (
              <TeacherNotes notes={summary.teacherNotes} />
            ) : (
              <p className="text-gray-500 text-sm">{t('dashboard.noNotes')}</p>
            )}
          </div>

          {/* Weekly Highlights */}
          {weeklyProgress?.highlights && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <h2 className="text-lg font-semibold text-green-900 mb-4">
                {t('dashboard.weeklyProgress')}
              </h2>
              <ul className="space-y-2">
                {weeklyProgress.highlights.map((highlight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
