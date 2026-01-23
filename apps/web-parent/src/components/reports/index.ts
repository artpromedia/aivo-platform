// Reports Components Index
// Sprint 7: Progress Reports Feature
// Updated Sprint 1.7: Connect Web Parent Reports to Real APIs

export { DetailedProgressReport } from './detailed-progress-report';
export { AssessmentHistory } from './assessment-history';
export { StrengthWeaknessAnalysis } from './strength-weakness-analysis';
export { TimeOnTaskReport } from './time-on-task-report';
export { SubjectMasteryReport } from './subject-mastery-report';
export { PDFExport } from './pdf-export';

// Sprint 1.7: New Visualization Components
export {
  ProgressChart,
  MiniProgressChart,
  ProgressLineChart,
} from './progress-chart';

export {
  SubjectBreakdown,
  SubjectDetailPanel,
  SubjectSummaryCard,
  SubjectSummaryGrid,
} from './subject-breakdown';

export {
  TimelineView,
  CompactTimeline,
} from './timeline-view';

// Sprint 1.7: Report Filters
export {
  ReportFilters,
  QuickDateSelector,
  getDateRangeFromPreset,
} from './report-filters';
export type { DateRangePreset, ReportType } from './report-filters';

// Type exports
export type {
  ProgressReportData,
  DetailedProgress,
  ProgressPeriod,
  AssessmentHistoryData,
  Assessment,
  StrengthWeaknessData,
  SkillAnalysis,
  SkillProfile,
  TimeOnTaskData,
  DailyTimeEntry,
  SubjectTimeEntry,
  ActivityTimeEntry,
  SubjectMasteryData,
  SubjectMastery,
  StandardMastery,
  DateRange,
  ChildInfo,
} from './types';
