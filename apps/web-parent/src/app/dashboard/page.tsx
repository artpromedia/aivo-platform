'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Clock,
  TrendingUp,
  MessageSquare,
  Download,
  CheckCircle,
  AlertTriangle,
  Settings,
  Award,
  Users,
  Flame,
} from 'lucide-react';

// Components
import { ProgressCard } from '@/components/progress-card';
import { SubjectProgress } from '@/components/subject-progress';
import { ActivityFeed } from '@/components/activity-feed';
import { TeacherNotes } from '@/components/teacher-notes';
import { ChildSelector } from '@/components/child-selector';
import { StreakWidget } from '@/components/streak-widget';
import { AchievementBadges } from '@/components/achievement-badges';
import { DailyUsageTracker } from '@/components/daily-usage-tracker';
import { HomeworkHelperSection } from '@/components/homework-helper-section';
import { MessagesPreview } from '@/components/messages-preview';
import { DifficultyRecommendations } from '@/components/difficulty-recommendations';

// Sprint 5: New Dashboard Components
import {
  AIInsightsPanel,
  ActivityTimeline,
  UpcomingMilestones,
  WeeklyReport,
  QuickActions,
  EnhancedChildSelector,
  type ChildData,
} from '@/components/dashboard';

// Hooks
import {
  useParentProfile,
  useStudentSummary,
  useWeeklySummary,
  useHomeworkSessions,
  useMessages,
  useDifficultyRecommendations,
  useRespondToRecommendation,
  useDownloadReport,
  useUpdateDailyGoal,
  // Sprint 5: New hooks
  useAIInsights,
  useActivityTimeline,
  useMilestones,
  useWeeklyReport,
  useChildrenEnhanced,
} from '@/lib/hooks';
import { isDevMode } from '@/lib/mock-data';

export default function DashboardPage() {
  const { t } = useTranslation('parent');
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Data hooks
  const { data: profile, isLoading: profileLoading, error: profileError } = useParentProfile();
  const { data: summary, isLoading: summaryLoading } = useStudentSummary(selectedChildId);
  const { data: weeklyProgress } = useWeeklySummary(selectedChildId);
  const { data: homeworkSessions } = useHomeworkSessions(selectedChildId);
  const { data: messages } = useMessages();
  const { data: recommendations } = useDifficultyRecommendations(selectedChildId);

  // Sprint 5: New data hooks
  const { data: aiInsights, isLoading: insightsLoading } = useAIInsights(selectedChildId);
  const { data: activityTimeline } = useActivityTimeline(selectedChildId, 15);
  const { data: milestones } = useMilestones(selectedChildId);
  const { data: weeklyReportData } = useWeeklyReport(selectedChildId);
  const { data: enhancedChildren } = useChildrenEnhanced();

  // Mutations
  const downloadReport = useDownloadReport();
  const respondToRecommendation = useRespondToRecommendation();
  const updateDailyGoal = useUpdateDailyGoal();

  // Auto-select first child when profile loads
  useEffect(() => {
    if (profile?.students?.length && !selectedChildId) {
      setSelectedChildId(profile.students[0].id);
    }
  }, [profile, selectedChildId]);

  const handleDownloadReport = () => {
    if (!selectedChildId || !summary) return;
    downloadReport.mutate({
      studentId: selectedChildId,
      studentName: summary.name,
    });
  };

  const handleRespondToRecommendation = (
    recommendationId: string,
    action: 'approve' | 'modify' | 'deny',
    modifiedLevel?: number
  ) => {
    respondToRecommendation.mutate({
      recommendationId,
      action,
      modifiedLevel,
    });
  };

  const handleSetDailyGoal = (minutes: number) => {
    if (!selectedChildId) return;
    updateDailyGoal.mutate({
      studentId: selectedChildId,
      goalMinutes: minutes,
    });
  };

  // Loading state
  if (profileLoading) {
    return (
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  // Error state (in production only)
  if (profileError && !isDevMode()) {
    return (
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load dashboard</h2>
            <p className="text-gray-500 mb-4">Please try refreshing the page or sign in again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Dev mode indicator - hidden for demo
  const DevModeIndicator = () => {
    // Temporarily hidden for investor demo
    return null;
  };

  const selectedChild = profile?.students?.find(s => s.id === selectedChildId);

  // Transform enhanced children data for the new selector
  const enhancedChildrenData: ChildData[] = enhancedChildren?.map(child => ({
    id: child.id,
    name: child.name,
    firstName: child.firstName,
    lastName: child.lastName,
    gradeLevel: child.gradeLevel,
    avatar: child.avatar,
    subjects: child.subjects,
    lastActive: child.lastActive,
    currentStreak: child.currentStreak,
    todayProgress: child.todayProgress,
    status: child.status,
  })) || profile?.students?.map(s => ({
    id: s.id,
    name: s.name || `${s.firstName} ${s.lastName}`,
    firstName: s.firstName,
    lastName: s.lastName,
    gradeLevel: s.grade,
    avatar: s.avatar,
    subjects: [],
    lastActive: new Date().toISOString(),
  })) || [];

  const selectedEnhancedChild = enhancedChildrenData.find(c => c.id === selectedChildId) || null;

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <DevModeIndicator />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.title', 'Parent Dashboard')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('dashboard.welcome', { name: profile?.firstName, defaultValue: `Welcome back, ${profile?.firstName || 'Parent'}` })}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-4">
          {/* Enhanced Child Selector (Sprint 5) */}
          {enhancedChildrenData.length > 0 ? (
            <EnhancedChildSelector
              children={enhancedChildrenData}
              selected={selectedEnhancedChild}
              onChange={(child) => setSelectedChildId(child.id)}
              onAddChild={() => router.push('/onboarding/add-child')}
              showStatus={true}
              showProgress={true}
            />
          ) : (
            <ChildSelector
              children={profile?.students?.map(s => ({
                id: s.id,
                name: s.name || `${s.firstName} ${s.lastName}`,
                grade: s.grade,
                avatar: s.avatar,
              })) || []}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          )}

          {/* Communication Button */}
          <button
            onClick={() => router.push('/communication')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            aria-label="Communication & Progress"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">
              Communication
            </span>
          </button>

          {/* Download Report Button */}
          <button
            onClick={handleDownloadReport}
            disabled={!selectedChildId || downloadReport.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('dashboard.downloadReport', 'Download Report')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">
              {downloadReport.isPending ? 'Downloading...' : t('dashboard.downloadReport', 'Download Report')}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => router.push('/settings')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading indicator for student data */}
      {summaryLoading && selectedChildId && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
            <span className="text-gray-600">Loading {selectedChild?.name || 'student'}'s data...</span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ProgressCard
            icon={<Clock className="w-5 h-5" />}
            label={t('progress.timeSpent', 'Time This Week')}
            value={summary.weeklyTimeSpent}
            unit={t('progress.minutes', 'min')}
            trend={summary.timeTrend}
            onClick={() => router.push('/activity')}
          />
          <ProgressCard
            icon={<BookOpen className="w-5 h-5" />}
            label={t('progress.activeDays', 'Active Days')}
            value={summary.activeDays}
            unit="/7"
            onClick={() => router.push('/activity')}
          />
          <ProgressCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('progress.avgScore', 'Avg. Score')}
            value={`${summary.averageScore}%`}
            trend={summary.scoreTrend}
            onClick={() => router.push('/activity')}
          />
          <ProgressCard
            icon={<CheckCircle className="w-5 h-5" />}
            label={t('progress.completed', 'Activities')}
            value={summary.activitiesCompleted}
            unit={t('progress.activities', 'completed')}
            onClick={() => router.push('/activity')}
          />
        </div>
      )}

      {/* Difficulty Recommendations (if any) */}
      {recommendations && recommendations.length > 0 && (
        <div className="mb-8">
          <DifficultyRecommendations
            recommendations={recommendations}
            onRespond={handleRespondToRecommendation}
            isLoading={respondToRecommendation.isPending}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Streak and Daily Usage Row */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StreakWidget
                currentStreak={summary.currentStreak}
                longestStreak={summary.longestStreak}
                weeklyActivity={summary.weeklyActivity}
                lastActiveDate={summary.lastActiveDate}
              />
              <DailyUsageTracker
                todayUsage={summary.dailyUsage}
                weeklyUsage={summary.weeklyUsageHistory}
                dailyGoalMinutes={30}
                onSetGoal={handleSetDailyGoal}
              />
            </div>
          )}

          {/* Sprint 5: Activity Timeline */}
          {activityTimeline && activityTimeline.length > 0 && (
            <ActivityTimeline
              activities={activityTimeline}
              maxItems={10}
              showFilters={true}
              onActivityClick={(activity) => {
                // Navigate to activity detail or relevant page
                if (activity.subject) {
                  router.push(`/activity?subject=${activity.subject}`);
                } else {
                  router.push('/activity');
                }
              }}
              onViewAll={() => router.push('/activity')}
            />
          )}

          {/* Subject Progress */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.subjects', 'Subjects')}
            </h2>
            {summary?.subjectProgress ? (
              <SubjectProgress subjects={summary.subjectProgress} />
            ) : (
              <div className="py-8 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t('dashboard.noSubjectData', 'No subject progress data yet')}</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.recentActivity', 'Recent Activity')}
              </h2>
              <button 
                onClick={() => router.push('/activity')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                {t('dashboard.viewAll', 'View All')}
              </button>
            </div>
            {summary?.recentActivity && summary.recentActivity.length > 0 ? (
              <ActivityFeed 
                activities={summary.recentActivity}
                onActivityClick={() => router.push('/activity')}
                onViewAll={() => router.push('/activity')}
              />
            ) : (
              <p className="text-gray-500 py-4 text-center">
                {t('dashboard.noActivity', 'No recent activity')}
              </p>
            )}
          </div>

          {/* Homework Helper Section */}
          {homeworkSessions && (
            <HomeworkHelperSection
              sessions={homeworkSessions}
              onViewAll={() => {
                router.push('/homework');
              }}
            />
          )}

          {/* Sprint 5: Weekly Report */}
          {weeklyReportData && selectedChildId && (
            <WeeklyReport
              childId={selectedChildId}
              childName={selectedChild?.name || selectedEnhancedChild?.name}
              data={weeklyReportData}
              onWeekChange={(weekStart) => {
                // The hook will refetch with new week
                console.log('Week changed to:', weekStart);
              }}
              onDownload={handleDownloadReport}
              onShare={() => {
                // Could open share dialog
                router.push(`/reports/share?childId=${selectedChildId}`);
              }}
            />
          )}
        </div>

        {/* Right Column - Sidebar (1 column) */}
        <div className="space-y-6">
          {/* Sprint 5: AI Insights Panel */}
          <AIInsightsPanel
            insights={aiInsights || []}
            childName={selectedChild?.name || selectedEnhancedChild?.name}
            isLoading={insightsLoading}
            onViewDetail={(insight) => {
              if (insight.actionPath) {
                router.push(insight.actionPath);
              }
            }}
            onDismiss={(insightId) => {
              console.log('Dismiss insight:', insightId);
              // Could call useDismissInsight mutation here
            }}
            onViewAllAnalysis={() => router.push(`/insights?childId=${selectedChildId}`)}
          />

          {/* Sprint 5: Upcoming Milestones */}
          {milestones && milestones.length > 0 && (
            <UpcomingMilestones
              milestones={milestones}
              onMilestoneClick={(milestone) => {
                router.push(`/achievements?milestone=${milestone.id}`);
              }}
              onViewAll={() => router.push('/achievements')}
            />
          )}

          {/* Sprint 5: Quick Actions */}
          {selectedChildId && (
            <QuickActions
              childId={selectedChildId}
              childName={selectedChild?.name || selectedEnhancedChild?.name}
              unreadMessages={messages?.filter(m => m.unread).length || 0}
              pendingApprovals={recommendations?.length || 0}
              onDownloadReport={handleDownloadReport}
              onScheduleSession={() => router.push('/settings?tab=schedule')}
              onContactTeacher={() => router.push('/messages/new')}
            />
          )}

          {/* Achievements */}
          {summary?.achievements && (
            <AchievementBadges
              achievements={summary.achievements}
              showLocked={true}
              maxDisplay={6}
              onViewAll={() => router.push('/achievements')}
            />
          )}

          {/* Upcoming Assignments */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.upcomingAssignments', 'Upcoming Assignments')}
            </h2>
            {summary?.upcomingAssignments && summary.upcomingAssignments.length > 0 ? (
              <ul className="space-y-3">
                {summary.upcomingAssignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        assignment.dueIn <= 1 ? 'bg-red-500' : assignment.dueIn <= 3 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-500">
                        {assignment.subject} - Due in {assignment.dueIn} day{assignment.dueIn !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm py-4 text-center">
                {t('dashboard.noAssignments', 'No upcoming assignments')}
              </p>
            )}
          </div>

          {/* Messages Preview */}
          {messages && (
            <MessagesPreview
              messages={messages}
              onViewAll={() => {
                router.push('/messages');
              }}
              onMessageClick={(id) => {
                router.push(`/messages?id=${id}`);
              }}
            />
          )}

          {/* Teacher Notes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashboard.teacherNotes', 'Teacher Notes')}
              </h2>
              <MessageSquare className="w-5 h-5 text-gray-400" />
            </div>
            {summary?.teacherNotes && summary.teacherNotes.length > 0 ? (
              <TeacherNotes notes={summary.teacherNotes} />
            ) : (
              <p className="text-gray-500 text-sm py-4 text-center">
                {t('dashboard.noNotes', 'No teacher notes yet')}
              </p>
            )}
          </div>

          {/* Weekly Highlights */}
          {weeklyProgress?.highlights && weeklyProgress.highlights.length > 0 && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <h2 className="text-lg font-semibold text-green-900 mb-4">
                {t('dashboard.weeklyHighlights', 'Weekly Highlights')}
              </h2>
              <ul className="space-y-2">
                {weeklyProgress.highlights.map((highlight, index) => (
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
