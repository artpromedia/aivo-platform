import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FocusTimer } from '../app/(learning)/focus/components/FocusTimer';
import * as focusApi from '../lib/focus-api';

// Mock the focus API
vi.mock('../lib/focus-api');

describe('FocusTimer', () => {
  const mockPreferences = {
    learnerId: 'learner-1',
    defaultMode: 'pomodoro' as const,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    pomodoroLongBreakMinutes: 15,
    customWorkMinutes: 30,
    customBreakMinutes: 10,
    soundEnabled: true,
    notificationsEnabled: true,
    breakReminders: true,
  };

  const mockOnSessionUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display mode selection when idle', () => {
    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={null}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    expect(screen.getByText('Pomodoro')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Deep Work')).toBeInTheDocument();
  });

  it('should display start button when idle', () => {
    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={null}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    expect(screen.getByText('Start Focus Session')).toBeInTheDocument();
  });

  it('should start a focus session when start button is clicked', async () => {
    const mockSession = {
      id: 'session-1',
      learnerId: 'learner-1',
      startTime: new Date().toISOString(),
      duration: 1500,
      focusMode: 'pomodoro' as const,
      breaks: [],
      distractions: [],
      completed: false,
    };

    vi.mocked(focusApi.startFocusSession).mockResolvedValue(mockSession);

    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={null}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    const startButton = screen.getByText('Start Focus Session');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(focusApi.startFocusSession).toHaveBeenCalledWith('learner-1', 'pomodoro', 1500);
      expect(mockOnSessionUpdate).toHaveBeenCalledWith(mockSession);
    });
  });

  it('should display timer when session is active', () => {
    const activeSession = {
      id: 'session-1',
      learnerId: 'learner-1',
      startTime: new Date().toISOString(),
      duration: 1500,
      focusMode: 'pomodoro' as const,
      breaks: [],
      distractions: [],
      completed: false,
    };

    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={activeSession}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    expect(screen.getByText(/Stay focused!/)).toBeInTheDocument();
    expect(screen.getByText('End Session')).toBeInTheDocument();
  });

  it('should allow recording distractions during session', async () => {
    const activeSession = {
      id: 'session-1',
      learnerId: 'learner-1',
      startTime: new Date().toISOString(),
      duration: 1500,
      focusMode: 'pomodoro' as const,
      breaks: [],
      distractions: [],
      completed: false,
    };

    vi.mocked(focusApi.recordDistraction).mockResolvedValue({
      id: 'distraction-1',
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      type: 'manual',
    });

    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={activeSession}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    const distractionButton = screen.getByText(/I Got Distracted/);
    fireEvent.click(distractionButton);

    await waitFor(() => {
      expect(focusApi.recordDistraction).toHaveBeenCalledWith('session-1', 'manual');
    });
  });

  it('should end session when end button is clicked', async () => {
    const activeSession = {
      id: 'session-1',
      learnerId: 'learner-1',
      startTime: new Date().toISOString(),
      duration: 1500,
      focusMode: 'pomodoro' as const,
      breaks: [],
      distractions: [],
      completed: false,
    };

    const completedSession = { ...activeSession, completed: true, endTime: new Date().toISOString() };
    vi.mocked(focusApi.endFocusSession).mockResolvedValue(completedSession);

    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={activeSession}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    const endButton = screen.getByText('End Session');
    fireEvent.click(endButton);

    await waitFor(() => {
      expect(focusApi.endFocusSession).toHaveBeenCalledWith('session-1');
      expect(mockOnSessionUpdate).toHaveBeenCalledWith(null);
    });
  });

  it('should format time correctly', () => {
    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={null}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    // Should show 25:00 for default pomodoro
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('should allow selecting different modes', () => {
    render(
      <FocusTimer
        learnerId="learner-1"
        activeSession={null}
        preferences={mockPreferences}
        onSessionUpdate={mockOnSessionUpdate}
      />
    );

    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);

    // Should update to custom duration
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });
});
