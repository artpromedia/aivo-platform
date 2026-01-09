/**
 * Community API Client
 * Types and fetch functions for teacher community hub.
 *
 * Backend Service: community-svc (port 3050)
 */

import { getServiceUrl } from '../env-utils';

const COMMUNITY_SVC_URL = getServiceUrl(
  'NEXT_PUBLIC_COMMUNITY_SVC_URL',
  'http://localhost:3050',
  'Community API'
);

// Production-safe mock mode check
// CRITICAL: This pattern ensures mock data is NEVER returned in production
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const MOCK_REQUESTED = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const USE_MOCK = IS_DEVELOPMENT && MOCK_REQUESTED;

// Warn if mock mode is requested in production (but don't enable it)
if (process.env.NODE_ENV === 'production' && MOCK_REQUESTED) {
  console.warn('[Community API] USE_MOCK ignored in production - using real API');
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type PostCategory = 'tips' | 'questions' | 'success-stories' | 'general' | 'announcements';

export interface PostAuthor {
  id: string;
  name: string;
  role: string;
  school?: string;
  avatarUrl?: string;
}

export interface Post {
  id: string;
  author: PostAuthor;
  title: string;
  content: string;
  category: PostCategory;
  likes: number;
  comments: number;
  createdAt: string;
  isLiked?: boolean;
  isPinned?: boolean;
  tags?: string[];
}

export type ResourceType = 'lesson-plan' | 'worksheet' | 'presentation' | 'video' | 'assessment' | 'other';

export interface SharedResource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  subject?: string;
  gradeLevel?: string;
  downloads: number;
  likes: number;
  author: string;
  authorId: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  createdAt: string;
}

export interface CommunityStats {
  totalPosts: number;
  totalResources: number;
  totalComments: number;
  activeUsers: number;
  trendingTopics?: Array<{ category: string; count: number }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function mockPosts(): Post[] {
  return [
    {
      id: '1',
      author: {
        id: 'u1',
        name: 'Sarah Thompson',
        role: 'teacher',
        school: 'Lincoln Elementary',
      },
      title: 'Great strategies for teaching fractions to 4th graders',
      content:
        "I've found that using visual fraction tiles combined with the adaptive games really helps struggling learners. My students' scores improved 20% this month!",
      category: 'success-stories',
      likes: 24,
      comments: 8,
      createdAt: '2 hours ago',
      isLiked: true,
    },
    {
      id: '2',
      author: {
        id: 'u2',
        name: 'Michael Rodriguez',
        role: 'practitioner',
        school: 'Oak Park Academy',
      },
      title: 'How do you handle focus breaks for kids with ADHD?',
      content:
        "I'm looking for advice on timing and types of focus breaks. The built-in breathing exercises are great, but I'm wondering what intervals work best for others.",
      category: 'questions',
      likes: 15,
      comments: 12,
      createdAt: '5 hours ago',
    },
    {
      id: '3',
      author: {
        id: 'u3',
        name: 'Emily Chen',
        role: 'teacher',
        school: 'Riverside School',
      },
      title: 'New phonics activity pack for K-2',
      content:
        'Just uploaded a collection of 15 phonics activities that integrate with the adaptive reading games. Great for differentiated instruction!',
      category: 'tips',
      likes: 42,
      comments: 6,
      createdAt: '1 day ago',
    },
    {
      id: '4',
      author: {
        id: 'u4',
        name: 'David Park',
        role: 'parent',
        school: 'Sunshine Elementary',
      },
      title: 'Team competitions - what works for you?',
      content:
        "I'm starting team competitions next week. Any tips on setting up fair teams and keeping motivation high throughout the week?",
      category: 'general',
      likes: 8,
      comments: 14,
      createdAt: '2 days ago',
    },
  ];
}

function mockResources(): SharedResource[] {
  return [
    {
      id: '1',
      title: 'Fraction Fundamentals Pack',
      type: 'lesson-plan',
      subject: 'Math',
      gradeLevel: '3-5',
      downloads: 234,
      likes: 45,
      author: 'Sarah Thompson',
      authorId: 'u1',
      createdAt: '2024-12-01',
    },
    {
      id: '2',
      title: 'Reading Comprehension Strategies',
      type: 'worksheet',
      subject: 'Reading',
      gradeLevel: 'K-2',
      downloads: 189,
      likes: 32,
      author: 'Emily Chen',
      authorId: 'u3',
      createdAt: '2024-11-28',
    },
    {
      id: '3',
      title: 'Multiplication Practice Worksheets',
      type: 'worksheet',
      subject: 'Math',
      gradeLevel: '2-4',
      downloads: 156,
      likes: 28,
      author: 'Community',
      authorId: 'system',
      createdAt: '2024-11-25',
    },
    {
      id: '4',
      title: 'Word Family Matching Presentation',
      type: 'presentation',
      subject: 'Reading',
      gradeLevel: 'K-1',
      downloads: 312,
      likes: 67,
      author: 'Community',
      authorId: 'system',
      createdAt: '2024-11-20',
    },
  ];
}

function mockCommunityStats(): CommunityStats {
  return {
    totalPosts: 156,
    totalResources: 42,
    totalComments: 523,
    activeUsers: 89,
    trendingTopics: [
      { category: 'tips', count: 34 },
      { category: 'questions', count: 28 },
      { category: 'success-stories', count: 21 },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchPosts(
  accessToken: string,
  options?: { category?: PostCategory; limit?: number; offset?: number }
): Promise<Post[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const posts = mockPosts();
    return options?.category ? posts.filter((p) => p.category === options.category) : posts;
  }

  const params = new URLSearchParams();
  if (options?.category) {
    // Map frontend category to backend enum
    const categoryMap: Record<PostCategory, string> = {
      'tips': 'TIPS',
      'questions': 'QUESTIONS',
      'success-stories': 'SUCCESS_STORIES',
      'general': 'GENERAL',
      'announcements': 'ANNOUNCEMENTS',
    };
    params.set('category', categoryMap[options.category]);
  }
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const res = await fetch(`${COMMUNITY_SVC_URL}/posts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? data;
}

export async function fetchResources(
  accessToken: string,
  options?: { type?: ResourceType; subject?: string; gradeLevel?: string }
): Promise<SharedResource[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let resources = mockResources();
    if (options?.type) {
      resources = resources.filter((r) => r.type === options.type);
    }
    if (options?.subject) {
      resources = resources.filter((r) => r.subject === options.subject);
    }
    return resources;
  }

  const params = new URLSearchParams();
  if (options?.type) {
    // Map frontend type to backend enum
    const typeMap: Record<ResourceType, string> = {
      'lesson-plan': 'LESSON_PLAN',
      'worksheet': 'WORKSHEET',
      'presentation': 'PRESENTATION',
      'video': 'VIDEO',
      'assessment': 'ASSESSMENT',
      'other': 'OTHER',
    };
    params.set('type', typeMap[options.type]);
  }
  if (options?.subject) params.set('subject', options.subject);
  if (options?.gradeLevel) params.set('gradeLevel', options.gradeLevel);

  const res = await fetch(`${COMMUNITY_SVC_URL}/resources?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch resources: ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? data;
}

export async function fetchCommunityStats(accessToken: string): Promise<CommunityStats> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockCommunityStats();
  }

  const res = await fetch(`${COMMUNITY_SVC_URL}/stats`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch community stats: ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? data;
}

export async function likePost(postId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${COMMUNITY_SVC_URL}/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to like post: ${res.status}`);
  }
}

export async function unlikePost(postId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${COMMUNITY_SVC_URL}/posts/${postId}/like`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to unlike post: ${res.status}`);
  }
}

export async function createPost(
  post: { title: string; content: string; category: PostCategory },
  accessToken: string
): Promise<Post> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      id: `post-${Date.now()}`,
      author: { id: 'current-user', name: 'You', role: 'teacher', school: 'Your School' },
      ...post,
      likes: 0,
      comments: 0,
      createdAt: 'Just now',
    };
  }

  // Map frontend category to backend enum
  const categoryMap: Record<PostCategory, string> = {
    'tips': 'TIPS',
    'questions': 'QUESTIONS',
    'success-stories': 'SUCCESS_STORIES',
    'general': 'GENERAL',
    'announcements': 'ANNOUNCEMENTS',
  };

  const res = await fetch(`${COMMUNITY_SVC_URL}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: post.title,
      content: post.content,
      category: categoryMap[post.category],
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create post: ${res.status}`);
  }

  const data = await res.json();
  return data.data ?? data;
}

export async function addComment(
  postId: string,
  content: string,
  accessToken: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  const res = await fetch(`${COMMUNITY_SVC_URL}/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(`Failed to add comment: ${res.status}`);
  }
}

export async function likeResource(resourceId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${COMMUNITY_SVC_URL}/resources/${resourceId}/like`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to like resource: ${res.status}`);
  }
}

export async function downloadResource(resourceId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${COMMUNITY_SVC_URL}/resources/${resourceId}/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to track download: ${res.status}`);
  }
}
