/**
 * Analytics API client for teacher data analytics
 * Provides access to student performance analytics and progress visualization
 */

const API_BASE_URL = 'http://localhost:8096/api/teacher/analytics';

export interface PerformanceMetrics {
  studentId: string;
  studentName: string;
  overallScore: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  averageGrade: number;
  attendanceRate: number;
  engagementScore: number;
  improvementTrend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface SubjectPerformance {
  subject: string;
  averageScore: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  skillAreas: SkillAreaPerformance[];
  trend: number[]; // Last 10 scores
}

export interface SkillAreaPerformance {
  skillArea: string;
  mastery: number; // 0-100
  attemptsCount: number;
  lastAttempt: string;
}

export interface ClassAnalytics {
  classId: string;
  className: string;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  engagementRate: number;
  atRiskStudents: number;
  topPerformers: number;
  subjectBreakdown: SubjectPerformance[];
  performanceDistribution: {
    excellent: number; // 90-100
    good: number; // 80-89
    satisfactory: number; // 70-79
    needsImprovement: number; // <70
  };
}

export interface StudentProgressData {
  studentId: string;
  studentName: string;
  timeline: {
    date: string;
    score: number;
    assignment: string;
    subject: string;
  }[];
  milestones: {
    id: string;
    title: string;
    achievedDate: string;
    category: string;
  }[];
  strengths: string[];
  areasForImprovement: string[];
}

export interface ComparisonData {
  studentId: string;
  studentName: string;
  classAverage: number;
  studentAverage: number;
  subjects: {
    subject: string;
    studentScore: number;
    classAverage: number;
    percentile: number;
  }[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
  metric: string;
}

export interface AnalyticsFilters {
  classId?: string;
  studentIds?: string[];
  subjectIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  metricType?: 'performance' | 'engagement' | 'attendance' | 'improvement';
}

/**
 * Get performance metrics for all students in a class
 */
export async function getClassPerformanceMetrics(
  classId: string,
  filters?: AnalyticsFilters
): Promise<PerformanceMetrics[]> {
  const params = new URLSearchParams({ classId });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/class-performance?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch class performance metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get detailed analytics for a specific class
 */
export async function getClassAnalytics(
  classId: string,
  filters?: AnalyticsFilters
): Promise<ClassAnalytics> {
  const params = new URLSearchParams({ classId });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/class-analytics?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch class analytics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get individual student performance by subject
 */
export async function getStudentSubjectPerformance(
  studentId: string,
  filters?: AnalyticsFilters
): Promise<SubjectPerformance[]> {
  const params = new URLSearchParams({ studentId });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/student-subject-performance?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch student subject performance: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get student progress timeline data
 */
export async function getStudentProgress(
  studentId: string,
  filters?: AnalyticsFilters
): Promise<StudentProgressData> {
  const params = new URLSearchParams({ studentId });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/student-progress?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch student progress: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get comparison data for a student vs class averages
 */
export async function getStudentComparison(
  studentId: string,
  classId: string
): Promise<ComparisonData> {
  const params = new URLSearchParams({ studentId, classId });
  const response = await fetch(`${API_BASE_URL}/student-comparison?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch student comparison: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get time series data for specific metrics
 */
export async function getTimeSeriesData(
  classId: string,
  metricType: string,
  filters?: AnalyticsFilters
): Promise<TimeSeriesData[]> {
  const params = new URLSearchParams({ classId, metricType });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/time-series?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch time series data: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get engagement analytics for a class
 */
export async function getEngagementAnalytics(
  classId: string,
  filters?: AnalyticsFilters
): Promise<{
  averageEngagement: number;
  participationRate: number;
  activeStudents: number;
  inactiveStudents: number;
  engagementByDay: { day: string; engagement: number }[];
  topEngagedStudents: { studentId: string; name: string; score: number }[];
}> {
  const params = new URLSearchParams({ classId });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/engagement?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch engagement analytics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Export analytics data as CSV
 */
export async function exportAnalytics(
  classId: string,
  format: 'csv' | 'pdf' | 'xlsx',
  filters?: AnalyticsFilters
): Promise<Blob> {
  const params = new URLSearchParams({ classId, format });
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await fetch(`${API_BASE_URL}/export?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to export analytics: ${response.statusText}`);
  }
  return response.blob();
}
