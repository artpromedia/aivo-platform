import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SocialStories } from '../app/(learning)/sel/components/SocialStories';
import * as selApi from '../lib/sel-api';

// Mock the API module
vi.mock('../lib/sel-api', () => ({
  getSocialStories: vi.fn(),
  getStoryById: vi.fn(),
  markStoryCompleted: vi.fn(),
  toggleStoryFavorite: vi.fn(),
}));

describe('SocialStories', () => {
  const mockLearnerId = 'learner-123';

  const mockStories = [
    {
      id: 'story-1',
      title: 'Starting a New School',
      category: 'school',
      description: 'Learn about what to expect on your first day',
      pages: [
        { id: 'p1', order: 0, text: 'Page 1 content' },
        { id: 'p2', order: 1, text: 'Page 2 content' },
      ],
      ageRange: '8-12',
      difficulty: 'easy',
      completed: false,
      favorite: false,
    },
    {
      id: 'story-2',
      title: 'Making New Friends',
      category: 'social',
      description: 'Tips for starting conversations',
      pages: [
        { id: 'p1', order: 0, text: 'Page 1 content' },
      ],
      ageRange: '10-14',
      difficulty: 'medium',
      completed: true,
      favorite: true,
    },
  ];

  const mockFullStory = {
    ...mockStories[0],
    pages: [
      {
        id: 'p1',
        order: 0,
        text: 'Tomorrow is your first day at a new school.',
        imageUrl: '/images/school.jpg',
        audioUrl: '/audio/page1.mp3',
        questions: [
          {
            id: 'q1',
            question: 'How might you feel on your first day?',
            type: 'multiple-choice' as const,
            options: ['Excited', 'Nervous', 'Both'],
          },
        ],
      },
      {
        id: 'p2',
        order: 1,
        text: 'You will meet new teachers and classmates.',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (selApi.getSocialStories as any).mockResolvedValue(mockStories);
    (selApi.getStoryById as any).mockResolvedValue(mockFullStory);
    (selApi.markStoryCompleted as any).mockResolvedValue(undefined);
    (selApi.toggleStoryFavorite as any).mockResolvedValue(undefined);
  });

  it('renders social stories grid with all stories', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
      expect(screen.getByText('Making New Friends')).toBeInTheDocument();
    });
  });

  it('displays story metadata correctly', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('8-12')).toBeInTheDocument();
      expect(screen.getByText('easy')).toBeInTheDocument();
      expect(screen.getByText(/2 pages/)).toBeInTheDocument();
    });
  });

  it('shows completed checkmark for completed stories', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      const cards = screen.getAllByRole('article');
      // Second story should have completed checkmark
      expect(cards[1]).toHaveTextContent('✓');
    });
  });

  it('filters stories by category', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    // Click school category filter
    const schoolButton = screen.getByRole('button', { name: /School/i });
    fireEvent.click(schoolButton);

    // Should show only school stories
    expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    expect(screen.queryByText('Making New Friends')).not.toBeInTheDocument();
  });

  it('opens story reader modal when clicking Read Story', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    const readButton = screen.getAllByRole('button', { name: /Read Story/ })[0];
    fireEvent.click(readButton);

    await waitFor(() => {
      expect(selApi.getStoryById).toHaveBeenCalledWith('story-1');
      expect(screen.getByText('Tomorrow is your first day at a new school.')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });

  it('navigates through story pages', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    // Open story
    fireEvent.click(screen.getAllByRole('button', { name: /Read Story/ })[0]);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    // Navigate to next page
    const nextButton = screen.getByRole('button', { name: /Next Page/ });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('You will meet new teachers and classmates.')).toBeInTheDocument();
    });
  });

  it('marks story as completed when finished', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    // Open and navigate to last page
    fireEvent.click(screen.getAllByRole('button', { name: /Read Story/ })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Page/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Next Page/ }));

    // Click finish on last page
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Finish Story/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Finish Story/ }));

    await waitFor(() => {
      expect(selApi.markStoryCompleted).toHaveBeenCalledWith(mockLearnerId, 'story-1');
    });
  });

  it('toggles favorite status', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    // Find favorite buttons (☆ for unfavorited)
    const favoriteButtons = screen.getAllByRole('button', { name: /favorite/ });
    fireEvent.click(favoriteButtons[0]);

    await waitFor(() => {
      expect(selApi.toggleStoryFavorite).toHaveBeenCalledWith(mockLearnerId, 'story-1', true);
    });
  });

  it('displays empty state when no stories in category', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    // Filter to category with no stories
    const conflictButton = screen.getByRole('button', { name: /Conflict/i });
    fireEvent.click(conflictButton);

    await waitFor(() => {
      expect(screen.getByText('No stories found in this category.')).toBeInTheDocument();
    });
  });

  it('displays interactive questions on story pages', async () => {
    render(<SocialStories learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Starting a New School')).toBeInTheDocument();
    });

    // Open story
    fireEvent.click(screen.getAllByRole('button', { name: /Read Story/ })[0]);

    await waitFor(() => {
      expect(screen.getByText('How might you feel on your first day?')).toBeInTheDocument();
      expect(screen.getByText('Excited')).toBeInTheDocument();
      expect(screen.getByText('Nervous')).toBeInTheDocument();
    });
  });
});
