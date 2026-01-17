import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ParentForum } from '@/components/community-support/parent-forum';
import * as communityHooks from '@/hooks/use-community-support';

vi.mock('@/hooks/use-community-support');

const mockForumPosts = [
  {
    id: 'post-1',
    title: 'How to support my child with reading?',
    content: 'Looking for advice on reading strategies',
    category: 'learning-support' as const,
    authorId: 'user-1',
    authorName: 'Sarah Johnson',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
    status: 'active' as const,
    viewCount: 45,
    replyCount: 8,
    likeCount: 12,
    isLiked: false,
    isPinned: false,
    tags: ['reading', 'learning'],
  },
];

describe('CommunitySupport', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forum posts', async () => {
    vi.spyOn(communityHooks, 'useForumPosts').mockReturnValue({
      data: mockForumPosts,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(communityHooks, 'useCreateForumPost').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(communityHooks, 'useCreateForumReply').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(communityHooks, 'useToggleForumLike').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ParentForum />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Community Forum')).toBeInTheDocument();
      expect(screen.getByText('How to support my child with reading?')).toBeInTheDocument();
    });
  });

  it('displays post details', async () => {
    vi.spyOn(communityHooks, 'useForumPosts').mockReturnValue({
      data: mockForumPosts,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(communityHooks, 'useCreateForumPost').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(communityHooks, 'useCreateForumReply').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(communityHooks, 'useToggleForumLike').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ParentForum />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('8 replies')).toBeInTheDocument();
      expect(screen.getByText('45 views')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });
  });
});

describe('CommunitySupport API', () => {
  it('fetches forum posts', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockForumPosts),
      })
    );
    global.fetch = mockFetch as any;

    const { getForumPosts } = await import('@/lib/api/community-support-api');
    const result = await getForumPosts();

    expect(result).toEqual(mockForumPosts);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/parent/forum/posts')
    );
  });

  it('creates forum post', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockForumPosts[0]),
      })
    );
    global.fetch = mockFetch as any;

    const { createForumPost } = await import('@/lib/api/community-support-api');
    await createForumPost({
      title: 'Test Post',
      content: 'Test Content',
      category: 'general',
      tags: [],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/forum/posts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Post',
          content: 'Test Content',
          category: 'general',
          tags: [],
        }),
      })
    );
  });

  it('fetches questions', async () => {
    const mockQuestions = [
      {
        id: 'q-1',
        title: 'IEP question',
        content: 'Need help with IEP process',
        category: 'legal' as const,
        authorId: 'user-1',
        authorName: 'Parent',
        createdAt: '2026-01-10',
        updatedAt: '2026-01-10',
        status: 'open' as const,
        viewCount: 20,
        answerCount: 3,
        likeCount: 5,
        isLiked: false,
        tags: ['iep'],
        hasExpertAnswer: true,
      },
    ];

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockQuestions),
      })
    );
    global.fetch = mockFetch as any;

    const { getQuestions } = await import('@/lib/api/community-support-api');
    const result = await getQuestions();

    expect(result).toEqual(mockQuestions);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/parent/qa/questions')
    );
  });

  it('handles API errors', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    );
    global.fetch = mockFetch as any;

    const { getForumPosts } = await import('@/lib/api/community-support-api');

    await expect(getForumPosts()).rejects.toThrow('Failed to fetch forum posts');
  });
});
