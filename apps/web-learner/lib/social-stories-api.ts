/**
 * Social Stories API Client
 *
 * Full-featured API client matching the mobile implementation.
 * Supports Carol Gray sentence types, personalization, view tracking,
 * and story recommendations.
 */

const SOCIAL_STORIES_API_BASE = process.env.NEXT_PUBLIC_SOCIAL_STORIES_API_URL || 'http://localhost:4037/api';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type SocialStoryCategory =
  | 'startingLesson'
  | 'endingLesson'
  | 'changingActivity'
  | 'unexpectedChange'
  | 'takingQuiz'
  | 'testTaking'
  | 'receivingFeedback'
  | 'askingForHelp'
  | 'askingForBreak'
  | 'raisingHand'
  | 'talkingToTeacher'
  | 'feelingFrustrated'
  | 'feelingOverwhelmed'
  | 'feelingAnxious'
  | 'calmingDown'
  | 'celebratingSuccess'
  | 'stayingOnTask'
  | 'ignoringDistractions'
  | 'waitingTurn'
  | 'usingDevice'
  | 'technicalProblem'
  | 'workingWithPeers'
  | 'sharingMaterials'
  | 'respectfulDisagreement'
  | 'sensoryBreak'
  | 'movementBreak'
  | 'quietSpace'
  | 'fireDrill'
  | 'lockdown'
  | 'feelingUnsafe'
  | 'custom';

export type SocialStoryReadingLevel =
  | 'preReader'
  | 'earlyReader'
  | 'developing'
  | 'intermediate';

export type SocialStoryVisualStyle =
  | 'photographs'
  | 'realisticArt'
  | 'cartoon'
  | 'simpleIcons'
  | 'abstract';

/** Carol Gray sentence types for social stories */
export type SentenceType =
  | 'descriptive'
  | 'perspective'
  | 'directive'
  | 'affirmative'
  | 'cooperative'
  | 'control'
  | 'partial';

export type StoryTriggerType =
  | 'manual'
  | 'auto'
  | 'scheduled'
  | 'recommended'
  | 'transition';

export type RecommendationReason =
  | 'transitionSupport'
  | 'emotionalSupport'
  | 'scheduled'
  | 'teacherAssigned'
  | 'frequentlyHelpful'
  | 'similarSituation'
  | 'newScenario';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StorySentence {
  id: string;
  text: string;
  type: SentenceType;
  audioUrl?: string;
  emphasisWords: string[];
  personalizationTokens: string[];
}

export interface StoryVisual {
  id: string;
  type: string;
  url: string;
  altText: string;
  style: SocialStoryVisualStyle;
  position: string;
  aspectRatio?: string;
  variants: Record<string, string>;
}

export interface StoryInteraction {
  id: string;
  type: string;
  config: Record<string, unknown>;
  required: boolean;
}

export interface StoryPage {
  id: string;
  pageNumber: number;
  sentences: StorySentence[];
  visual?: StoryVisual;
  interactions: StoryInteraction[];
  backgroundColor?: string;
  transitionEffect?: string;
  audioNarration?: string;
  displayDuration?: number;
}

export interface SocialStory {
  id: string;
  tenantId?: string;
  slug: string;
  title: string;
  description?: string;
  category: SocialStoryCategory;
  pages: StoryPage[];
  readingLevel: SocialStoryReadingLevel;
  estimatedDuration: number;
  minAge?: number;
  maxAge?: number;
  gradeBands: string[];
  supportsPersonalization: boolean;
  personalizationTokens: string[];
  defaultVisualStyle: SocialStoryVisualStyle;
  hasAudio: boolean;
  hasVideo: boolean;
  isBuiltIn: boolean;
  isApproved: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerStoryPreferences {
  learnerId: string;
  preferredVisualStyle: SocialStoryVisualStyle;
  preferredReadingLevel: SocialStoryReadingLevel;
  enableAudio: boolean;
  enableTts: boolean;
  ttsVoice?: string;
  ttsSpeed: number;
  autoAdvance: boolean;
  pageDisplayTime: number;
  characterName?: string;
  favoriteColor?: string;
  interests: string[];
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

export interface StoryRecommendation {
  storyId: string;
  story: SocialStory;
  score: number;
  reason: RecommendationReason;
  context: Record<string, unknown>;
}

export interface PersonalizationContext {
  learnerName?: string;
  teacherName?: string;
  helperName?: string;
  schoolName?: string;
  classroomName?: string;
  favoriteActivity?: string;
  calmPlace?: string;
  comfortItem?: string;
  characterName?: string;
  breakSignal?: string;
  helpSignal?: string;
  customTokens?: Record<string, string>;
}

export interface RecordStoryViewData {
  storyId: string;
  learnerId: string;
  sessionId?: string;
  triggerType: StoryTriggerType;
  triggerContext?: Record<string, unknown>;
  pagesViewed: number;
  totalPages: number;
  completedAt?: string;
  durationSeconds?: number;
  replayCount: number;
  audioPlayed: boolean;
  interactions: Array<Record<string, unknown>>;
  preEmotionalState?: string;
  postEmotionalState?: string;
  helpfulnessRating?: number;
}

export interface StoryListFilters {
  category?: SocialStoryCategory;
  readingLevel?: SocialStoryReadingLevel;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface StoryRecommendationQuery {
  learnerId: string;
  currentActivityType?: string;
  nextActivityType?: string;
  detectedEmotionalState?: string;
  maxResults?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const CATEGORY_METADATA: Record<SocialStoryCategory, { label: string; icon: string; color: string }> = {
  startingLesson: { label: 'Starting a Lesson', icon: '📚', color: '#3B82F6' },
  endingLesson: { label: 'Ending a Lesson', icon: '🏁', color: '#10B981' },
  changingActivity: { label: 'Changing Activity', icon: '🔄', color: '#8B5CF6' },
  unexpectedChange: { label: 'Unexpected Changes', icon: '⚡', color: '#F59E0B' },
  takingQuiz: { label: 'Taking a Quiz', icon: '📝', color: '#06B6D4' },
  testTaking: { label: 'Test Taking', icon: '✍️', color: '#6366F1' },
  receivingFeedback: { label: 'Receiving Feedback', icon: '💬', color: '#EC4899' },
  askingForHelp: { label: 'Asking for Help', icon: '🙋', color: '#14B8A6' },
  askingForBreak: { label: 'Asking for a Break', icon: '⏸️', color: '#84CC16' },
  raisingHand: { label: 'Raising Hand', icon: '✋', color: '#F97316' },
  talkingToTeacher: { label: 'Talking to Teacher', icon: '👩‍🏫', color: '#7C3AED' },
  feelingFrustrated: { label: 'Feeling Frustrated', icon: '😤', color: '#EF4444' },
  feelingOverwhelmed: { label: 'Feeling Overwhelmed', icon: '😵', color: '#DC2626' },
  feelingAnxious: { label: 'Feeling Anxious', icon: '😰', color: '#F43F5E' },
  calmingDown: { label: 'Calming Down', icon: '😌', color: '#22C55E' },
  celebratingSuccess: { label: 'Celebrating Success', icon: '🎉', color: '#FBBF24' },
  stayingOnTask: { label: 'Staying on Task', icon: '🎯', color: '#3B82F6' },
  ignoringDistractions: { label: 'Ignoring Distractions', icon: '🙈', color: '#8B5CF6' },
  waitingTurn: { label: 'Waiting Your Turn', icon: '⏳', color: '#F97316' },
  usingDevice: { label: 'Using a Device', icon: '💻', color: '#06B6D4' },
  technicalProblem: { label: 'Technical Problems', icon: '🔧', color: '#64748B' },
  workingWithPeers: { label: 'Working with Peers', icon: '👥', color: '#10B981' },
  sharingMaterials: { label: 'Sharing Materials', icon: '🤝', color: '#14B8A6' },
  respectfulDisagreement: { label: 'Respectful Disagreement', icon: '🗣️', color: '#7C3AED' },
  sensoryBreak: { label: 'Sensory Break', icon: '🧘', color: '#EC4899' },
  movementBreak: { label: 'Movement Break', icon: '🏃', color: '#84CC16' },
  quietSpace: { label: 'Quiet Space', icon: '🤫', color: '#6366F1' },
  fireDrill: { label: 'Fire Drill', icon: '🚨', color: '#EF4444' },
  lockdown: { label: 'Lockdown', icon: '🔒', color: '#DC2626' },
  feelingUnsafe: { label: 'Feeling Unsafe', icon: '🛡️', color: '#F43F5E' },
  custom: { label: 'Custom Story', icon: '📖', color: '#64748B' },
};

export const READING_LEVEL_LABELS: Record<SocialStoryReadingLevel, string> = {
  preReader: 'Pre-Reader',
  earlyReader: 'Early Reader',
  developing: 'Developing',
  intermediate: 'Intermediate',
};

export const VISUAL_STYLE_LABELS: Record<SocialStoryVisualStyle, string> = {
  photographs: 'Photographs',
  realisticArt: 'Realistic Art',
  cartoon: 'Cartoon',
  simpleIcons: 'Simple Icons',
  abstract: 'Abstract',
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

// Story CRUD
export async function listStories(filters: StoryListFilters = {}): Promise<SocialStory[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category.toUpperCase());
  if (filters.readingLevel) params.set('readingLevel', filters.readingLevel.toUpperCase());
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());

  const response = await fetchWithAuth(`${SOCIAL_STORIES_API_BASE}/social-stories?${params}`);
  const data = await response.json();
  return data.items || data;
}

export async function getStory(storyId: string): Promise<SocialStory> {
  const response = await fetchWithAuth(`${SOCIAL_STORIES_API_BASE}/social-stories/${storyId}`);
  return response.json();
}

export async function getStoryBySlug(slug: string): Promise<SocialStory> {
  const response = await fetchWithAuth(`${SOCIAL_STORIES_API_BASE}/social-stories/slug/${slug}`);
  return response.json();
}

export async function getPersonalizedStory(
  storyId: string,
  context: PersonalizationContext
): Promise<SocialStory> {
  const response = await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/social-stories/${storyId}/personalize`,
    {
      method: 'POST',
      body: JSON.stringify(context),
    }
  );
  return response.json();
}

// Learner Preferences
export async function getLearnerPreferences(learnerId: string): Promise<LearnerStoryPreferences> {
  const response = await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/learners/${learnerId}/story-preferences`
  );
  return response.json();
}

export async function updateLearnerPreferences(
  learnerId: string,
  preferences: Partial<LearnerStoryPreferences>
): Promise<LearnerStoryPreferences> {
  const response = await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/learners/${learnerId}/story-preferences`,
    {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }
  );
  return response.json();
}

// Story Views
export async function recordStoryView(viewData: RecordStoryViewData): Promise<void> {
  await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/social-stories/${viewData.storyId}/views`,
    {
      method: 'POST',
      body: JSON.stringify(viewData),
    }
  );
}

// Recommendations
export async function getRecommendations(
  query: StoryRecommendationQuery
): Promise<StoryRecommendation[]> {
  const params = new URLSearchParams();
  if (query.currentActivityType) params.set('currentActivityType', query.currentActivityType);
  if (query.nextActivityType) params.set('nextActivityType', query.nextActivityType);
  if (query.detectedEmotionalState) params.set('detectedEmotionalState', query.detectedEmotionalState);
  if (query.maxResults) params.set('maxResults', query.maxResults.toString());

  const response = await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/learners/${query.learnerId}/story-recommendations?${params}`
  );
  const data = await response.json();
  return data.items || data;
}

// Favorites
export async function toggleFavorite(learnerId: string, storyId: string, favorite: boolean): Promise<void> {
  await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/learners/${learnerId}/favorites/${storyId}`,
    {
      method: favorite ? 'PUT' : 'DELETE',
    }
  );
}

export async function getFavoriteStories(learnerId: string): Promise<SocialStory[]> {
  const response = await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/learners/${learnerId}/favorites`
  );
  const data = await response.json();
  return data.items || data;
}

// View History
export async function getViewHistory(
  learnerId: string,
  limit = 20
): Promise<Array<{ story: SocialStory; viewedAt: string; completed: boolean }>> {
  const response = await fetchWithAuth(
    `${SOCIAL_STORIES_API_BASE}/learners/${learnerId}/view-history?limit=${limit}`
  );
  const data = await response.json();
  return data.items || data;
}
