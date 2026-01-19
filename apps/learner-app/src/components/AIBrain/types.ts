/**
 * AIBrain Component Types
 */

export interface BrainVisualizationProps {
  learnerId: string;
  showDetails?: boolean;
  className?: string;
}

export interface MasteryMeterProps {
  subject: string;
  currentLevel: number;
  targetLevel: number;
  streak?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export interface RecommendationCardProps {
  type: 'practice' | 'review' | 'challenge' | 'explore';
  subject: string;
  reason: string;
  estimatedTime: number;
  priority: number;
  currentMastery?: number;
  suggestedDifficulty?: string;
  onStart?: () => void;
  className?: string;
}

export interface BrainInsightsCardProps {
  learnerId: string;
  compact?: boolean;
  className?: string;
}

export interface LearningStreakProps {
  currentStreak: number;
  bestStreak: number;
  className?: string;
}

export interface SubjectMasteryGridProps {
  masteryLevels: Record<string, {
    current_level: number;
    target_level: number;
    streak: number;
  }>;
  onSubjectClick?: (subject: string) => void;
  className?: string;
}

// Subject configuration
export const SUBJECT_CONFIG: Record<string, { emoji: string; name: string; color: string }> = {
  MATH: { emoji: '🔢', name: 'Math', color: 'from-blue-400 to-blue-600' },
  ELA: { emoji: '📚', name: 'Reading & Writing', color: 'from-purple-400 to-purple-600' },
  reading: { emoji: '📖', name: 'Reading', color: 'from-indigo-400 to-indigo-600' },
  writing: { emoji: '✏️', name: 'Writing', color: 'from-violet-400 to-violet-600' },
  math: { emoji: '➕', name: 'Math', color: 'from-sky-400 to-sky-600' },
  SPEECH: { emoji: '🎤', name: 'Speaking', color: 'from-pink-400 to-pink-600' },
  SEL: { emoji: '💖', name: 'Social & Emotional', color: 'from-red-400 to-red-600' },
  SPELLING: { emoji: '🐝', name: 'Spelling', color: 'from-yellow-400 to-yellow-600' },
  CREATIVE_WRITING: { emoji: '✨', name: 'Creative Writing', color: 'from-teal-400 to-teal-600' },
  LIFE_SKILLS: { emoji: '🌟', name: 'Life Skills', color: 'from-green-400 to-green-600' },
  science: { emoji: '🔬', name: 'Science', color: 'from-emerald-400 to-emerald-600' },
  social_studies: { emoji: '🌍', name: 'Social Studies', color: 'from-amber-400 to-amber-600' },
};

export function getSubjectConfig(subject: string) {
  return SUBJECT_CONFIG[subject] || {
    emoji: '📘',
    name: subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' '),
    color: 'from-gray-400 to-gray-600',
  };
}

// Recommendation type configuration
export const RECOMMENDATION_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  practice: { emoji: '💪', label: 'Practice', color: 'bg-blue-500' },
  review: { emoji: '🔄', label: 'Review', color: 'bg-purple-500' },
  challenge: { emoji: '🏆', label: 'Challenge', color: 'bg-orange-500' },
  explore: { emoji: '🚀', label: 'Explore', color: 'bg-teal-500' },
};
