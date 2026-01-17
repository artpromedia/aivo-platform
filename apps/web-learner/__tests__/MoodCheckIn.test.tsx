import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MoodCheckIn } from '../app/(learning)/sel/components/MoodCheckIn';
import * as selApi from '../lib/sel-api';

// Mock the API module
vi.mock('../lib/sel-api', () => ({
  createMoodCheckIn: vi.fn(),
  getMoodCheckIns: vi.fn(),
  getSELProgress: vi.fn(),
}));

describe('MoodCheckIn', () => {
  const mockLearnerId = 'learner-123';
  
  const mockHistory = [
    {
      id: '1',
      learnerId: mockLearnerId,
      timestamp: new Date('2024-01-15').toISOString(),
      mood: 'happy',
      intensity: 4,
      triggers: ['Schoolwork'],
      copingStrategiesUsed: ['Deep breathing'],
    },
    {
      id: '2',
      learnerId: mockLearnerId,
      timestamp: new Date('2024-01-14').toISOString(),
      mood: 'worried',
      intensity: 3,
      triggers: ['Social interaction'],
      copingStrategiesUsed: ['Talked to someone'],
    },
  ];

  const mockProgress = {
    learnerId: mockLearnerId,
    totalCheckIns: 15,
    currentStreak: 5,
    longestStreak: 8,
    moodTrends: [],
    strategiesLearned: 10,
    storiesCompleted: 3,
    advocacySkillsLevel: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (selApi.getMoodCheckIns as any).mockResolvedValue(mockHistory);
    (selApi.getSELProgress as any).mockResolvedValue(mockProgress);
    (selApi.createMoodCheckIn as any).mockResolvedValue({
      id: '3',
      learnerId: mockLearnerId,
      timestamp: new Date().toISOString(),
      mood: 'calm',
      intensity: 4,
    });
  });

  it('renders mood check-in form with all mood options', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Check all mood options are present
    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.getByText('Sad')).toBeInTheDocument();
    expect(screen.getByText('Angry')).toBeInTheDocument();
    expect(screen.getByText('Worried')).toBeInTheDocument();
    expect(screen.getByText('Calm')).toBeInTheDocument();
    expect(screen.getByText('Excited')).toBeInTheDocument();
    expect(screen.getByText('Frustrated')).toBeInTheDocument();
    expect(screen.getByText('Tired')).toBeInTheDocument();
  });

  it('displays progress stats correctly', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument(); // Total check-ins
      expect(screen.getByText(/5 days/)).toBeInTheDocument(); // Current streak
      expect(screen.getByText(/8 days/)).toBeInTheDocument(); // Longest streak
    });
  });

  it('shows recent check-in history', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Check-Ins')).toBeInTheDocument();
      expect(screen.getByText(/Happy/i)).toBeInTheDocument();
      expect(screen.getByText(/Worried/i)).toBeInTheDocument();
    });
  });

  it('allows selecting a mood and adjusting intensity', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Select a mood
    const happyButton = screen.getByRole('button', { name: /Happy/i });
    fireEvent.click(happyButton);

    // Intensity slider should appear
    await waitFor(() => {
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('3'); // Default intensity
    });
  });

  it('allows selecting triggers and coping strategies', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Click trigger
    const schoolworkButton = screen.getByRole('button', { name: 'Schoolwork' });
    fireEvent.click(schoolworkButton);
    expect(schoolworkButton).toHaveClass('bg-indigo-100');

    // Click coping strategy
    const breathingButton = screen.getByRole('button', { name: 'Deep breathing' });
    fireEvent.click(breathingButton);
    expect(breathingButton).toHaveClass('bg-green-100');
  });

  it('submits check-in with selected data', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Select mood
    const calmButton = screen.getByRole('button', { name: /Calm/i });
    fireEvent.click(calmButton);

    // Wait for intensity slider
    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    // Select trigger
    fireEvent.click(screen.getByRole('button', { name: 'Schoolwork' }));

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Save Check-In' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(selApi.createMoodCheckIn).toHaveBeenCalledWith(mockLearnerId, expect.objectContaining({
        mood: 'calm',
        intensity: 3,
        triggers: ['Schoolwork'],
      }));
    });
  });

  it('shows success message after submission', async () => {
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Select and submit
    fireEvent.click(screen.getByRole('button', { name: /Happy/i }));
    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Check-In' }));

    await waitFor(() => {
      expect(screen.getByText(/Check-in saved successfully/)).toBeInTheDocument();
    });
  });

  it('displays empty state when no history', async () => {
    (selApi.getMoodCheckIns as any).mockResolvedValue([]);
    
    render(<MoodCheckIn learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText(/No check-ins yet/)).toBeInTheDocument();
    });
  });
});
