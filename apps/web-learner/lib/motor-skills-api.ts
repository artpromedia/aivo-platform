/**
 * Motor Skills API Client
 *
 * Full-featured API client for motor skills development features including:
 * - Handwriting practice
 * - Fine motor activities
 * - Gross motor exercises
 * - Adaptive input settings
 */

const MOTOR_SKILLS_API_BASE = process.env.NEXT_PUBLIC_MOTOR_SKILLS_API_URL || 'http://localhost:4038/api';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type HandwritingType = 'uppercase' | 'lowercase' | 'number' | 'word' | 'sentence' | 'shape';
export type FineMotorType = 'tapping' | 'dragging' | 'pinching' | 'tracing' | 'matching' | 'sorting' | 'threading' | 'manipulation';
export type GrossMotorType = 'jumping' | 'running' | 'dancing' | 'balancing' | 'coordination' | 'stretching' | 'yoga' | 'sports';
export type AdaptiveInputType = 'touchTargetSize' | 'touchDuration' | 'swipeSpeed' | 'dragSensitivity' | 'doubleTapDelay' | 'vibrationFeedback' | 'audioFeedback' | 'visualFeedback' | 'buttonLayout' | 'gestureControl';

// ═══════════════════════════════════════════════════════════════════════════════
// HANDWRITING INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StrokeGuidance {
  order: number;
  direction: string;
  points: Array<{ x: number; y: number }>;
  description: string;
  animation?: string;
}

export interface HandwritingExercise {
  id: string;
  name: string;
  description: string;
  type: HandwritingType;
  letterOrWord: string;
  strokes: StrokeGuidance[];
  difficulty: number;
  previewImage?: string;
  estimatedTime: number;
  tips: string[];
}

export interface HandwritingSession {
  id: string;
  learnerId: string;
  exerciseId: string;
  startedAt: string;
  completedAt?: string;
  accuracy: number;
  strokesCompleted: number;
  totalStrokes: number;
  feedback: string[];
  traceData?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINE MOTOR INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActivityStep {
  order: number;
  instruction: string;
  image?: string;
  video?: string;
  duration?: number;
  interactiveData?: Record<string, unknown>;
}

export interface FineMotorActivity {
  id: string;
  name: string;
  description: string;
  type: FineMotorType;
  difficulty: number;
  steps: ActivityStep[];
  estimatedTime: number;
  previewImage?: string;
  materials: string[];
  benefits: string[];
}

export interface FineMotorSession {
  id: string;
  learnerId: string;
  activityId: string;
  startedAt: string;
  completedAt?: string;
  stepsCompleted: number;
  totalSteps: number;
  accuracy: number;
  achievements: string[];
  performanceData?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROSS MOTOR INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MovementStep {
  order: number;
  name: string;
  description: string;
  repetitions: number;
  duration: number;
  image?: string;
  cues: string[];
}

export interface GrossMotorExercise {
  id: string;
  name: string;
  description: string;
  type: GrossMotorType;
  difficulty: number;
  movements: MovementStep[];
  duration: number;
  videoUrl?: string;
  equipment: string[];
  caloriesBurned: number;
  muscleGroups: string[];
}

export interface GrossMotorSession {
  id: string;
  learnerId: string;
  exerciseId: string;
  startedAt: string;
  completedAt?: string;
  movementsCompleted: number;
  totalMovements: number;
  accuracy: number;
  trackingData?: Record<string, unknown>;
  notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE INPUT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AdaptiveInputSetting {
  id: string;
  name: string;
  type: AdaptiveInputType;
  value: unknown;
  defaultValue: unknown;
  description: string;
  constraints?: Record<string, unknown>;
}

export interface AdaptiveInputProfile {
  id: string;
  learnerId: string;
  settings: AdaptiveInputSetting[];
  updatedAt: string;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const FINE_MOTOR_TYPE_META: Record<FineMotorType, { label: string; icon: string; color: string }> = {
  tapping: { label: 'Tapping', icon: '👆', color: '#3B82F6' },
  dragging: { label: 'Dragging', icon: '✋', color: '#8B5CF6' },
  pinching: { label: 'Pinching', icon: '🤏', color: '#10B981' },
  tracing: { label: 'Tracing', icon: '✏️', color: '#F59E0B' },
  matching: { label: 'Matching', icon: '🎯', color: '#EC4899' },
  sorting: { label: 'Sorting', icon: '📊', color: '#06B6D4' },
  threading: { label: 'Threading', icon: '🧵', color: '#EF4444' },
  manipulation: { label: 'Manipulation', icon: '🤲', color: '#7C3AED' },
};

export const GROSS_MOTOR_TYPE_META: Record<GrossMotorType, { label: string; icon: string; color: string }> = {
  jumping: { label: 'Jumping', icon: '🦘', color: '#3B82F6' },
  running: { label: 'Running', icon: '🏃', color: '#10B981' },
  dancing: { label: 'Dancing', icon: '💃', color: '#EC4899' },
  balancing: { label: 'Balancing', icon: '🤸', color: '#8B5CF6' },
  coordination: { label: 'Coordination', icon: '🎪', color: '#F59E0B' },
  stretching: { label: 'Stretching', icon: '🧘', color: '#06B6D4' },
  yoga: { label: 'Yoga', icon: '🧘‍♀️', color: '#7C3AED' },
  sports: { label: 'Sports', icon: '⚽', color: '#EF4444' },
};

export const HANDWRITING_TYPE_META: Record<HandwritingType, { label: string; icon: string }> = {
  uppercase: { label: 'Uppercase Letters', icon: 'A' },
  lowercase: { label: 'Lowercase Letters', icon: 'a' },
  number: { label: 'Numbers', icon: '1' },
  word: { label: 'Words', icon: 'Abc' },
  sentence: { label: 'Sentences', icon: '...' },
  shape: { label: 'Shapes', icon: '○' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response;
}

// Handwriting APIs
export async function getHandwritingExercises(filters?: {
  type?: HandwritingType;
  difficulty?: number;
}): Promise<HandwritingExercise[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty.toString());

  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/handwriting/exercises?${params}`);
  return response.json();
}

export async function getHandwritingExercise(exerciseId: string): Promise<HandwritingExercise> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/handwriting/exercises/${exerciseId}`);
  return response.json();
}

export async function startHandwritingSession(learnerId: string, exerciseId: string): Promise<HandwritingSession> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/handwriting/sessions`, {
    method: 'POST',
    body: JSON.stringify({ learnerId, exerciseId }),
  });
  return response.json();
}

export async function completeHandwritingSession(
  sessionId: string,
  data: { accuracy: number; strokesCompleted: number; feedback?: string[]; traceData?: Record<string, unknown> }
): Promise<HandwritingSession> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/handwriting/sessions/${sessionId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Fine Motor APIs
export async function getFineMotorActivities(filters?: {
  type?: FineMotorType;
  difficulty?: number;
}): Promise<FineMotorActivity[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty.toString());

  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/fine-motor/activities?${params}`);
  return response.json();
}

export async function getFineMotorActivity(activityId: string): Promise<FineMotorActivity> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/fine-motor/activities/${activityId}`);
  return response.json();
}

export async function startFineMotorSession(learnerId: string, activityId: string): Promise<FineMotorSession> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/fine-motor/sessions`, {
    method: 'POST',
    body: JSON.stringify({ learnerId, activityId }),
  });
  return response.json();
}

export async function completeFineMotorSession(
  sessionId: string,
  data: { stepsCompleted: number; accuracy: number; achievements?: string[]; performanceData?: Record<string, unknown> }
): Promise<FineMotorSession> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/fine-motor/sessions/${sessionId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Gross Motor APIs
export async function getGrossMotorExercises(filters?: {
  type?: GrossMotorType;
  difficulty?: number;
}): Promise<GrossMotorExercise[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty.toString());

  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/gross-motor/exercises?${params}`);
  return response.json();
}

export async function getGrossMotorExercise(exerciseId: string): Promise<GrossMotorExercise> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/gross-motor/exercises/${exerciseId}`);
  return response.json();
}

export async function startGrossMotorSession(learnerId: string, exerciseId: string): Promise<GrossMotorSession> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/gross-motor/sessions`, {
    method: 'POST',
    body: JSON.stringify({ learnerId, exerciseId }),
  });
  return response.json();
}

export async function completeGrossMotorSession(
  sessionId: string,
  data: { movementsCompleted: number; accuracy: number; trackingData?: Record<string, unknown>; notes?: string[] }
): Promise<GrossMotorSession> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/gross-motor/sessions/${sessionId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Adaptive Input APIs
export async function getAdaptiveInputProfile(learnerId: string): Promise<AdaptiveInputProfile> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/adaptive-input/profile?learnerId=${learnerId}`);
  return response.json();
}

export async function updateAdaptiveInputSetting(
  profileId: string,
  settingId: string,
  value: unknown
): Promise<AdaptiveInputProfile> {
  const response = await fetchWithAuth(
    `${MOTOR_SKILLS_API_BASE}/adaptive-input/profile/${profileId}/settings/${settingId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }
  );
  return response.json();
}

export async function resetAdaptiveInputSettings(profileId: string): Promise<AdaptiveInputProfile> {
  const response = await fetchWithAuth(`${MOTOR_SKILLS_API_BASE}/adaptive-input/profile/${profileId}/reset`, {
    method: 'POST',
  });
  return response.json();
}
