import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: { classId?: string };
}) {
  // In a real app, fetch the class info from API or context
  const classId = searchParams.classId || 'default-class';
  const className = 'Class Analytics'; // Fetch from API based on classId

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <AnalyticsDashboard classId={classId} className={className} />
    </div>
  );
}
