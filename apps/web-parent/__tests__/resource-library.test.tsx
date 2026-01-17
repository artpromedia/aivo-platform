import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ResourceBrowser } from '@/components/resource-library/resource-browser';
import * as resourceHooks from '@/hooks/use-resource-library';

vi.mock('@/hooks/use-resource-library');

const mockResources = [
  {
    id: 'resource-1',
    title: 'Supporting Your Child with Reading',
    description: 'Practical strategies for home reading support',
    type: 'guide' as const,
    category: 'learning-support' as const,
    ageGroups: ['elementary' as const],
    difficulty: 'beginner' as const,
    duration: 15,
    author: 'Education Team',
    publishedDate: '2026-01-01',
    rating: 4.5,
    totalRatings: 89,
    viewCount: 1234,
    downloadCount: 456,
    tags: ['reading', 'literacy'],
    contentUrl: 'https://example.com/guide',
    relatedResources: [],
    isBookmarked: false,
    isFavorite: false,
  },
];

describe('ResourceLibrary', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resource browser', async () => {
    vi.spyOn(resourceHooks, 'useResources').mockReturnValue({
      data: mockResources,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(resourceHooks, 'useToggleResourceBookmark').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(resourceHooks, 'useToggleResourceFavorite').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ResourceBrowser />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Find Resources')).toBeInTheDocument();
      expect(screen.getByText('Supporting Your Child with Reading')).toBeInTheDocument();
    });
  });

  it('displays resource details', async () => {
    vi.spyOn(resourceHooks, 'useResources').mockReturnValue({
      data: mockResources,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(resourceHooks, 'useToggleResourceBookmark').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(resourceHooks, 'useToggleResourceFavorite').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ResourceBrowser />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('15 minutes')).toBeInTheDocument();
      expect(screen.getByText(/4.5.*89 ratings/)).toBeInTheDocument();
      expect(screen.getByText('beginner')).toBeInTheDocument();
    });
  });
});

describe('ResourceLibrary API', () => {
  it('fetches resources', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResources),
      })
    );
    global.fetch = mockFetch as any;

    const { getResources } = await import('@/lib/api/resource-library-api');
    const result = await getResources();

    expect(result).toEqual(mockResources);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/parent/resources')
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

    const { getResources } = await import('@/lib/api/resource-library-api');

    await expect(getResources()).rejects.toThrow('Failed to fetch resources');
  });

  it('toggles bookmark', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    global.fetch = mockFetch as any;

    const { toggleResourceBookmark } = await import('@/lib/api/resource-library-api');
    await toggleResourceBookmark('resource-1', 'resource');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/bookmarks'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ resourceId: 'resource-1', type: 'resource' }),
      })
    );
  });

  it('fetches videos', async () => {
    const mockVideos = [
      {
        id: 'video-1',
        title: 'Reading Strategies',
        description: 'Video tutorial',
        thumbnailUrl: 'thumb.jpg',
        videoUrl: 'video.mp4',
        duration: 300,
        category: 'learning-support' as const,
        ageGroups: ['elementary' as const],
        instructor: 'Jane Doe',
        publishedDate: '2026-01-01',
        chapters: [],
        rating: 4.7,
        totalRatings: 45,
        viewCount: 890,
        relatedVideos: [],
        isBookmarked: false,
        progress: 50,
      },
    ];

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVideos),
      })
    );
    global.fetch = mockFetch as any;

    const { getVideos } = await import('@/lib/api/resource-library-api');
    const result = await getVideos();

    expect(result).toEqual(mockVideos);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/parent/videos')
    );
  });
});
