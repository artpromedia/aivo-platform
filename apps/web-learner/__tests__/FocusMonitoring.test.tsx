import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import { FocusMonitor } from '../components/focus/FocusMonitor';
import { FocusBreakBanner } from '../components/focus/FocusBreakBanner';
import { FocusBreakModal } from '../components/focus/FocusBreakModal';
import { FocusStatusIndicator } from '../components/focus/FocusStatusIndicator';
import * as focusApi from '../lib/focus/focus-api';
import type { RegulationActivity } from '../lib/focus/focus-api';

// Mock the focus API
vi.mock('../lib/focus/focus-api');

describe('FocusBreakBanner', () => {
  const mockActivity: RegulationActivity = {
    activityType: 'breathing',
    title: 'Balloon Breaths',
    description: 'Take slow, deep breaths like blowing up a balloon',
    estimatedDurationSeconds: 60,
    instructions: ['Breathe in slowly', 'Hold for a moment', 'Breathe out slowly'],
    source: 'static',
  };

  const mockOnStartBreak = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render K5 messaging for young learners', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="K5"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Time for a Brain Break!')).toBeInTheDocument();
    expect(screen.getByText("Let's Do It!")).toBeInTheDocument();
    expect(screen.getByText('Maybe Later')).toBeInTheDocument();
  });

  it('should render G6_8 messaging for middle schoolers', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="G6_8"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Quick Break Suggestion')).toBeInTheDocument();
    expect(screen.getByText('Start Break')).toBeInTheDocument();
    expect(screen.getByText('Not Now')).toBeInTheDocument();
  });

  it('should render G9_12 messaging for high schoolers', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="G9_12"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Focus Break Recommended')).toBeInTheDocument();
    expect(screen.getByText('Take Break')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('should display activity details', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="G6_8"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Balloon Breaths')).toBeInTheDocument();
    expect(screen.getByText('1 minute')).toBeInTheDocument();
  });

  it('should call onStartBreak when start button is clicked', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="G6_8"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('Start Break'));
    expect(mockOnStartBreak).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="G6_8"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('Not Now'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should toggle expanded details', () => {
    render(
      <FocusBreakBanner
        activity={mockActivity}
        gradeBand="G6_8"
        onStartBreak={mockOnStartBreak}
        onDismiss={mockOnDismiss}
      />
    );

    // Description should not be visible initially
    expect(
      screen.queryByText('Take slow, deep breaths like blowing up a balloon')
    ).not.toBeInTheDocument();

    // Click more info
    fireEvent.click(screen.getByText('More info'));

    // Description should now be visible
    expect(
      screen.getByText('Take slow, deep breaths like blowing up a balloon')
    ).toBeInTheDocument();
  });
});

describe('FocusBreakModal', () => {
  const mockActivity: RegulationActivity = {
    activityType: 'breathing',
    title: 'Balloon Breaths',
    description: 'Take slow, deep breaths',
    estimatedDurationSeconds: 60,
    instructions: ['Breathe in', 'Hold', 'Breathe out'],
    source: 'static',
  };

  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display activity title and timer', () => {
    render(
      <FocusBreakModal
        activity={mockActivity}
        gradeBand="G6_8"
        startTime={new Date()}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Balloon Breaths')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText(/of 1:00/)).toBeInTheDocument();
  });

  it('should display step instructions', () => {
    render(
      <FocusBreakModal
        activity={mockActivity}
        gradeBand="G6_8"
        startTime={new Date()}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Breathe in')).toBeInTheDocument();
  });

  it('should allow ending break early', () => {
    render(
      <FocusBreakModal
        activity={mockActivity}
        gradeBand="G6_8"
        startTime={new Date()}
        onComplete={mockOnComplete}
      />
    );

    fireEvent.click(screen.getByText('End Early'));
    expect(mockOnComplete).toHaveBeenCalledWith(false, undefined);
  });

  it('should show completion state after full duration', async () => {
    const startTime = new Date();

    render(
      <FocusBreakModal
        activity={mockActivity}
        gradeBand="G6_8"
        startTime={startTime}
        onComplete={mockOnComplete}
      />
    );

    // Advance time past the duration
    act(() => {
      vi.advanceTimersByTime(65000);
    });

    // Should show completion message
    await waitFor(() => {
      expect(screen.getByText(/Time complete/)).toBeInTheDocument();
    });
  });

  it('should navigate between steps', () => {
    render(
      <FocusBreakModal
        activity={mockActivity}
        gradeBand="G6_8"
        startTime={new Date()}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Breathe in')).toBeInTheDocument();

    // Go to next step
    fireEvent.click(screen.getByLabelText('Next step'));
    expect(screen.getByText('Hold')).toBeInTheDocument();

    // Go to previous step
    fireEvent.click(screen.getByLabelText('Previous step'));
    expect(screen.getByText('Breathe in')).toBeInTheDocument();
  });
});

describe('FocusStatusIndicator', () => {
  const mockOnMoodChange = vi.fn();
  const mockOnRequestBreak = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show monitoring status', () => {
    render(
      <FocusStatusIndicator
        isMonitoring={true}
        currentMood={null}
        suggestedIntervention="none"
        onMoodChange={mockOnMoodChange}
        onRequestBreak={mockOnRequestBreak}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByLabelText('Expand focus status'));

    expect(screen.getByText('Focus Monitoring Active')).toBeInTheDocument();
  });

  it('should show paused status when not monitoring', () => {
    render(
      <FocusStatusIndicator
        isMonitoring={false}
        currentMood={null}
        suggestedIntervention="none"
        onMoodChange={mockOnMoodChange}
        onRequestBreak={mockOnRequestBreak}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByLabelText('Expand focus status'));

    expect(screen.getByText('Monitoring Paused')).toBeInTheDocument();
  });

  it('should display current mood when set', () => {
    render(
      <FocusStatusIndicator
        isMonitoring={true}
        currentMood="happy"
        suggestedIntervention="none"
        onMoodChange={mockOnMoodChange}
        onRequestBreak={mockOnRequestBreak}
      />
    );

    // Should show happy emoji
    expect(screen.getByText('😊')).toBeInTheDocument();
  });

  it('should allow mood selection', () => {
    render(
      <FocusStatusIndicator
        isMonitoring={true}
        currentMood={null}
        suggestedIntervention="none"
        onMoodChange={mockOnMoodChange}
        onRequestBreak={mockOnRequestBreak}
      />
    );

    // Expand the indicator
    fireEvent.click(screen.getByLabelText('Expand focus status'));

    // Click to show mood picker
    fireEvent.click(screen.getByText('Select'));

    // Select a mood
    fireEvent.click(screen.getByText('Tired'));

    expect(mockOnMoodChange).toHaveBeenCalledWith('tired');
  });

  it('should call onRequestBreak when break button is clicked', () => {
    render(
      <FocusStatusIndicator
        isMonitoring={true}
        currentMood={null}
        suggestedIntervention="none"
        onMoodChange={mockOnMoodChange}
        onRequestBreak={mockOnRequestBreak}
      />
    );

    // Expand and click break button
    fireEvent.click(screen.getByLabelText('Expand focus status'));
    fireEvent.click(screen.getByText('Take a Break'));

    expect(mockOnRequestBreak).toHaveBeenCalledTimes(1);
  });
});

describe('FocusMonitor Integration', () => {
  const defaultProps = {
    sessionId: 'session-123',
    learnerId: 'learner-456',
    activityId: 'activity-789',
    gradeBand: 'G6_8' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock implementations
    vi.mocked(focusApi.sendFocusPing).mockResolvedValue({
      received: true,
      detection: {
        focusLossDetected: false,
        reasons: [],
        suggestedIntervention: 'none',
        confidence: 0,
      },
    });

    vi.mocked(focusApi.getBreakRecommendation).mockResolvedValue({
      activityType: 'breathing',
      title: 'Test Break',
      description: 'Test description',
      estimatedDurationSeconds: 60,
      source: 'static',
    });

    vi.mocked(focusApi.reportBreakStarted).mockResolvedValue({
      success: true,
      eventId: 'event-123',
    });

    vi.mocked(focusApi.reportBreakComplete).mockResolvedValue({
      success: true,
      message: 'Great!',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render children', () => {
    render(
      <FocusMonitor {...defaultProps}>
        <div data-testid="child-content">Learning Content</div>
      </FocusMonitor>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should start monitoring and send initial ping', async () => {
    render(
      <FocusMonitor {...defaultProps} autoStart>
        <div>Content</div>
      </FocusMonitor>
    );

    await waitFor(() => {
      expect(focusApi.sendFocusPing).toHaveBeenCalled();
    });
  });

  it('should send periodic pings', async () => {
    render(
      <FocusMonitor {...defaultProps} autoStart>
        <div>Content</div>
      </FocusMonitor>
    );

    // Wait for initial ping
    await waitFor(() => {
      expect(focusApi.sendFocusPing).toHaveBeenCalledTimes(1);
    });

    // Advance 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    // Should have sent another ping
    await waitFor(() => {
      expect(focusApi.sendFocusPing).toHaveBeenCalledTimes(2);
    });
  });

  it('should show break banner when focus loss detected', async () => {
    // Mock focus loss detection
    vi.mocked(focusApi.sendFocusPing).mockResolvedValueOnce({
      received: true,
      detection: {
        focusLossDetected: true,
        reasons: ['extended_idle'],
        suggestedIntervention: 'regulation_break',
        confidence: 0.8,
      },
    });

    render(
      <FocusMonitor {...defaultProps} autoStart>
        <div>Content</div>
      </FocusMonitor>
    );

    // Wait for break banner to appear
    await waitFor(() => {
      expect(screen.getByText('Quick Break Suggestion')).toBeInTheDocument();
    });
  });

  it('should handle break flow', async () => {
    const onBreakStarted = vi.fn();
    const onBreakCompleted = vi.fn();

    // Mock focus loss detection
    vi.mocked(focusApi.sendFocusPing).mockResolvedValueOnce({
      received: true,
      detection: {
        focusLossDetected: true,
        reasons: ['extended_idle'],
        suggestedIntervention: 'regulation_break',
        confidence: 0.8,
      },
    });

    render(
      <FocusMonitor
        {...defaultProps}
        autoStart
        onBreakStarted={onBreakStarted}
        onBreakCompleted={onBreakCompleted}
      >
        <div>Content</div>
      </FocusMonitor>
    );

    // Wait for banner
    await waitFor(() => {
      expect(screen.getByText('Quick Break Suggestion')).toBeInTheDocument();
    });

    // Start break
    fireEvent.click(screen.getByText('Start Break'));

    await waitFor(() => {
      expect(focusApi.reportBreakStarted).toHaveBeenCalled();
      expect(onBreakStarted).toHaveBeenCalled();
    });

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Test Break')).toBeInTheDocument();
    });
  });

  it('should not show status indicator when disabled', () => {
    render(
      <FocusMonitor {...defaultProps} showStatusIndicator={false}>
        <div>Content</div>
      </FocusMonitor>
    );

    expect(screen.queryByLabelText(/focus status/i)).not.toBeInTheDocument();
  });

  it('should not auto-start when disabled', async () => {
    render(
      <FocusMonitor {...defaultProps} autoStart={false}>
        <div>Content</div>
      </FocusMonitor>
    );

    // Wait a bit
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(focusApi.sendFocusPing).not.toHaveBeenCalled();
  });
});
