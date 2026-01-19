/**
 * Type definitions for Progress Reports
 * Sprint 7: Progress Reports Feature
 */

export interface ProgressReportData {
  progress: DetailedProgress;
  assessments: AssessmentHistoryData;
  analysis: StrengthWeaknessData;
  timeOnTask: TimeOnTaskData;
  mastery: SubjectMasteryData;
}

export interface DetailedProgress {
  overallScore: number;
  overallTrend: 'up' | 'down' | 'stable';
  lessonsCompleted: number;
  totalLessons: number;
  averageSessionTime: number;
  totalLearningTime: number;
  streak: {
    current: number;
    longest: number;
  };
  gradeLevel: {
    current: string;
    progress: number;
  };
  periods: ProgressPeriod[];
}

export interface ProgressPeriod {
  label: string;
  score: number;
  lessonsCompleted: number;
  timeSpent: number;
  startDate: string;
  endDate: string;
}

export interface AssessmentHistoryData {
  assessments: Assessment[];
  summary: {
    totalAssessments: number;
    averageScore: number;
    passRate: number;
    improvementTrend: 'up' | 'down' | 'stable';
  };
}

export interface Assessment {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'test' | 'practice' | 'benchmark';
  score: number;
  maxScore: number;
  percentile?: number;
  completedAt: string;
  timeSpent: number;
  questionCount: number;
  correctAnswers: number;
  topics: string[];
  grade?: string;
}

export interface StrengthWeaknessData {
  strengths: SkillAnalysis[];
  weaknesses: SkillAnalysis[];
  recommendations: string[];
  learningStyle: {
    primary: string;
    secondary: string;
    description: string;
  };
  skillsProfile: SkillProfile[];
}

export interface SkillAnalysis {
  skill: string;
  subject: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  evidence: string[];
}

export interface SkillProfile {
  category: string;
  score: number;
  maxScore: number;
  subSkills: {
    name: string;
    score: number;
    maxScore: number;
  }[];
}

export interface TimeOnTaskData {
  totalMinutes: number;
  dailyAverage: number;
  weeklyAverage: number;
  mostProductiveTime: string;
  sessionStats: {
    averageLength: number;
    longestSession: number;
    sessionsThisWeek: number;
  };
  dailyBreakdown: DailyTimeEntry[];
  subjectBreakdown: SubjectTimeEntry[];
  activityBreakdown: ActivityTimeEntry[];
}

export interface DailyTimeEntry {
  date: string;
  day: string;
  totalMinutes: number;
  learningMinutes: number;
  practiceMinutes: number;
  assessmentMinutes: number;
}

export interface SubjectTimeEntry {
  subject: string;
  totalMinutes: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ActivityTimeEntry {
  activity: string;
  minutes: number;
  percentage: number;
  color: string;
}

export interface SubjectMasteryData {
  subjects: SubjectMastery[];
  overallMasteryLevel: number;
  masteredSkills: number;
  inProgressSkills: number;
  totalSkills: number;
}

export interface SubjectMastery {
  subject: string;
  masteryLevel: number;
  grade: string;
  trend: 'up' | 'down' | 'stable';
  standards: StandardMastery[];
  recentLessons: {
    title: string;
    score: number;
    completedAt: string;
  }[];
  nextMilestone: {
    name: string;
    progress: number;
    target: number;
  };
}

export interface StandardMastery {
  code: string;
  name: string;
  mastery: 'mastered' | 'proficient' | 'developing' | 'beginning';
  progress: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ChildInfo {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  grade: string;
  avatar?: string;
}
