// Onboarding flow types

export interface OnboardingData {
  // Profile setup
  displayName?: string;
  avatar?: string;
  gradeLevel?: string;
  birthMonth?: string;
  birthYear?: string;

  // Accessibility preferences
  textSize?: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast?: boolean;
  reducedMotion?: boolean;
  screenReader?: boolean;
  colorBlindMode?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  dyslexiaFont?: boolean;
  readingSpeed?: 'slow' | 'medium' | 'fast';

  // Sensory profile
  soundSensitivity?: 'low' | 'medium' | 'high';
  visualBusyness?: 'minimal' | 'moderate' | 'full';
  breakFrequency?: 'rarely' | 'sometimes' | 'often';
  preferredEnvironment?: 'quiet' | 'background-music' | 'nature-sounds';
  lightingPreference?: 'dim' | 'normal' | 'bright';

  // Interests
  favoriteSubjects?: string[];
  hobbies?: string[];
  learningGoals?: string[];
  favoriteCharacters?: string[];

  // Learning preferences
  preferredLearningStyle?: string[];
  challengeAreas?: string[];
  strengths?: string[];
  optimalLearningTime?: string;
  breakPreference?: string;
}

export interface OnboardingStepProps {
  data: OnboardingData;
  onComplete: (stepData: Partial<OnboardingData>) => void;
  onBack?: () => void;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
}

export const GRADE_LEVELS = [
  { value: 'prek', label: 'Pre-K', emoji: '🌱' },
  { value: 'k', label: 'Kindergarten', emoji: '🎨' },
  { value: '1', label: '1st Grade', emoji: '⭐' },
  { value: '2', label: '2nd Grade', emoji: '🌟' },
  { value: '3', label: '3rd Grade', emoji: '🚀' },
  { value: '4', label: '4th Grade', emoji: '🔥' },
  { value: '5', label: '5th Grade', emoji: '💎' },
  { value: '6', label: '6th Grade', emoji: '🎯' },
  { value: '7', label: '7th Grade', emoji: '🏆' },
  { value: '8', label: '8th Grade', emoji: '🎖️' },
  { value: '9', label: '9th Grade', emoji: '🌊' },
  { value: '10', label: '10th Grade', emoji: '⚡' },
  { value: '11', label: '11th Grade', emoji: '🔱' },
  { value: '12', label: '12th Grade', emoji: '👑' },
];

export const AVATAR_OPTIONS = [
  { id: 'explorer', emoji: '🧭', label: 'Explorer' },
  { id: 'scientist', emoji: '🔬', label: 'Scientist' },
  { id: 'artist', emoji: '🎨', label: 'Artist' },
  { id: 'astronaut', emoji: '🚀', label: 'Astronaut' },
  { id: 'wizard', emoji: '🧙', label: 'Wizard' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'superhero', emoji: '🦸', label: 'Superhero' },
  { id: 'dragon', emoji: '🐉', label: 'Dragon' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'phoenix', emoji: '🔥', label: 'Phoenix' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
];

export const SUBJECT_INTERESTS = [
  { id: 'math', emoji: '🔢', label: 'Math' },
  { id: 'reading', emoji: '📚', label: 'Reading' },
  { id: 'science', emoji: '🔬', label: 'Science' },
  { id: 'history', emoji: '🏛️', label: 'History' },
  { id: 'art', emoji: '🎨', label: 'Art' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'writing', emoji: '✍️', label: 'Writing' },
  { id: 'coding', emoji: '💻', label: 'Coding' },
  { id: 'nature', emoji: '🌿', label: 'Nature' },
  { id: 'sports', emoji: '⚽', label: 'Sports' },
  { id: 'games', emoji: '🎮', label: 'Games' },
  { id: 'animals', emoji: '🐾', label: 'Animals' },
];

export const HOBBY_OPTIONS = [
  { id: 'drawing', emoji: '✏️', label: 'Drawing' },
  { id: 'building', emoji: '🧱', label: 'Building/LEGO' },
  { id: 'video-games', emoji: '🎮', label: 'Video Games' },
  { id: 'sports', emoji: '🏀', label: 'Sports' },
  { id: 'reading', emoji: '📖', label: 'Reading' },
  { id: 'crafts', emoji: '🎨', label: 'Crafts' },
  { id: 'music', emoji: '🎸', label: 'Playing Music' },
  { id: 'cooking', emoji: '👨‍🍳', label: 'Cooking' },
  { id: 'animals', emoji: '🐕', label: 'Pets/Animals' },
  { id: 'outdoors', emoji: '🏕️', label: 'Outdoors' },
  { id: 'puzzles', emoji: '🧩', label: 'Puzzles' },
  { id: 'movies', emoji: '🎬', label: 'Movies/TV' },
];

export const LEARNING_GOALS = [
  { id: 'improve-grades', emoji: '📈', label: 'Get better grades' },
  { id: 'learn-faster', emoji: '🚀', label: 'Learn things faster' },
  { id: 'homework-help', emoji: '📝', label: 'Get homework help' },
  { id: 'explore-interests', emoji: '🔍', label: 'Explore new interests' },
  { id: 'catch-up', emoji: '🏃', label: 'Catch up in school' },
  { id: 'get-ahead', emoji: '⚡', label: 'Get ahead in school' },
  { id: 'have-fun', emoji: '🎉', label: 'Have fun learning' },
  { id: 'build-confidence', emoji: '💪', label: 'Feel more confident' },
];
