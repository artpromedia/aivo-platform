/**
 * Shared API response types for the web-learner app.
 *
 * These types define the contract between the frontend hooks
 * and the Next.js API routes that proxy to backend services.
 */

// ────────────────────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────────────────────

export interface ContinueLearningItem {
  id: string;
  courseId: string;
  title: string;
  courseName: string;
  progress: number;
  thumbnail: string;
  estimatedTime: string;
}

export interface DailyGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  emoji: string;
}

export interface AchievementSummary {
  id: string;
  title: string;
  emoji: string;
  earned: boolean;
}

export interface UpcomingItem {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  emoji: string;
}

export interface DashboardData {
  continueLearning: ContinueLearningItem[];
  dailyGoals: DailyGoal[];
  achievements: AchievementSummary[];
  upcoming: UpcomingItem[];
  streakDays: number;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  firstName: string;
}

// ────────────────────────────────────────────────────────────
// Courses
// ────────────────────────────────────────────────────────────

export interface CourseNextLesson {
  id: string;
  title: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  color: string;
  nextLesson: CourseNextLesson;
}

// ────────────────────────────────────────────────────────────
// Games
// ────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  plays: number;
  highScore: number;
  category: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  reward: number;
  timeLeft: string;
  completed: boolean;
}

export interface GamesData {
  games: Game[];
  dailyChallenge: DailyChallenge | null;
}

// ────────────────────────────────────────────────────────────
// Progress
// ────────────────────────────────────────────────────────────

export interface WeeklyStat {
  day: string;
  minutes: number;
  xp: number;
}

export interface SubjectProgress {
  subject: string;
  progress: number;
  color: string;
  lessons: number;
  total: number;
  mastery: number;
}

export interface Skill {
  skill: string;
  level: number;
  maxLevel: number;
  emoji: string;
}

export interface RecentActivity {
  id: number;
  type: string;
  title: string;
  xp: number;
  time: string;
  emoji: string;
}

export interface ProgressData {
  weeklyStats: WeeklyStat[];
  subjectProgress: SubjectProgress[];
  skills: Skill[];
  recentActivity: RecentActivity[];
  streakDays: number;
  lessonsCompleted: number;
}

// ────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────

export interface LearnerProfile {
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
  avatar: string;
  xp: number;
  level: number;
  streakDays: number;
  joinDate: string;
  learningStyle: string;
  interests: string[];
}

export interface ProfileStats {
  lessonsCompleted: number;
  quizzesPassed: number;
  hoursLearned: number;
  achievementsEarned: number;
}

export interface LearnerJourneyItem {
  date: string;
  event: string;
  emoji: string;
}

export interface ProfileData {
  learner: LearnerProfile;
  stats: ProfileStats;
  journey: LearnerJourneyItem[];
}

// ────────────────────────────────────────────────────────────
// Goals
// ────────────────────────────────────────────────────────────

export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type GoalDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL' | 'OTHER';

export interface Objective {
  id: string;
  description: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'MET';
  progressPercent: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  domain: GoalDomain;
  status: GoalStatus;
  targetDate: string;
  progressPercent: number;
  objectives: Objective[];
  emoji: string;
  streakDays: number;
  xpReward: number;
}

export interface CompletedGoal {
  id: string;
  title: string;
  domain: string;
  completedDate: string;
  xpEarned: number;
  emoji: string;
}

export interface GoalsData {
  active: Goal[];
  completed: CompletedGoal[];
  firstName: string;
}

// ────────────────────────────────────────────────────────────
// Assessments
// ────────────────────────────────────────────────────────────

export type AssessmentType = 'QUIZ' | 'TEST' | 'PRACTICE' | 'DIAGNOSTIC' | 'ASSIGNMENT';
export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'graded';
export type DifficultyLevel = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  subject: string;
  description: string;
  questionCount: number;
  timeLimit?: number;
  dueDate?: string;
  status: AssessmentStatus;
  score?: number;
  maxScore?: number;
  difficulty: DifficultyLevel;
  attempts: number;
  maxAttempts: number;
  emoji: string;
  xpReward: number;
}

export interface AssessmentsData {
  upcoming: Assessment[];
  completed: Assessment[];
  firstName: string;
}

// ────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────

export interface LearnerSettings {
  soundsEnabled: boolean;
  streakRemindersEnabled: boolean;
  achievementsEnabled: boolean;
  remindersEnabled: boolean;
  encouragementEnabled: boolean;
}
