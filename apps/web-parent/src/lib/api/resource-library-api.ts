const BASE_URL = 'http://localhost:8098';

// Resource types
export type ResourceType = 'video' | 'article' | 'guide' | 'webinar' | 'pdf' | 'interactive';
export type ResourceCategory = 'learning-support' | 'homework-help' | 'behavior-management' | 'communication' | 'technology' | 'special-education' | 'wellbeing' | 'development';
export type AgeGroup = 'preschool' | 'elementary' | 'middle' | 'high';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Resource interfaces
export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  ageGroups: AgeGroup[];
  difficulty: DifficultyLevel;
  duration?: number; // in minutes
  thumbnailUrl?: string;
  author: string;
  publishedDate: string;
  rating: number;
  totalRatings: number;
  viewCount: number;
  downloadCount: number;
  tags: string[];
  contentUrl: string;
  downloadUrl?: string;
  relatedResources: string[];
  isBookmarked: boolean;
  isFavorite: boolean;
  lastViewed?: string;
  progress?: number; // 0-100 for videos
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  category: ResourceCategory;
  ageGroups: AgeGroup[];
  instructor: string;
  publishedDate: string;
  transcript?: string;
  chapters: VideoChapter[];
  rating: number;
  totalRatings: number;
  viewCount: number;
  relatedVideos: string[];
  isBookmarked: boolean;
  progress: number;
  lastWatchedPosition?: number;
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category: ResourceCategory;
  ageGroups: AgeGroup[];
  difficulty: DifficultyLevel;
  author: string;
  publishedDate: string;
  updatedDate?: string;
  estimatedReadTime: number; // in minutes
  sections: GuideSection[];
  downloadUrl?: string;
  rating: number;
  totalRatings: number;
  downloadCount: number;
  relatedGuides: string[];
  isBookmarked: boolean;
  isFavorite: boolean;
}

export interface GuideSection {
  id: string;
  title: string;
  content: string; // Markdown
  order: number;
  tips?: string[];
  resources?: { title: string; url: string }[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImageUrl?: string;
  category: ResourceCategory;
  resourceIds: string[];
  resourceCount: number;
  curator: string;
  createdDate: string;
  updatedDate: string;
  isPublic: boolean;
  tags: string[];
}

export interface UserActivity {
  recentlyViewed: Resource[];
  bookmarked: Resource[];
  favorites: Resource[];
  downloaded: Resource[];
  recommendedForYou: Resource[];
  popularResources: Resource[];
}

// Resource Library API
export async function getResources(filters?: {
  search?: string;
  type?: ResourceType;
  category?: ResourceCategory;
  ageGroup?: AgeGroup;
  difficulty?: DifficultyLevel;
}): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.ageGroup) params.append('ageGroup', filters.ageGroup);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);

  const response = await fetch(
    `${BASE_URL}/api/parent/resources?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch resources');
  }
  
  return response.json();
}

export async function getResource(id: string): Promise<Resource> {
  const response = await fetch(`${BASE_URL}/api/parent/resources/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch resource');
  }
  
  return response.json();
}

export async function trackResourceView(resourceId: string): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/parent/resources/${resourceId}/view`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to track resource view');
  }
}

export async function updateResourceProgress(
  resourceId: string,
  progress: number
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/parent/resources/${resourceId}/progress`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to update resource progress');
  }
}

export async function toggleResourceBookmark(
  resourceId: string,
  type: 'resource' | 'video' | 'guide' = 'resource'
): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceId, type }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to toggle bookmark');
  }
}

export async function toggleResourceFavorite(resourceId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/parent/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to toggle favorite');
  }
}

export async function downloadResource(resourceId: string): Promise<Blob> {
  const response = await fetch(
    `${BASE_URL}/api/parent/resources/${resourceId}/download`
  );
  
  if (!response.ok) {
    throw new Error('Failed to download resource');
  }
  
  return response.blob();
}

// Video API
export async function getVideos(filters?: {
  search?: string;
  category?: ResourceCategory;
  ageGroup?: AgeGroup;
}): Promise<Video[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.ageGroup) params.append('ageGroup', filters.ageGroup);

  const response = await fetch(
    `${BASE_URL}/api/parent/videos?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }
  
  return response.json();
}

export async function getVideo(id: string): Promise<Video> {
  const response = await fetch(`${BASE_URL}/api/parent/videos/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch video');
  }
  
  return response.json();
}

export async function updateVideoProgress(
  videoId: string,
  progress: number,
  position: number
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/parent/videos/${videoId}/progress`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, position }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to update video progress');
  }
}

// Guide API
export async function getGuides(filters?: {
  search?: string;
  category?: ResourceCategory;
  ageGroup?: AgeGroup;
  difficulty?: DifficultyLevel;
}): Promise<Guide[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.ageGroup) params.append('ageGroup', filters.ageGroup);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);

  const response = await fetch(
    `${BASE_URL}/api/parent/guides?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch guides');
  }
  
  return response.json();
}

export async function getGuide(id: string): Promise<Guide> {
  const response = await fetch(`${BASE_URL}/api/parent/guides/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch guide');
  }
  
  return response.json();
}

// Collections API
export async function getCollections(filters?: {
  search?: string;
  category?: ResourceCategory;
}): Promise<Collection[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);

  const response = await fetch(
    `${BASE_URL}/api/parent/collections?${params.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }
  
  return response.json();
}

export async function getCollection(id: string): Promise<Collection> {
  const response = await fetch(`${BASE_URL}/api/parent/collections/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch collection');
  }
  
  return response.json();
}

export async function createCollection(data: {
  name: string;
  description: string;
  category: ResourceCategory;
  isPublic: boolean;
}): Promise<Collection> {
  const response = await fetch(`${BASE_URL}/api/parent/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create collection');
  }
  
  return response.json();
}

export async function addToCollection(
  collectionId: string,
  resourceId: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/parent/collections/${collectionId}/resources`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to add resource to collection');
  }
}

export async function removeFromCollection(
  collectionId: string,
  resourceId: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/parent/collections/${collectionId}/resources/${resourceId}`,
    {
      method: 'DELETE',
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to remove resource from collection');
  }
}

// User Activity API
export async function getUserActivity(): Promise<UserActivity> {
  const response = await fetch(`${BASE_URL}/api/parent/activity`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch user activity');
  }
  
  return response.json();
}
