/**
 * Community API Client
 * Types and fetch functions for teacher community hub.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type PostCategory = 'discussion' | 'resource' | 'question' | 'success-story';

export interface PostAuthor {
  id: string;
  name: string;
  role: string;
  school: string;
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
  tags?: string[];
}

export type ResourceType = 'lesson' | 'activity' | 'worksheet' | 'game';

export interface SharedResource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  subject: string;
  gradeLevel: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  author: string;
  authorId: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface CommunityStats {
  totalPosts: number;
  totalComments: number;
  resourcesShared: number;
  likesReceived: number;
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
        role: 'Math Teacher',
        school: 'Lincoln Elementary',
      },
      title: 'Great strategies for teaching fractions to 4th graders',
      content:
        "I've found that using visual fraction tiles combined with the adaptive games really helps struggling learners. My students' scores improved 20% this month!",
      category: 'success-story',
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
        role: 'Special Ed Teacher',
        school: 'Oak Park Academy',
      },
      title: 'How do you handle focus breaks for kids with ADHD?',
      content:
        "I'm looking for advice on timing and types of focus breaks. The built-in breathing exercises are great, but I'm wondering what intervals work best for others.",
      category: 'question',
      likes: 15,
      comments: 12,
      createdAt: '5 hours ago',
    },
    {
      id: '3',
      author: {
        id: 'u3',
        name: 'Emily Chen',
        role: 'Reading Specialist',
        school: 'Riverside School',
      },
      title: 'New phonics activity pack for K-2',
      content:
        'Just uploaded a collection of 15 phonics activities that integrate with the adaptive reading games. Great for differentiated instruction!',
      category: 'resource',
      likes: 42,
      comments: 6,
      createdAt: '1 day ago',
    },
    {
      id: '4',
      author: {
        id: 'u4',
        name: 'David Park',
        role: '3rd Grade Teacher',
        school: 'Sunshine Elementary',
      },
      title: 'Team competitions - what works for you?',
      content:
        "I'm starting team competitions next week. Any tips on setting up fair teams and keeping motivation high throughout the week?",
      category: 'discussion',
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
      type: 'lesson',
      subject: 'Math',
      gradeLevel: '3-5',
      downloads: 234,
      rating: 4.8,
      ratingCount: 45,
      author: 'Sarah Thompson',
      authorId: 'u1',
      createdAt: '2024-12-01',
    },
    {
      id: '2',
      title: 'Reading Comprehension Strategies',
      type: 'activity',
      subject: 'Reading',
      gradeLevel: 'K-2',
      downloads: 189,
      rating: 4.6,
      ratingCount: 32,
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
      rating: 4.5,
      ratingCount: 28,
      author: 'Community',
      authorId: 'system',
      createdAt: '2024-11-25',
    },
    {
      id: '4',
      title: 'Word Family Matching Game',
      type: 'game',
      subject: 'Reading',
      gradeLevel: 'K-1',
      downloads: 312,
      rating: 4.9,
      ratingCount: 67,
      author: 'Community',
      authorId: 'system',
      createdAt: '2024-11-20',
    },
  ];
}

function mockCommunityStats(): CommunityStats {
  return {
    totalPosts: 12,
    totalComments: 48,
    resourcesShared: 5,
    likesReceived: 127,
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
  if (options?.category) params.set('category', options.category);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const res = await fetch(`${API_BASE_URL}/api/v1/community/posts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }

  return res.json() as Promise<Post[]>;
}

export async function fetchResources(
  accessToken: string,
  options?: { type?: ResourceType; subject?: string; gradeLevel?: string }
): Promise<SharedResource[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockResources();
  }

  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.subject) params.set('subject', options.subject);
  if (options?.gradeLevel) params.set('gradeLevel', options.gradeLevel);

  const res = await fetch(`${API_BASE_URL}/api/v1/community/resources?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch resources: ${res.status}`);
  }

  return res.json() as Promise<SharedResource[]>;
}

export async function fetchCommunityStats(accessToken: string): Promise<CommunityStats> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockCommunityStats();
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/community/stats`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch community stats: ${res.status}`);
  }

  return res.json() as Promise<CommunityStats>;
}

export async function likePost(postId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/community/posts/${postId}/like`, {
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

export async function createPost(
  post: { title: string; content: string; category: PostCategory },
  accessToken: string
): Promise<Post> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      id: `post-${Date.now()}`,
      author: { id: 'current-user', name: 'You', role: 'Teacher', school: 'Your School' },
      ...post,
      likes: 0,
      comments: 0,
      createdAt: 'Just now',
    };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/community/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post),
  });

  if (!res.ok) {
    throw new Error(`Failed to create post: ${res.status}`);
  }

  return res.json() as Promise<Post>;
}
