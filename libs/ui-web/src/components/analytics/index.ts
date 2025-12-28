// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS COMPONENTS MODULE
// Comprehensive analytics visualization components for education platforms
// ══════════════════════════════════════════════════════════════════════════════

// Base Dashboard Components
export {
  MetricCard,
  ProgressBar,
  MasteryLevel,
  AtRiskBadge,
  StudentProgressCard,
  ClassOverviewCard,
  Sparkline,
  DataTable,
  AnalyticsDashboard,
  type MetricCardProps,
  type ProgressBarProps,
  type MasteryLevelProps,
  type AtRiskBadgeProps,
  type StudentProgressCardProps,
  type ClassOverviewCardProps,
  type SparklineProps,
  type DataTableProps,
  type Column,
  type StudentMetricsSummary,
  type ClassMetricsSummary,
} from './analytics-dashboard';

// Chart Components
export {
  EngagementTrendChart,
  ScoreDistributionChart,
  SkillMasteryRadar,
  ActivityBreakdownPie,
  WeeklyActivityHeatmap,
  PerformanceComparisonChart,
  ProgressTimelineChart,
  SkillTreemapChart,
  ChartContainer,
  AnalyticsCharts,
  CHART_COLORS,
  type EngagementTrendChartProps,
  type ScoreDistributionChartProps,
  type SkillMasteryRadarProps,
  type ActivityBreakdownPieProps,
  type WeeklyActivityHeatmapProps,
  type PerformanceComparisonChartProps,
  type ProgressTimelineChartProps,
  type SkillTreemapChartProps,
  type ChartContainerProps,
  type TimeSeriesDataPoint,
  type CategoricalDataPoint,
  type RadarDataPoint,
  type HeatmapDataPoint,
} from './charts';

// Student Dashboard
export {
  StudentDashboard,
  type StudentDashboardProps,
  type StudentDashboardData,
  type StudentProfile,
  type StudentMetricsDetail,
  type EngagementDataPoint,
  type SkillMasteryData,
  type ActivityData,
  type ProgressDataPoint,
  type Achievement,
  type Recommendation,
} from './student-dashboard';

// Class Dashboard
export {
  ClassDashboard,
  type ClassDashboardProps,
  type ClassDashboardData,
  type ClassProfile,
  type ClassMetricsDetail,
  type SkillOverviewData,
  type AtRiskStudentDetail,
  type RiskFactor,
  type PerformanceComparisonData,
} from './class-dashboard';
