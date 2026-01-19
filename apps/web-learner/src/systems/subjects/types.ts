// =============================================================================
// Subject System Types
// =============================================================================

// Grade Levels
export type GradeLevel = 'K5' | 'MS' | 'HS';

export const GRADE_LEVEL_INFO: Record<GradeLevel, { name: string; range: string; theme: string }> = {
  K5: { name: 'Elementary', range: 'K-5', theme: 'explorer' },
  MS: { name: 'Middle School', range: '6-8', theme: 'navigator' },
  HS: { name: 'High School', range: '9-12', theme: 'innovator' },
};

// =============================================================================
// Subject Definitions
// =============================================================================

export interface SubjectInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  gradeLevel: GradeLevel;
  category: SubjectCategory;
  prerequisites?: string[];
  standards?: string[];
}

export type SubjectCategory =
  | 'math'
  | 'ela'
  | 'science'
  | 'social_studies'
  | 'arts'
  | 'technology'
  | 'life_skills'
  | 'sel';

// K-5 Subjects
export const K5_SUBJECTS: SubjectInfo[] = [
  { id: 'k5-math', name: 'Math', emoji: '🔢', description: 'Numbers, shapes, and problem-solving', color: 'from-blue-400 to-blue-600', gradeLevel: 'K5', category: 'math' },
  { id: 'k5-reading', name: 'Reading', emoji: '📖', description: 'Reading adventures and comprehension', color: 'from-purple-400 to-purple-600', gradeLevel: 'K5', category: 'ela' },
  { id: 'k5-writing', name: 'Writing', emoji: '✏️', description: 'Express your ideas through writing', color: 'from-pink-400 to-pink-600', gradeLevel: 'K5', category: 'ela' },
  { id: 'k5-science', name: 'Science', emoji: '🔬', description: 'Explore the world around you', color: 'from-green-400 to-green-600', gradeLevel: 'K5', category: 'science' },
  { id: 'k5-social', name: 'Social Studies', emoji: '🌍', description: 'Communities and the world', color: 'from-amber-400 to-amber-600', gradeLevel: 'K5', category: 'social_studies' },
  { id: 'k5-art', name: 'Art', emoji: '🎨', description: 'Creative expression and design', color: 'from-rose-400 to-rose-600', gradeLevel: 'K5', category: 'arts' },
  { id: 'k5-sel', name: 'Social & Emotional', emoji: '❤️', description: 'Feelings and friendships', color: 'from-red-400 to-red-600', gradeLevel: 'K5', category: 'sel' },
  { id: 'k5-life', name: 'Life Skills', emoji: '🌟', description: 'Everyday skills for success', color: 'from-orange-400 to-orange-600', gradeLevel: 'K5', category: 'life_skills' },
];

// Middle School Subjects
export const MS_SUBJECTS: SubjectInfo[] = [
  { id: 'ms-pre-algebra', name: 'Pre-Algebra', emoji: '🧮', description: 'Foundation for algebraic thinking', color: 'from-blue-500 to-indigo-600', gradeLevel: 'MS', category: 'math' },
  { id: 'ms-algebra', name: 'Algebra I', emoji: '📐', description: 'Equations, functions, and graphing', color: 'from-blue-600 to-purple-600', gradeLevel: 'MS', category: 'math' },
  { id: 'ms-geometry', name: 'Geometry', emoji: '📏', description: 'Shapes, angles, and proofs', color: 'from-cyan-500 to-blue-600', gradeLevel: 'MS', category: 'math' },
  { id: 'ms-ela', name: 'English Language Arts', emoji: '📚', description: 'Literature and writing skills', color: 'from-purple-500 to-pink-600', gradeLevel: 'MS', category: 'ela' },
  { id: 'ms-life-science', name: 'Life Science', emoji: '🧬', description: 'Biology and living systems', color: 'from-green-500 to-emerald-600', gradeLevel: 'MS', category: 'science' },
  { id: 'ms-earth-science', name: 'Earth Science', emoji: '🌋', description: 'Geology and earth systems', color: 'from-amber-500 to-orange-600', gradeLevel: 'MS', category: 'science' },
  { id: 'ms-history', name: 'World History', emoji: '🏛️', description: 'Civilizations and global events', color: 'from-yellow-500 to-amber-600', gradeLevel: 'MS', category: 'social_studies' },
  { id: 'ms-civics', name: 'Civics', emoji: '⚖️', description: 'Government and citizenship', color: 'from-slate-500 to-slate-700', gradeLevel: 'MS', category: 'social_studies' },
];

// High School Subjects
export const HS_SUBJECTS: SubjectInfo[] = [
  { id: 'hs-algebra2', name: 'Algebra II', emoji: '📈', description: 'Advanced algebraic concepts', color: 'from-blue-600 to-violet-700', gradeLevel: 'HS', category: 'math' },
  { id: 'hs-calculus', name: 'Calculus', emoji: '∫', description: 'Limits, derivatives, and integrals', color: 'from-violet-600 to-purple-700', gradeLevel: 'HS', category: 'math', prerequisites: ['hs-algebra2'] },
  { id: 'hs-statistics', name: 'Statistics', emoji: '📊', description: 'Data analysis and probability', color: 'from-cyan-600 to-blue-700', gradeLevel: 'HS', category: 'math' },
  { id: 'hs-english', name: 'English', emoji: '📜', description: 'Literature and composition', color: 'from-purple-600 to-fuchsia-700', gradeLevel: 'HS', category: 'ela' },
  { id: 'hs-biology', name: 'Biology', emoji: '🦠', description: 'Life processes and organisms', color: 'from-green-600 to-teal-700', gradeLevel: 'HS', category: 'science' },
  { id: 'hs-chemistry', name: 'Chemistry', emoji: '⚗️', description: 'Matter and chemical reactions', color: 'from-orange-600 to-red-700', gradeLevel: 'HS', category: 'science' },
  { id: 'hs-physics', name: 'Physics', emoji: '⚡', description: 'Forces, energy, and motion', color: 'from-yellow-500 to-orange-600', gradeLevel: 'HS', category: 'science' },
  { id: 'hs-us-history', name: 'US History', emoji: '🗽', description: 'American history and government', color: 'from-red-600 to-rose-700', gradeLevel: 'HS', category: 'social_studies' },
  { id: 'hs-economics', name: 'Economics', emoji: '💰', description: 'Economic systems and principles', color: 'from-emerald-600 to-green-700', gradeLevel: 'HS', category: 'social_studies' },
  { id: 'hs-computer-science', name: 'Computer Science', emoji: '💻', description: 'Programming and algorithms', color: 'from-slate-600 to-zinc-800', gradeLevel: 'HS', category: 'technology' },
];

// All subjects by grade level
export const SUBJECTS_BY_GRADE: Record<GradeLevel, SubjectInfo[]> = {
  K5: K5_SUBJECTS,
  MS: MS_SUBJECTS,
  HS: HS_SUBJECTS,
};

// =============================================================================
// Lesson Types
// =============================================================================

export interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  orderIndex: number;
  durationMinutes: number;
  type: LessonType;
  objectives: string[];
  content: LessonContent;
  assessmentId?: string;
}

export type LessonType =
  | 'video'
  | 'reading'
  | 'interactive'
  | 'practice'
  | 'game'
  | 'project'
  | 'assessment';

export interface LessonContent {
  type: LessonType;
  videoUrl?: string;
  readingText?: string;
  interactiveElements?: InteractiveElement[];
  practiceProblems?: PracticeProblem[];
  gameConfig?: GameConfig;
}

export interface InteractiveElement {
  id: string;
  type: 'drag-drop' | 'fill-blank' | 'sort' | 'match' | 'draw' | 'click';
  data: Record<string, unknown>;
}

export interface PracticeProblem {
  id: string;
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'numeric';
  options?: string[];
  correctAnswer: string | number;
  hints?: string[];
  explanation?: string;
}

export interface GameConfig {
  gameId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  parameters?: Record<string, unknown>;
}

// =============================================================================
// Progress Tracking
// =============================================================================

export interface SubjectProgress {
  subjectId: string;
  learnerId: string;
  lessonsCompleted: number;
  totalLessons: number;
  overallProgress: number; // 0-100
  currentLessonId?: string;
  scores: LessonScore[];
  timeSpentMinutes: number;
  lastAccessedAt: string;
  masteryLevel: MasteryLevel;
}

export interface LessonScore {
  lessonId: string;
  score: number; // 0-100
  completedAt: string;
  attempts: number;
}

export type MasteryLevel = 'not_started' | 'in_progress' | 'proficient' | 'mastered';

// =============================================================================
// Personalization
// =============================================================================

export interface PersonalizedContent {
  subject: SubjectInfo;
  lessons: Lesson[];
  recommendations: ContentRecommendation[];
  adaptations: LearningAdaptation[];
}

export interface ContentRecommendation {
  type: 'lesson' | 'practice' | 'review' | 'enrichment';
  lessonId: string;
  title: string;
  reason: string;
  priority: number;
}

export interface LearningAdaptation {
  type: 'pace' | 'difficulty' | 'format' | 'support';
  setting: string;
  value: string | number | boolean;
}
