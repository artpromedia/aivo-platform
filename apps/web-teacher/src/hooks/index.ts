/**
 * Hooks Index
 */

export { useClasses, useClass, useClassAnalytics } from './use-classes';
export { useStudents, useStudent, useStudentProgress, useIEPGoals } from './use-students';
export { useAssignments, useAssignment, useSubmissions } from './use-assignments';
export { useGradebook } from './use-gradebook';

// Real-time hooks
export { useWebSocket, type ConnectionStatus, type WebSocketHook } from './use-websocket';
export {
  usePresence,
  type UserPresence,
  type UsePresenceOptions,
  type UsePresenceReturn,
} from './use-presence';
export {
  useLiveDashboard,
  type LiveSessionUpdate,
  type LiveAnalyticsUpdate,
  type LiveAlert,
  type UseLiveDashboardOptions,
  type UseLiveDashboardReturn,
} from './use-live-dashboard';

// Risk prediction hooks
export {
  useStudentRisk,
  useClassroomRisk,
  useRiskRealtime,
  type RiskLevel,
  type RiskTrend,
  type InterventionStatus,
  type RiskFactor,
  type ProtectiveFactor,
  type RiskPrediction,
  type InterventionRecommendation,
  type InterventionPlan,
  type ClassroomRiskSummary,
  type StudentRiskWithInterventions,
  type UseStudentRiskOptions,
  type UseStudentRiskResult,
  type UseClassroomRiskOptions,
  type UseClassroomRiskResult,
  type UseRiskRealtimeOptions,
} from './use-student-risk';

// Dashboard hooks
export {
  useDashboard,
  type UseDashboardOptions,
  type UseDashboardReturn,
} from './use-dashboard';
