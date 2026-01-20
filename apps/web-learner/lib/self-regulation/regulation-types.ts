/**
 * Self-Regulation Types
 * TypeScript definitions for emotion tracking and regulation activities
 */

// ============================================================================
// Grade Band Types
// ============================================================================

export type GradeBand = 'K5' | 'G6_8' | 'G9_12';

// ============================================================================
// Emotion Types
// ============================================================================

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
  category: EmotionCategory;
  intensity: number; // 1-5
  color: string;
}

export type EmotionCategory = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface EmotionCheckInData {
  id?: string;
  learnerId: string;
  emotion: string;
  emoji: string;
  intensity: number; // 1-5
  energyLevel?: number; // 1-5
  context?: string;
  trigger?: string;
  notes?: string;
  timestamp: string;
  needsSupport?: boolean;
}

export interface EmotionHistory {
  checkIns: EmotionCheckInData[];
  pagination: PaginationData;
}

export interface MoodTrend {
  date: string;
  mood: number;
  energy: number;
}

export interface MoodTrendsReport {
  period: {
    days: number;
    since: string;
  };
  totalCheckIns: number;
  averageMood: number;
  averageEnergy: number;
  topEmotions: Array<{ emotion: string; count: number }>;
  dataPoints: MoodTrend[];
}

// ============================================================================
// Activity Types
// ============================================================================

export type ActivityType =
  | 'breathing'
  | 'grounding'
  | 'movement'
  | 'visualization'
  | 'sensory'
  | 'sounds'
  | 'counting'
  | 'progressive';

export type ActivityDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ActivityStep {
  stepNumber: number;
  instruction: string;
  durationSeconds: number;
  visualCue?: string;
  audioFileName?: string;
  isTransition?: boolean;
  animationData?: Record<string, unknown>;
}

export interface RegulationActivityData {
  id: string;
  name: string;
  description: string;
  activityType: ActivityType;
  difficulty: ActivityDifficulty;
  estimatedDurationSeconds: number;
  gradeBands: GradeBand[];
  steps: ActivityStep[];
  iconAsset?: string;
  tags: string[];
  requiresAudio?: boolean;
  requiresVisual?: boolean;
  audioAssetId?: string;
  visualAssetId?: string;
  thumbnailUrl?: string;
  customData?: Record<string, unknown>;
}

export interface RegulationActivityProps {
  activityType: ActivityType;
  title: string;
  description: string;
  estimatedDurationSeconds: number;
  gradeBand: GradeBand;
  onComplete: (rating?: number) => void;
  onCancel?: () => void;
}

// ============================================================================
// Breathing Exercise Types
// ============================================================================

export type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export interface BreathingPattern {
  id: string;
  name: string;
  description: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  shape: 'circle' | 'square' | 'wave';
  gradeBands: GradeBand[];
}

export interface BreathingExerciseProps {
  pattern: BreathingPattern;
  onComplete: () => void;
  onCancel?: () => void;
  showAudioGuidance?: boolean;
}

// ============================================================================
// Grounding Exercise Types
// ============================================================================

export type GroundingSense = 'see' | 'touch' | 'hear' | 'smell' | 'taste';

export interface GroundingStep {
  sense: GroundingSense;
  count: number;
  instruction: string;
  emoji: string;
  color: string;
  examples: string[];
}

export interface GroundingExerciseProps {
  onComplete: () => void;
  onCancel?: () => void;
  gradeBand: GradeBand;
}

// ============================================================================
// Movement Break Types
// ============================================================================

export interface MovementStep {
  id: string;
  name: string;
  instruction: string;
  durationSeconds: number;
  animationType: 'bounce' | 'stretch' | 'shake' | 'rotate' | 'breathe';
  seatedAlternative?: string;
  gifUrl?: string;
}

export interface MovementBreakProps {
  movements: MovementStep[];
  onComplete: () => void;
  onCancel?: () => void;
  gradeBand: GradeBand;
}

// ============================================================================
// Session Types
// ============================================================================

export interface RegulationSession {
  id: string;
  learnerId: string;
  activityId: string;
  activityType: ActivityType;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  completed: boolean;
  stoppedAtStep?: number;
  moodBefore?: number;
  moodAfter?: number;
  rating?: number;
  feedback?: string;
}

export interface RegulationSessionInput {
  learnerId: string;
  activityId: string;
  activityType: ActivityType;
  moodBefore?: number;
}

export interface RegulationSessionUpdate {
  completed: boolean;
  stoppedAtStep?: number;
  moodAfter?: number;
  rating?: number;
  feedback?: string;
}

// ============================================================================
// Recommendation Types
// ============================================================================

export interface ActivityRecommendation {
  activity: RegulationActivityData;
  reason: string;
  priority: number;
}

export interface RecommendationParams {
  learnerId: string;
  currentMood?: string;
  currentEnergy?: number;
  recentEmotions?: string[];
  limit?: number;
}

// ============================================================================
// Calming Space Types
// ============================================================================

export type CalmingActivityType =
  | 'breathing'
  | 'grounding'
  | 'sounds'
  | 'visuals'
  | 'movement';

export interface CalmingActivity {
  id: string;
  name: string;
  type: CalmingActivityType;
  description: string;
  emoji: string;
  duration: string;
  gradeBands: GradeBand[];
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationData {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationData;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Component State Types
// ============================================================================

export interface EmotionCheckInState {
  selectedEmotion: string | null;
  selectedEmoji: string;
  intensity: number;
  energyLevel: number;
  selectedTrigger: string | null;
  notes: string;
  needsSupport: boolean;
}

export interface CalmingSpaceState {
  lowStimulationMode: boolean;
  selectedActivity: CalmingActivity | null;
  timerDuration: number;
  isPlaying: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const EMOTION_OPTIONS = {
  K5: [
    { id: 'happy', name: 'Happy', emoji: '😊', category: 'positive' as const, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'sad', name: 'Sad', emoji: '😢', category: 'negative' as const, color: 'bg-blue-100 text-blue-800' },
    { id: 'angry', name: 'Angry', emoji: '😠', category: 'negative' as const, color: 'bg-red-100 text-red-800' },
    { id: 'scared', name: 'Scared', emoji: '😨', category: 'negative' as const, color: 'bg-purple-100 text-purple-800' },
    { id: 'calm', name: 'Calm', emoji: '😌', category: 'positive' as const, color: 'bg-green-100 text-green-800' },
    { id: 'excited', name: 'Excited', emoji: '🤩', category: 'positive' as const, color: 'bg-orange-100 text-orange-800' },
    { id: 'tired', name: 'Tired', emoji: '😴', category: 'neutral' as const, color: 'bg-slate-100 text-slate-800' },
    { id: 'worried', name: 'Worried', emoji: '😟', category: 'negative' as const, color: 'bg-amber-100 text-amber-800' },
  ],
  G6_8: [
    { id: 'happy', name: 'Happy', emoji: '😊', category: 'positive' as const, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'sad', name: 'Sad', emoji: '😢', category: 'negative' as const, color: 'bg-blue-100 text-blue-800' },
    { id: 'angry', name: 'Angry', emoji: '😠', category: 'negative' as const, color: 'bg-red-100 text-red-800' },
    { id: 'anxious', name: 'Anxious', emoji: '😰', category: 'negative' as const, color: 'bg-purple-100 text-purple-800' },
    { id: 'calm', name: 'Calm', emoji: '😌', category: 'positive' as const, color: 'bg-green-100 text-green-800' },
    { id: 'frustrated', name: 'Frustrated', emoji: '😤', category: 'negative' as const, color: 'bg-orange-100 text-orange-800' },
    { id: 'overwhelmed', name: 'Overwhelmed', emoji: '😵', category: 'negative' as const, color: 'bg-red-100 text-red-800' },
    { id: 'confident', name: 'Confident', emoji: '😎', category: 'positive' as const, color: 'bg-indigo-100 text-indigo-800' },
    { id: 'bored', name: 'Bored', emoji: '😑', category: 'neutral' as const, color: 'bg-slate-100 text-slate-800' },
    { id: 'hopeful', name: 'Hopeful', emoji: '🌟', category: 'positive' as const, color: 'bg-amber-100 text-amber-800' },
  ],
  G9_12: [
    { id: 'content', name: 'Content', emoji: '😊', category: 'positive' as const, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'melancholy', name: 'Melancholy', emoji: '😔', category: 'negative' as const, color: 'bg-blue-100 text-blue-800' },
    { id: 'irritated', name: 'Irritated', emoji: '😒', category: 'negative' as const, color: 'bg-red-100 text-red-800' },
    { id: 'anxious', name: 'Anxious', emoji: '😰', category: 'negative' as const, color: 'bg-purple-100 text-purple-800' },
    { id: 'peaceful', name: 'Peaceful', emoji: '😌', category: 'positive' as const, color: 'bg-green-100 text-green-800' },
    { id: 'stressed', name: 'Stressed', emoji: '😫', category: 'negative' as const, color: 'bg-orange-100 text-orange-800' },
    { id: 'overwhelmed', name: 'Overwhelmed', emoji: '😵', category: 'negative' as const, color: 'bg-red-100 text-red-800' },
    { id: 'motivated', name: 'Motivated', emoji: '💪', category: 'positive' as const, color: 'bg-indigo-100 text-indigo-800' },
    { id: 'apathetic', name: 'Apathetic', emoji: '😐', category: 'neutral' as const, color: 'bg-slate-100 text-slate-800' },
    { id: 'grateful', name: 'Grateful', emoji: '🙏', category: 'positive' as const, color: 'bg-amber-100 text-amber-800' },
    { id: 'lonely', name: 'Lonely', emoji: '😞', category: 'negative' as const, color: 'bg-indigo-100 text-indigo-800' },
    { id: 'inspired', name: 'Inspired', emoji: '✨', category: 'positive' as const, color: 'bg-pink-100 text-pink-800' },
  ],
};

export const COMMON_TRIGGERS = {
  K5: [
    'Schoolwork',
    'Friends',
    'Family',
    'Tired',
    'Hungry',
    'Loud noises',
    'Change in routine',
    'Something else',
  ],
  G6_8: [
    'Schoolwork',
    'Tests/Grades',
    'Social situations',
    'Family',
    'Sleep',
    'Friends',
    'Sports/Activities',
    'Technology/Social media',
    'Change',
    'Something else',
  ],
  G9_12: [
    'Academic pressure',
    'Exams/Deadlines',
    'Social dynamics',
    'Family relationships',
    'Sleep deprivation',
    'Future uncertainty',
    'Peer pressure',
    'Social media',
    'Work/Responsibilities',
    'Relationships',
    'Self-image',
    'Something else',
  ],
};

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Breathe in a square pattern - equal counts for each phase',
    inhaleSeconds: 4,
    holdInSeconds: 4,
    exhaleSeconds: 4,
    holdOutSeconds: 4,
    cycles: 4,
    shape: 'square',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
  {
    id: '4-7-8',
    name: '4-7-8 Breathing',
    description: 'Relaxing breath pattern for calming anxiety',
    inhaleSeconds: 4,
    holdInSeconds: 7,
    exhaleSeconds: 8,
    holdOutSeconds: 0,
    cycles: 4,
    shape: 'wave',
    gradeBands: ['G6_8', 'G9_12'],
  },
  {
    id: 'belly',
    name: 'Belly Breathing',
    description: 'Deep breathing focusing on your belly rising and falling',
    inhaleSeconds: 4,
    holdInSeconds: 2,
    exhaleSeconds: 6,
    holdOutSeconds: 0,
    cycles: 5,
    shape: 'circle',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
  {
    id: 'star',
    name: 'Star Breathing',
    description: 'Trace a star shape while breathing - great for younger learners',
    inhaleSeconds: 3,
    holdInSeconds: 1,
    exhaleSeconds: 3,
    holdOutSeconds: 1,
    cycles: 5,
    shape: 'circle',
    gradeBands: ['K5'],
  },
];

export const GROUNDING_STEPS: GroundingStep[] = [
  {
    sense: 'see',
    count: 5,
    instruction: 'Look around and name 5 things you can SEE',
    emoji: '👀',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    examples: ['A chair', 'The ceiling', 'Your shoes', 'A window', 'A pencil'],
  },
  {
    sense: 'touch',
    count: 4,
    instruction: 'Notice 4 things you can TOUCH or FEEL',
    emoji: '✋',
    color: 'bg-green-100 text-green-800 border-green-200',
    examples: ['Your clothes', 'The desk', 'Your hair', 'The floor'],
  },
  {
    sense: 'hear',
    count: 3,
    instruction: 'Listen for 3 things you can HEAR',
    emoji: '👂',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    examples: ['The AC', 'Birds outside', 'Your breathing'],
  },
  {
    sense: 'smell',
    count: 2,
    instruction: 'Notice 2 things you can SMELL',
    emoji: '👃',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    examples: ['Fresh air', 'Your lunch'],
  },
  {
    sense: 'taste',
    count: 1,
    instruction: 'Notice 1 thing you can TASTE',
    emoji: '👅',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    examples: ['Water', 'Your last snack'],
  },
];

export const DEFAULT_MOVEMENTS: MovementStep[] = [
  {
    id: 'shoulder-roll',
    name: 'Shoulder Rolls',
    instruction: 'Roll your shoulders in circles - forward, then backward',
    durationSeconds: 15,
    animationType: 'rotate',
    seatedAlternative: 'Same movement works seated!',
  },
  {
    id: 'neck-stretch',
    name: 'Neck Stretches',
    instruction: 'Slowly tilt your head to each side, holding for a few seconds',
    durationSeconds: 20,
    animationType: 'stretch',
    seatedAlternative: 'Same movement works seated!',
  },
  {
    id: 'arm-stretch',
    name: 'Arm Reaches',
    instruction: 'Reach both arms up high, then stretch to each side',
    durationSeconds: 15,
    animationType: 'stretch',
    seatedAlternative: 'Reach up while staying seated',
  },
  {
    id: 'shake-it-out',
    name: 'Shake It Out',
    instruction: 'Shake your hands, arms, and whole body to release tension',
    durationSeconds: 10,
    animationType: 'shake',
    seatedAlternative: 'Shake your hands and wiggle in your seat',
  },
  {
    id: 'toe-touches',
    name: 'Toe Touches',
    instruction: 'Slowly bend forward and try to touch your toes',
    durationSeconds: 15,
    animationType: 'stretch',
    seatedAlternative: 'Reach toward your feet while seated',
  },
  {
    id: 'march-in-place',
    name: 'March in Place',
    instruction: 'March in place, lifting your knees high',
    durationSeconds: 20,
    animationType: 'bounce',
    seatedAlternative: 'Lift your knees alternately while seated',
  },
];
