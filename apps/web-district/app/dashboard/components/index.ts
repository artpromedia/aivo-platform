/**
 * Dashboard Components Index
 *
 * Export all dashboard components for easy imports
 */

export { CompliancePanel } from './compliance-panel';
export type { ComplianceItem, IEPComplianceStats } from './compliance-panel';
export { SchoolPerformanceGrid } from './school-performance-grid';
export type { School as PerformanceSchool } from './school-performance-grid';
export { DistrictOverview, type DistrictData, type SchoolSummary } from './district-overview';
export { SchoolHierarchy, type School as HierarchySchool } from './school-hierarchy';
export {
  CrossSchoolAnalytics,
  type SchoolAnalyticsData,
  type TimelineData,
  type CrossSchoolAnalyticsProps,
} from './cross-school-analytics';
export {
  ComplianceReports,
  type ComplianceReport,
  type ScheduledReport,
} from './compliance-reports';
export {
  ResourceAllocation,
  type SchoolResource,
  type ResourceRequest,
} from './resource-allocation';
