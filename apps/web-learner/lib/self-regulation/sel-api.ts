/**
 * SEL Service API Client
 * Handles communication with the SEL microservice for emotion tracking and regulation activities
 */

import type {
  EmotionCheckInData,
  EmotionHistory,
  MoodTrendsReport,
  RegulationActivityData,
  RegulationSession,
  RegulationSessionInput,
  RegulationSessionUpdate,
  ActivityRecommendation,
  PaginatedResponse,
  ActivityType,
  GradeBand,
} from './regulation-types';

// ============================================================================
// Configuration
// ============================================================================

const SEL_API_BASE_URL = process.env.NEXT_PUBLIC_SEL_API_URL || 'http://localhost:4071';

// ============================================================================
// Helper Functions
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SEL_API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Emotion Check-In APIs
// ============================================================================

/**
 * Record a new emotion check-in
 */
export async function createEmotionCheckIn(
  profileId: string,
  data: {
    moodRating: number;
    moodEmoji: string;
    emotions: string[];
    energyLevel?: number;
    context?: string;
    trigger?: string;
    reflection?: string;
    needsSupport?: boolean;
    isPrivate?: boolean;
  }
): Promise<EmotionCheckInData> {
  return apiRequest<EmotionCheckInData>(`/profiles/${profileId}/check-ins`, {
    method: 'POST',
    body: JSON.stringify({
      checkInType: 'MOOD',
      ...data,
    }),
  });
}

/**
 * Get emotion check-in history for a learner
 */
export async function getEmotionHistory(
  profileId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<EmotionHistory> {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('fromDate', options.fromDate);
  if (options.toDate) params.append('toDate', options.toDate);
  if (options.page) params.append('page', options.page.toString());
  if (options.pageSize) params.append('pageSize', options.pageSize.toString());

  const queryString = params.toString();
  const endpoint = `/profiles/${profileId}/check-ins${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<PaginatedResponse<EmotionCheckInData>>(endpoint);

  return {
    checkIns: response.data,
    pagination: response.pagination,
  };
}

/**
 * Get mood trends for a learner
 */
export async function getMoodTrends(
  profileId: string,
  days: number = 30
): Promise<MoodTrendsReport> {
  return apiRequest<MoodTrendsReport>(`/profiles/${profileId}/mood-trends?days=${days}`);
}

// ============================================================================
// Regulation Activity APIs
// ============================================================================

/**
 * Get available regulation activities
 */
export async function getRegulationActivities(
  options: {
    activityType?: ActivityType;
    gradeLevel?: number;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<PaginatedResponse<RegulationActivityData>> {
  const params = new URLSearchParams();
  if (options.activityType) params.append('activityType', mapActivityType(options.activityType));
  if (options.gradeLevel) params.append('gradeLevel', options.gradeLevel.toString());
  if (options.page) params.append('page', options.page.toString());
  if (options.pageSize) params.append('pageSize', options.pageSize.toString());

  const queryString = params.toString();
  const endpoint = `/activities${queryString ? `?${queryString}` : ''}`;

  return apiRequest<PaginatedResponse<RegulationActivityData>>(endpoint);
}

/**
 * Get recommended activities for a learner
 */
export async function getRecommendedActivities(
  profileId: string,
  options: {
    currentMood?: string;
    limit?: number;
  } = {}
): Promise<ActivityRecommendation[]> {
  const params = new URLSearchParams();
  if (options.currentMood) params.append('mood', options.currentMood);
  if (options.limit) params.append('limit', options.limit.toString());

  const queryString = params.toString();
  const endpoint = `/regulation/recommended/${profileId}${queryString ? `?${queryString}` : ''}`;

  try {
    return await apiRequest<ActivityRecommendation[]>(endpoint);
  } catch {
    // Fallback to local recommendations if endpoint not available
    return getLocalRecommendations(options.currentMood, options.limit);
  }
}

// ============================================================================
// Regulation Session APIs
// ============================================================================

/**
 * Start a new regulation session
 */
export async function startRegulationSession(
  data: RegulationSessionInput
): Promise<RegulationSession> {
  return apiRequest<RegulationSession>('/regulation/sessions', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      startedAt: new Date().toISOString(),
    }),
  });
}

/**
 * Complete/update a regulation session
 */
export async function completeRegulationSession(
  sessionId: string,
  data: RegulationSessionUpdate
): Promise<RegulationSession> {
  return apiRequest<RegulationSession>(`/regulation/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...data,
      completedAt: data.completed ? new Date().toISOString() : undefined,
    }),
  });
}

/**
 * Record activity completion (simpler endpoint for quick completions)
 */
export async function recordActivityCompletion(
  profileId: string,
  data: {
    activityId: string;
    duration?: number;
    rating?: number;
    reflection?: string;
    helpfulness?: number;
    context?: string;
  }
): Promise<void> {
  await apiRequest(`/profiles/${profileId}/activity-completions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Local/Fallback Data
// ============================================================================

/**
 * Map internal activity types to SEL service activity types
 */
function mapActivityType(type: ActivityType): string {
  const typeMap: Record<ActivityType, string> = {
    breathing: 'MINDFULNESS',
    grounding: 'SELF_REFLECTION',
    movement: 'GROUP_ACTIVITY',
    visualization: 'MINDFULNESS',
    sensory: 'SELF_REFLECTION',
    sounds: 'MINDFULNESS',
    counting: 'GAME',
    progressive: 'MINDFULNESS',
  };
  return typeMap[type] || 'SELF_REFLECTION';
}

/**
 * Get local recommendations when API is unavailable
 */
function getLocalRecommendations(
  currentMood?: string,
  limit: number = 3
): ActivityRecommendation[] {
  const moodActivities: Record<string, ActivityType[]> = {
    anxious: ['breathing', 'grounding', 'progressive'],
    worried: ['breathing', 'grounding', 'visualization'],
    stressed: ['breathing', 'movement', 'progressive'],
    angry: ['movement', 'breathing', 'counting'],
    frustrated: ['movement', 'breathing', 'sensory'],
    sad: ['movement', 'visualization', 'sounds'],
    overwhelmed: ['grounding', 'breathing', 'sensory'],
    tired: ['movement', 'breathing', 'sounds'],
    restless: ['movement', 'breathing', 'counting'],
  };

  const activityInfo: Record<ActivityType, { name: string; description: string }> = {
    breathing: { name: 'Breathing Exercise', description: 'Calm your body with guided breathing' },
    grounding: { name: '5-4-3-2-1 Grounding', description: 'Connect with your senses to feel present' },
    movement: { name: 'Movement Break', description: 'Release energy through gentle movement' },
    visualization: { name: 'Visualization', description: 'Imagine a peaceful place' },
    sensory: { name: 'Sensory Activity', description: 'Focus on calming sensations' },
    sounds: { name: 'Calming Sounds', description: 'Listen to relaxing sounds' },
    counting: { name: 'Counting Exercise', description: 'Focus your mind with counting' },
    progressive: { name: 'Progressive Relaxation', description: 'Relax your body one part at a time' },
  };

  const defaultTypes: ActivityType[] = ['breathing', 'grounding', 'movement'];
  const recommendedTypes: ActivityType[] = currentMood && moodActivities[currentMood.toLowerCase()]
    ? moodActivities[currentMood.toLowerCase()]!
    : defaultTypes;

  return recommendedTypes.slice(0, limit).map((type: ActivityType, index) => ({
    activity: {
      id: `local-${type}`,
      name: activityInfo[type].name,
      description: activityInfo[type].description,
      activityType: type,
      difficulty: 'beginner' as const,
      estimatedDurationSeconds: type === 'breathing' ? 120 : type === 'grounding' ? 180 : 90,
      gradeBands: ['K5', 'G6_8', 'G9_12'] as GradeBand[],
      steps: [],
      tags: [type, 'regulation', 'calming'],
    },
    reason: getMoodReason(currentMood, type),
    priority: index + 1,
  }));
}

/**
 * Get reason text for mood-based recommendations
 */
function getMoodReason(mood?: string, activityType?: ActivityType): string {
  if (!mood) return 'A great activity to help you regulate';

  const reasons: Record<string, Record<string, string>> = {
    anxious: {
      breathing: 'Breathing helps calm anxious feelings',
      grounding: 'Grounding can help when feeling anxious',
      progressive: 'Relaxation reduces physical anxiety',
    },
    stressed: {
      breathing: 'Slow breathing helps reduce stress',
      movement: 'Movement releases stress from your body',
      progressive: 'Relaxation helps with stress',
    },
    angry: {
      movement: 'Movement helps release angry energy',
      breathing: 'Breathing can cool down anger',
      counting: 'Counting gives time to calm down',
    },
    overwhelmed: {
      grounding: 'Grounding helps when overwhelmed',
      breathing: 'Breathing brings you back to the present',
      sensory: 'Sensory focus reduces overwhelm',
    },
  };

  return reasons[mood.toLowerCase()]?.[activityType || 'breathing']
    || `This can help when feeling ${mood}`;
}

// ============================================================================
// Profile APIs
// ============================================================================

/**
 * Get or create learner SEL profile
 */
export async function ensureLearnerProfile(
  studentId: string
): Promise<{ id: string; studentId: string }> {
  try {
    // Try to get existing profile
    const response = await apiRequest<PaginatedResponse<{ id: string; studentId: string }>>(
      `/profiles?search=${studentId}&pageSize=1`
    );

    if (response.data.length > 0) {
      return response.data[0];
    }

    // Create new profile if not found
    return await apiRequest<{ id: string; studentId: string }>('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        riskLevel: 'LOW',
        riskFactors: [],
        protectiveFactors: [],
        preferredActivities: [],
      }),
    });
  } catch {
    // Return a local profile ID if API is unavailable
    return { id: studentId, studentId };
  }
}

// ============================================================================
// Export All
// ============================================================================

export const selApi = {
  // Emotion APIs
  createEmotionCheckIn,
  getEmotionHistory,
  getMoodTrends,

  // Activity APIs
  getRegulationActivities,
  getRecommendedActivities,

  // Session APIs
  startRegulationSession,
  completeRegulationSession,
  recordActivityCompletion,

  // Profile APIs
  ensureLearnerProfile,
};

export default selApi;
