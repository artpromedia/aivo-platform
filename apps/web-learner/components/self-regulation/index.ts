/**
 * Self-Regulation Components
 * Export all self-regulation related components
 */

// Main hub component
export { SelfRegulationHub } from './SelfRegulationHub';

// Individual components
export { EmotionCheckIn } from './EmotionCheckIn';
export { CalmingSpace } from './CalmingSpace';
export { RegulationActivity } from './RegulationActivity';
export { BreathingExercise } from './BreathingExercise';
export { GroundingExercise } from './GroundingExercise';
export { MovementBreak } from './MovementBreak';

// Re-export types for convenience
export type {
  GradeBand,
  ActivityType,
  ActivityRecommendation,
  EmotionCheckInData,
  BreathingPattern,
  BreathPhase,
  GroundingStep,
  MovementStep,
  RegulationActivityData,
  RegulationActivityProps,
  CalmingActivity,
  CalmingActivityType,
} from '@/lib/self-regulation/regulation-types';
