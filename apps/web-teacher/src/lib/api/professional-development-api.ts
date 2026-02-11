/**
 * Professional Development API client
 * Provides access to training resources, best practices, and teaching strategies
 */

import { getEnvUrl } from '@/lib/utils';

const API_BASE_URL = `${getEnvUrl('NEXT_PUBLIC_PD_API_URL', 'http://localhost:8097', { serviceName: 'professional-development-api' })}/api/teacher/professional-development`;

export type ResourceType = 'video' | 'article' | 'course' | 'webinar' | 'workshop' | 'guide';
export type ResourceCategory = 
  | 'accessibility'
  | 'classroom-management'
  | 'technology'
  | 'differentiation'
  | 'assessment'
  | 'sel' // Social-Emotional Learning
  | 'curriculum'
  | 'parent-engagement';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface TrainingResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  difficulty: DifficultyLevel;
  duration: number; // in minutes
  thumbnailUrl?: string;
  author: string;
  publishedDate: string;
  rating: number;
  totalRatings: number;
  completionRate: number;
  contentUrl: string;
  tags: string[];
  prerequisites?: string[];
  learningOutcomes: string[];
  isBookmarked: boolean;
  isCompleted: boolean;
  progress?: number; // 0-100
}

export interface BestPractice {
  id: string;
  title: string;
  summary: string;
  category: ResourceCategory;
  content: string; // Markdown content
  relatedStrategies: string[];
  evidenceLevel: 'research-based' | 'evidence-informed' | 'promising-practice';
  sources: {
    title: string;
    url: string;
    year: number;
  }[];
  examples: {
    scenario: string;
    implementation: string;
    outcome: string;
  }[];
  updatedDate: string;
  viewCount: number;
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface TeachingStrategy {
  id: string;
  name: string;
  description: string;
  category: ResourceCategory;
  applicableGrades: string[];
  timeRequired: string;
  difficulty: DifficultyLevel;
  steps: {
    order: number;
    title: string;
    description: string;
    tips: string[];
  }[];
  materials: string[];
  adaptations: {
    scenario: string;
    modification: string;
  }[];
  assessmentTips: string[];
  relatedResources: string[];
  videoUrl?: string;
  downloadableTemplates?: string[];
  isBookmarked: boolean;
  userNotes?: string;
}

export interface Certificate {
  id: string;
  title: string;
  description: string;
  issueDate: string;
  expiryDate?: string;
  credentialUrl: string;
  badgeUrl: string;
  issuer: string;
  hours: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  difficulty: DifficultyLevel;
  totalResources: number;
  completedResources: number;
  estimatedHours: number;
  resources: TrainingResource[];
  milestones: {
    id: string;
    title: string;
    description: string;
    requiredCompletions: number;
    achieved: boolean;
  }[];
  certificateId?: string;
}

export interface UserProgress {
  totalResourcesCompleted: number;
  totalHoursLearned: number;
  certificates: Certificate[];
  currentPaths: LearningPath[];
  recentActivity: {
    resourceId: string;
    resourceTitle: string;
    type: ResourceType;
    completedAt: string;
  }[];
  recommendedResources: TrainingResource[];
}

/**
 * Get all training resources with optional filters
 */
export async function getTrainingResources(filters?: {
  type?: ResourceType;
  category?: ResourceCategory;
  difficulty?: DifficultyLevel;
  search?: string;
}): Promise<TrainingResource[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.search) params.append('search', filters.search);

  const response = await fetch(`${API_BASE_URL}/resources?${params}`);
  if (!response.ok) throw new Error('Failed to fetch training resources');
  return response.json();
}

/**
 * Get a specific training resource by ID
 */
export async function getTrainingResource(id: string): Promise<TrainingResource> {
  const response = await fetch(`${API_BASE_URL}/resources/${id}`);
  if (!response.ok) throw new Error('Failed to fetch training resource');
  return response.json();
}

/**
 * Mark a resource as completed
 */
export async function completeResource(resourceId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/complete`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to mark resource as completed');
}

/**
 * Update progress for a resource
 */
export async function updateResourceProgress(resourceId: string, progress: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
  });
  if (!response.ok) throw new Error('Failed to update resource progress');
}

/**
 * Bookmark a resource
 */
export async function toggleBookmark(resourceId: string, type: 'resource' | 'practice' | 'strategy'): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bookmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceId, type }),
  });
  if (!response.ok) throw new Error('Failed to toggle bookmark');
}

/**
 * Get all best practices with optional filters
 */
export async function getBestPractices(filters?: {
  category?: ResourceCategory;
  evidenceLevel?: string;
  search?: string;
}): Promise<BestPractice[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.evidenceLevel) params.append('evidenceLevel', filters.evidenceLevel);
  if (filters?.search) params.append('search', filters.search);

  const response = await fetch(`${API_BASE_URL}/best-practices?${params}`);
  if (!response.ok) throw new Error('Failed to fetch best practices');
  return response.json();
}

/**
 * Get a specific best practice by ID
 */
export async function getBestPractice(id: string): Promise<BestPractice> {
  const response = await fetch(`${API_BASE_URL}/best-practices/${id}`);
  if (!response.ok) throw new Error('Failed to fetch best practice');
  return response.json();
}

/**
 * Like a best practice
 */
export async function toggleLike(practiceId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/best-practices/${practiceId}/like`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to toggle like');
}

/**
 * Get all teaching strategies with optional filters
 */
export async function getTeachingStrategies(filters?: {
  category?: ResourceCategory;
  difficulty?: DifficultyLevel;
  grade?: string;
  search?: string;
}): Promise<TeachingStrategy[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.grade) params.append('grade', filters.grade);
  if (filters?.search) params.append('search', filters.search);

  const response = await fetch(`${API_BASE_URL}/strategies?${params}`);
  if (!response.ok) throw new Error('Failed to fetch teaching strategies');
  return response.json();
}

/**
 * Get a specific teaching strategy by ID
 */
export async function getTeachingStrategy(id: string): Promise<TeachingStrategy> {
  const response = await fetch(`${API_BASE_URL}/strategies/${id}`);
  if (!response.ok) throw new Error('Failed to fetch teaching strategy');
  return response.json();
}

/**
 * Save user notes for a strategy
 */
export async function saveStrategyNotes(strategyId: string, notes: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/strategies/${strategyId}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error('Failed to save strategy notes');
}

/**
 * Get user's learning progress and recommendations
 */
export async function getUserProgress(): Promise<UserProgress> {
  const response = await fetch(`${API_BASE_URL}/progress`);
  if (!response.ok) throw new Error('Failed to fetch user progress');
  return response.json();
}

/**
 * Get learning paths
 */
export async function getLearningPaths(): Promise<LearningPath[]> {
  const response = await fetch(`${API_BASE_URL}/learning-paths`);
  if (!response.ok) throw new Error('Failed to fetch learning paths');
  return response.json();
}

/**
 * Enroll in a learning path
 */
export async function enrollInLearningPath(pathId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/learning-paths/${pathId}/enroll`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to enroll in learning path');
}
