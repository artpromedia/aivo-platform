'use client';

import {
  BookOpen,
  Clock,
  TrendingUp,
  MessageSquare,
  Download,
  CheckCircle,
  Settings,
  Users,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Components
import { AchievementBadges } from '@/components/achievement-badges';
import { ActivityFeed } from '@/components/activity-feed';
import { ChildSelector } from '@/components/child-selector';
import { DailyUsageTracker } from '@/components/daily-usage-tracker';
import {
  AIInsightsPanel,
  ActivityTimeline,
  UpcomingMilestones,
  WeeklyReport,
  QuickActions,
  EnhancedChildSelector,
  type ChildData,
} from '@/components/dashboard';
import { DifficultyRecommendations } from '@/components/difficulty-recommendations';
import { QueryErrorDisplay } from '@/components/error-boundary';
import { HomeworkHelperSection } from '@/components/homework-helper-section';
import { MessagesPreview } from '@/components/messages-preview';
import { ProgressCard } from '@/components/progress-card';
import { DashboardSkeleton } from '@/components/skeletons';
import { StreakWidget } from '@/components/streak-widget';
import { SubjectProgress } from '@/components/subject-progress';
import { TeacherNotes } from '@/components/teacher-notes';
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
  useAIInsights,
  useActivityTimeline,
  useMilestones,
  useWeeklyReport,
  useChildrenEnhanced,
  useDismissInsight,
  useSubscription,
  useCreateBillingPortal,
} from '@/hooks';

/* ---------- Subscription Status Banner ---------- */
interface SubscriptionBannerProps {
  subscription?: {
    status?: string;
    trialEndDate?: string;
    plan?: { name?: string };
  } | null;
  onUpgrade: () => void;
  onManage: () => void;
}

function SubscriptionBanner({ subscription, onUpgrade, onManage }: SubscriptionBannerProps) {
  if (!subscription) return null;

  const { status, trialEndDate } = subscription;

  // Calculate trial days remaining
  const trialDaysLeft = trialEndDate
    ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / 86_400_000))
    : 0;

  if (status === 'trialing') {
    return (
      <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Free Trial Active</p>
            <p className="text-xs text-blue-700">
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`
                : 'Trial ends today'}
              {subscription.plan?.name ? ` · ${subscription.plan.name}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Upgrade Now
        </button>
      </div>
    );
  }

  if (status === 'past_due' || status === 'unpaid') {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
            <CreditCard className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Payment Issue</p>
            <p className="text-xs text-amber-700">
              Your subscription payment is overdue. Please update your payment method.
            </p>
          </div>
        </div>
        <button
          onClick={onManage}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
        >
          Update Payment
        </button>
      </div>
    );
  }

  if (status === 'canceled' || status === 'expired' || status === 'incomplete') {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
            <CreditCard className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">No Active Subscription</p>
            <p className="text-xs text-gray-600">
              Subscribe to unlock AI tutoring, homework help, and progress tracking.
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          View Plans
        </button>
      </div>
    );
  }

  // Active status — show a subtle badge (no full banner)
  if (status === 'active') {
    return (
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          {subscription.plan?.name || 'Active'}
        </span>
      </div>
    );
  }

  return null;
}

/* ---------- Subscription Status Card (Dashboard Sidebar) ---------- */
interface SubscriptionCardProps {
  subscription?: {
    status?: string;
    trialEndDate?: string;
    currentPeriodEnd?: string;
    billingPeriod?: string;
    plan?: { name?: string };
    pricePerPeriod?: number;
    cancelAtPeriodEnd?: boolean;
  } | null;
  onManage: () => void;
  onUpgrade: () => void;
}

function SubscriptionStatusCard({ subscription, onManage, onUpgrade }: SubscriptionCardProps) {
  if (!subscription) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          Subscription
        </h2>
        <p className="text-sm text-gray-500 mb-4">No active subscription</p>
        <button
          onClick={onUpgrade}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          View Plans
        </button>
      </div>
    );
  }

  const { status, plan, currentPeriodEnd, billingPeriod, pricePerPeriod, cancelAtPeriodEnd } =
    subscription;

  const renewalDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-amber-100 text-amber-800',
    canceled: 'bg-gray-100 text-gray-600',
    expired: 'bg-red-100 text-red-800',
    incomplete: 'bg-yellow-100 text-yellow-800',
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    trialing: 'Free Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    expired: 'Expired',
    incomplete: 'Incomplete',
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-gray-400" />
        Subscription
      </h2>

      {/* Plan & Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-900">{plan?.name || 'Aivo Plan'}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status || ''] || 'bg-gray-100 text-gray-600'}`}
        >
          {statusLabels[status || ''] || status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        {billingPeriod && (
          <div className="flex justify-between">
            <span>Billing</span>
            <span className="font-medium text-gray-900 capitalize">{billingPeriod}</span>
          </div>
        )}
        {pricePerPeriod != null && (
          <div className="flex justify-between">
            <span>Amount</span>
            <span className="font-medium text-gray-900">
              ${(pricePerPeriod / 100).toFixed(2)}/{billingPeriod === 'YEARLY' ? 'yr' : 'mo'}
            </span>
          </div>
        )}
        {renewalDate && (
          <div className="flex justify-between">
            <span>{cancelAtPeriodEnd ? 'Ends on' : 'Renews'}</span>
            <span className="font-medium text-gray-900">{renewalDate}</span>
          </div>
        )}
      </div>

      {cancelAtPeriodEnd && (
        <p className="text-xs text-amber-600 mb-3">
          Your subscription will not renew after the current period.
        </p>
      )}

      {/* Actions */}
      <button
        onClick={onManage}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Settings className="h-4 w-4" />
        Manage Subscription
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation('parent');
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | undefined>(undefined);

  // Billing
  const { data: subscription } = useSubscription();
  const createPortal = useCreateBillingPortal();

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
  const { data: weeklyReportData } = useWeeklyReport(selectedChildId, selectedWeekStart);
  const { data: enhancedChildren } = useChildrenEnhanced();

  // Mutations
  const downloadReport = useDownloadReport();
  const respondToRecommendation = useRespondToRecommendation();
  const updateDailyGoal = useUpdateDailyGoal();
  const dismissInsight = useDismissInsight();

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
    return <DashboardSkeleton />;
  }

  // Error state
  if (profileError) {
    return (
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
        <QueryErrorDisplay
          error={profileError}
          title="Unable to load dashboard"
          onRetry={() => {
            globalThis.location.reload();
          }}
        />
      </main>
    );
  }

  // Dev mode indicator
  const DevModeIndicator = () => null;

  const selectedChild = profile?.students?.find((s) => s.id === selectedChildId);

  // Transform enhanced children data for the new selector
  const enhancedChildrenData: ChildData[] =
    enhancedChildren?.map((child) => ({
      id: child.id,
      name: child.name,
      firstName: child.firstName,
      lastName: child.lastName,
      gradeLevel: child.grade,
      avatar: child.avatar,
      subjects: child.subjects,
      lastActive: child.lastActive,
      currentStreak: child.currentStreak,
      todayProgress: child.todayProgress,
      status: child.status,
    })) ||
    profile?.students?.map((s) => ({
      id: s.id,
      name: s.name || `${s.firstName} ${s.lastName}`,
      firstName: s.firstName,
      lastName: s.lastName,
      gradeLevel: s.grade,
      avatar: s.avatar,
      subjects: [],
      lastActive: new Date().toISOString(),
    })) ||
    [];

  const selectedEnhancedChild = enhancedChildrenData.find((c) => c.id === selectedChildId) || null;

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <DevModeIndicator />

      {/* Subscription Status Banner */}
      <SubscriptionBanner
        subscription={subscription}
        onUpgrade={() => {
          router.push('/pricing');
        }}
        onManage={() => {
          router.push('/billing');
        }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.title', 'Parent Dashboard')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('dashboard.welcome', {
              name: profile?.firstName,
              defaultValue: `Welcome back, ${profile?.firstName || 'Parent'}`,
            })}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-4">
          {/* Enhanced Child Selector (Sprint 5) */}
          {enhancedChildrenData.length > 0 ? (
            <EnhancedChildSelector
              students={enhancedChildrenData}
              selected={selectedEnhancedChild}
              onChange={(child) => {
                setSelectedChildId(child.id);
              }}
              onAddChild={() => {
                router.push('/onboarding/add-child');
              }}
              showStatus={true}
              showProgress={true}
            />
          ) : (
            <ChildSelector
              students={
                profile?.students?.map((s) => ({
                  id: s.id,
                  name: s.name || `${s.firstName} ${s.lastName}`,
                  grade: s.grade,
                  avatar: s.avatar,
                })) || []
              }
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          )}

          {/* Communication Button */}
          <button
            onClick={() => {
              router.push('/communication');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            aria-label="Communication & Progress"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Communication</span>
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
              {downloadReport.isPending
                ? 'Downloading...'
                : t('dashboard.downloadReport', 'Download Report')}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              router.push('/settings');
            }}
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
            <span className="text-gray-600">
              Loading {selectedChild?.name || 'student'}&apos;s data...
            </span>
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
            onClick={() => {
              router.push('/activity');
            }}
          />
          <ProgressCard
            icon={<BookOpen className="w-5 h-5" />}
            label={t('progress.activeDays', 'Active Days')}
            value={summary.activeDays}
            unit="/7"
            onClick={() => {
              router.push('/activity');
            }}
          />
          <ProgressCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('progress.avgScore', 'Avg. Score')}
            value={`${summary.averageScore}%`}
            trend={summary.scoreTrend}
            onClick={() => {
              router.push('/activity');
            }}
          />
          <ProgressCard
            icon={<CheckCircle className="w-5 h-5" />}
            label={t('progress.completed', 'Activities')}
            value={summary.activitiesCompleted}
            unit={t('progress.activities', 'completed')}
            onClick={() => {
              router.push('/activity');
            }}
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
              onViewAll={() => {
                router.push('/activity');
              }}
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
                onClick={() => {
                  router.push('/activity');
                }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                {t('dashboard.viewAll', 'View All')}
              </button>
            </div>
            {summary?.recentActivity && summary.recentActivity.length > 0 ? (
              <ActivityFeed
                activities={summary.recentActivity}
                onActivityClick={() => {
                  router.push('/activity');
                }}
                onViewAll={() => {
                  router.push('/activity');
                }}
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
                setSelectedWeekStart(new Date(weekStart));
              }}
              onDownload={handleDownloadReport}
              onShare={() => {
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
              dismissInsight.mutate({ insightId, studentId: selectedChildId || '' });
            }}
            onViewAllAnalysis={() => {
              router.push(`/insights?childId=${selectedChildId}`);
            }}
          />

          {/* Sprint 5: Upcoming Milestones */}
          {milestones && milestones.length > 0 && (
            <UpcomingMilestones
              milestones={milestones}
              onMilestoneClick={(milestone) => {
                router.push(`/achievements?milestone=${milestone.id}`);
              }}
              onViewAll={() => {
                router.push('/achievements');
              }}
            />
          )}

          {/* Sprint 5: Quick Actions */}
          {selectedChildId && (
            <QuickActions
              childId={selectedChildId}
              childName={selectedChild?.name || selectedEnhancedChild?.name}
              unreadMessages={messages?.filter((m) => m.unread).length || 0}
              pendingApprovals={recommendations?.length || 0}
              onDownloadReport={handleDownloadReport}
              onScheduleSession={() => {
                router.push('/settings?tab=schedule');
              }}
              onContactTeacher={() => {
                router.push('/messages/new');
              }}
            />
          )}

          {/* Subscription Status Card */}
          <SubscriptionStatusCard
            subscription={subscription}
            onManage={async () => {
              try {
                const session = await createPortal.mutateAsync({
                  returnUrl: window.location.href,
                });
                if (session?.url) {
                  window.location.href = session.url;
                }
              } catch {
                // Fallback to billing page
                router.push('/billing');
              }
            }}
            onUpgrade={() => {
              router.push('/pricing');
            }}
          />

          {/* Achievements */}
          {summary?.achievements && (
            <AchievementBadges
              achievements={summary.achievements}
              showLocked={true}
              maxDisplay={6}
              onViewAll={() => {
                router.push('/achievements');
              }}
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
                        assignment.dueIn <= 1
                          ? 'bg-red-500'
                          : assignment.dueIn <= 3
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-500">
                        {assignment.subject} - Due in {assignment.dueIn} day
                        {assignment.dueIn !== 1 ? 's' : ''}
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
