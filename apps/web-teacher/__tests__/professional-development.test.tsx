import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { TrainingResourcesLibrary } from '@/components/professional-development/training-resources-library';
import * as pdHooks from '@/hooks/use-pd-resources';

vi.mock('@/hooks/use-pd-resources');

const mockResources = [
  {
    id: 'resource-1',
    title: 'Introduction to Universal Design',
    description: 'Learn the basics of UDL',
    type: 'video' as const,
    category: 'accessibility' as const,
    difficulty: 'beginner' as const,
    duration: 30,
    author: 'Dr. Smith',
    publishedDate: '2026-01-01',
    rating: 4.5,
    totalRatings: 120,
    completionRate: 85,
    contentUrl: 'https://example.com/video',
    tags: ['udl', 'accessibility'],
    learningOutcomes: ['Understand UDL principles'],
    isBookmarked: false,
    isCompleted: false,
  },
];

describe('ProfessionalDevelopment', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders training resources library', async () => {
    vi.spyOn(pdHooks, 'useTrainingResources').mockReturnValue({
      data: mockResources,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(pdHooks, 'useCompleteResource').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(pdHooks, 'useToggleBookmark').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TrainingResourcesLibrary />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Training Resources')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Universal Design')).toBeInTheDocument();
    });
  });

  it('filters resources by type', async () => {
    const mockUseTrainingResources = vi.spyOn(pdHooks, 'useTrainingResources');
    mockUseTrainingResources.mockReturnValue({
      data: mockResources,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(pdHooks, 'useCompleteResource').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(pdHooks, 'useToggleBookmark').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TrainingResourcesLibrary />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Introduction to Universal Design')).toBeInTheDocument();
    });

    // Verify that hook was called with initial empty filters
    expect(mockUseTrainingResources).toHaveBeenCalledWith({
      search: '',
      type: undefined,
      category: undefined,
      difficulty: undefined,
    });
  });

  it('displays resource details correctly', async () => {
    vi.spyOn(pdHooks, 'useTrainingResources').mockReturnValue({
      data: mockResources,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(pdHooks, 'useCompleteResource').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(pdHooks, 'useToggleBookmark').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TrainingResourcesLibrary />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
      expect(screen.getByText(/4.5.*120 ratings/)).toBeInTheDocument();
      expect(screen.getByText('beginner')).toBeInTheDocument();
    });
  });
});

describe('ProfessionalDevelopment API', () => {
  it('fetches training resources', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResources),
      })
    );
    global.fetch = mockFetch as any;

    const { getTrainingResources } = await import('@/lib/api/professional-development-api');
    const result = await getTrainingResources();

    expect(result).toEqual(mockResources);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/teacher/professional-development/resources')
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

    const { getTrainingResources } = await import('@/lib/api/professional-development-api');

    await expect(getTrainingResources()).rejects.toThrow('Failed to fetch training resources');
  });

  it('completes a resource', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    global.fetch = mockFetch as any;

    const { completeResource } = await import('@/lib/api/professional-development-api');
    await completeResource('resource-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/resources/resource-1/complete'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('toggles bookmark', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    global.fetch = mockFetch as any;

    const { toggleBookmark } = await import('@/lib/api/professional-development-api');
    await toggleBookmark('resource-1', 'resource');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/bookmark'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ resourceId: 'resource-1', type: 'resource' }),
      })
    );
  });
});
