'use client';

import { useState } from 'react';
import { useClassAnalytics, useClassPerformanceMetrics, useEngagementAnalytics } from '@/hooks/use-analytics';
import { PerformanceOverviewCard } from './performance-overview-card';
import { PerformanceDistributionChart } from './performance-distribution-chart';
import { SubjectBreakdownChart } from './subject-breakdown-chart';
import { StudentPerformanceTable } from './student-performance-table';
import { EngagementChart } from './engagement-chart';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import { exportAnalytics } from '@/lib/api/analytics-api';

interface AnalyticsDashboardProps {
  readonly classId: string;
  readonly className: string;
}

export function AnalyticsDashboard({ classId, className }: Readonly<AnalyticsDashboardProps>) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    dateFrom: dateRange.from?.toISOString(),
    dateTo: dateRange.to?.toISOString(),
  };

  const { data: classAnalytics, isLoading: analyticsLoading } = useClassAnalytics(classId, filters);
  const { data: performanceMetrics, isLoading: metricsLoading } = useClassPerformanceMetrics(classId, filters);
  const { data: engagementData, isLoading: engagementLoading } = useEngagementAnalytics(classId, filters);

  const handleExport = async (format: 'csv' | 'pdf' | 'xlsx') => {
    try {
      const blob = await exportAnalytics(classId, format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${className}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      console.error('Export failed:', error);
    }
  };

  const isLoading = analyticsLoading || metricsLoading || engagementLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">{className}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {classAnalytics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <PerformanceOverviewCard
                title="Class Average"
                value={`${classAnalytics.averageScore.toFixed(1)}%`}
                description="Overall class performance"
                trend={classAnalytics.averageScore >= 75 ? 'up' : 'down'}
              />
              <PerformanceOverviewCard
                title="Completion Rate"
                value={`${classAnalytics.completionRate.toFixed(1)}%`}
                description="Assignments completed"
                trend={classAnalytics.completionRate >= 80 ? 'up' : 'down'}
              />
              <PerformanceOverviewCard
                title="Engagement"
                value={`${classAnalytics.engagementRate.toFixed(1)}%`}
                description="Student engagement score"
                trend={classAnalytics.engagementRate >= 70 ? 'up' : 'down'}
              />
              <PerformanceOverviewCard
                title="At Risk"
                value={classAnalytics.atRiskStudents.toString()}
                description={`Out of ${classAnalytics.totalStudents} students`}
                trend={classAnalytics.atRiskStudents > 0 ? 'down' : 'stable'}
                alert={classAnalytics.atRiskStudents > 0}
              />
            </div>
          )}

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {classAnalytics && (
              <PerformanceDistributionChart data={classAnalytics.performanceDistribution} />
            )}
            {engagementData && (
              <EngagementChart data={engagementData.engagementByDay} />
            )}
          </div>

          {/* Subject Breakdown */}
          {classAnalytics?.subjectBreakdown && (
            <SubjectBreakdownChart subjects={classAnalytics.subjectBreakdown} />
          )}

          {/* Student Performance Table */}
          {performanceMetrics && (
            <StudentPerformanceTable
              students={performanceMetrics}
              classId={classId}
            />
          )}
        </>
      )}
    </div>
  );
}
