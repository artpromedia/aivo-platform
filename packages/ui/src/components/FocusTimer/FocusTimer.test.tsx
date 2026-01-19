import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FocusTimer } from './FocusTimer';
import type { FocusPreferences } from '../../types';

const defaultPreferences: FocusPreferences = {
  defaultMode: 'pomodoro',
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  customWorkMinutes: 45,
  customBreakMinutes: 10,
  soundEnabled: false,
  notificationsEnabled: false,
};

describe('FocusTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders idle state with mode selection', () => {
    render(
      <FocusTimer
        learnerId="learner-123"
        preferences={defaultPreferences}
      />
    );

    expect(screen.getByText('Pomodoro')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Deep Work')).toBeInTheDocument();
    expect(screen.getByText('Ready to focus?')).toBeInTheDocument();
    expect(screen.getByText('Start Focus Session')).toBeInTheDocument();
  });

  it('displays correct time for pomodoro mode', () => {
    render(
      <FocusTimer
        learnerId="learner-123"
        preferences={defaultPreferences}
      />
    );

    // Default pomodoro is 25 minutes
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('changes mode when mode button is clicked', () => {
    render(
      <FocusTimer
        learnerId="learner-123"
        preferences={defaultPreferences}
      />
    );

    // Click Deep Work mode
    const deepWorkButton = screen.getByText('Deep Work').closest('button');
    fireEvent.click(deepWorkButton!);

    // Should show 90 minutes for deep work
    expect(screen.getByText('90:00')).toBeInTheDocument();
  });

  it('shows custom time when custom mode is selected', () => {
    render(
      <FocusTimer
        learnerId="learner-123"
        preferences={defaultPreferences}
      />
    );

    const customButton = screen.getByText('Custom').closest('button');
    fireEvent.click(customButton!);

    // Should show 45 minutes for custom mode
    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('calls onStartSession when Start button is clicked', async () => {
    const onStartSession = vi.fn().mockResolvedValue({
      id: 'session-1',
      learnerId: 'learner-123',
      mode: 'pomodoro',
      duration: 1500,
      startTime: new Date().toISOString(),
      completed: false,
      distractions: [],
      breaks: [],
    });

    render(
      <FocusTimer
        learnerId="learner-123"
        preferences={defaultPreferences}
        onStartSession={onStartSession}
      />
    );

    const startButton = screen.getByText('Start Focus Session');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(onStartSession).toHaveBeenCalledWith('pomodoro', 1500);
    });
  });

  it('shows mode description with correct durations', () => {
    render(
      <FocusTimer
        learnerId="learner-123"
        preferences={defaultPreferences}
      />
    );

    expect(screen.getByText('25 min work, 5 min break')).toBeInTheDocument();
    expect(screen.getByText('45 min work, 10 min break')).toBeInTheDocument();
    expect(screen.getByText('90 min intensive focus')).toBeInTheDocument();
  });
});
