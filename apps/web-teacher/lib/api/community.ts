/**
 * Community API Client
 * Types and fetch functions for teacher community hub.
 *
 * Backend Service: COMING SOON - No backend exists yet
 * When mock mode is disabled, all functions throw a "Coming Soon" error.
 * This feature is planned for a future release.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Error class for coming soon features
class ComingSoonError extends Error {
  constructor(feature: string) {
    super(`${feature} is coming soon! This feature is currently in development.`);
    this.name = 'ComingSoonError';
  }
}

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

  // Community feature is coming soon - no backend service exists yet
  throw new ComingSoonError('Teacher Community');
}

export async function fetchResources(
  accessToken: string,
  options?: { type?: ResourceType; subject?: string; gradeLevel?: string }
): Promise<SharedResource[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockResources();
  }

  // Community feature is coming soon - no backend service exists yet
  throw new ComingSoonError('Community Resources');
}

export async function fetchCommunityStats(accessToken: string): Promise<CommunityStats> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockCommunityStats();
  }

  // Community feature is coming soon - no backend service exists yet
  throw new ComingSoonError('Community Stats');
}

export async function likePost(postId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  // Community feature is coming soon - no backend service exists yet
  throw new ComingSoonError('Post Likes');
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

  // Community feature is coming soon - no backend service exists yet
  throw new ComingSoonError('Create Post');
}

// Export the ComingSoonError for UI handling
export { ComingSoonError };
