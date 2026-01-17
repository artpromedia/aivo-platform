import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusStats } from '../app/(learning)/focus/components/FocusStats';
import type { FocusStats as FocusStatsType } from '../lib/focus-api';

describe('FocusStats', () => {
  const mockStats: FocusStatsType = {
    learnerId: 'learner-1',
    totalSessions: 15,
    totalFocusTime: 27000, // 7.5 hours
    averageSessionLength: 1800, // 30 minutes
    longestStreak: 10,
    currentStreak: 5,
    weeklyProgress: [
      { week: 'Monday', totalMinutes: 60, sessionsCompleted: 2 },
      { week: 'Tuesday', totalMinutes: 90, sessionsCompleted: 3 },
      { week: 'Wednesday', totalMinutes: 45, sessionsCompleted: 1 },
      { week: 'Thursday', totalMinutes: 120, sessionsCompleted: 4 },
      { week: 'Friday', totalMinutes: 75, sessionsCompleted: 2 },
      { week: 'Saturday', totalMinutes: 30, sessionsCompleted: 1 },
      { week: 'Sunday', totalMinutes: 60, sessionsCompleted: 2 },
    ],
    distractionRate: 0.15,
  };

  it('should display total focus time', () => {
    render(<FocusStats stats={mockStats} />);
    expect(screen.getByText('7.5h')).toBeInTheDocument();
    expect(screen.getByText('Total Focus Time')).toBeInTheDocument();
  });

  it('should display total sessions completed', () => {
    render(<FocusStats stats={mockStats} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Sessions Completed')).toBeInTheDocument();
  });

  it('should display current streak', () => {
    render(<FocusStats stats={mockStats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Day Streak')).toBeInTheDocument();
  });

  it('should display average session length', () => {
    render(<FocusStats stats={mockStats} />);
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('Avg Session Length')).toBeInTheDocument();
  });

  it('should display weekly progress chart', () => {
    render(<FocusStats stats={mockStats} />);
    
    expect(screen.getByText('Weekly Progress')).toBeInTheDocument();
    expect(screen.getByText(/Monday/)).toBeInTheDocument();
    expect(screen.getByText(/60 min \(2 sessions\)/)).toBeInTheDocument();
    expect(screen.getByText(/Thursday/)).toBeInTheDocument();
    expect(screen.getByText(/120 min \(4 sessions\)/)).toBeInTheDocument();
  });

  it('should display achievements', () => {
    render(<FocusStats stats={mockStats} />);
    
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('First Session')).toBeInTheDocument();
    expect(screen.getByText('Focus Warrior')).toBeInTheDocument();
    expect(screen.getByText('Week Streak')).toBeInTheDocument();
  });

  it('should show unlocked achievements with correct styling', () => {
    render(<FocusStats stats={mockStats} />);
    
    // First Session should be unlocked (totalSessions >= 1)
    const firstSessionCard = screen.getByText('First Session').closest('div');
    expect(firstSessionCard).toHaveClass('border-yellow-400');
    
    // Focus Warrior should be unlocked (totalSessions >= 10)
    const focusWarriorCard = screen.getByText('Focus Warrior').closest('div');
    expect(focusWarriorCard).toHaveClass('border-blue-400');
  });

  it('should display focus quality metrics', () => {
    render(<FocusStats stats={mockStats} />);
    
    expect(screen.getByText('Focus Quality')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // 1 - 0.15 = 0.85
    expect(screen.getByText('Focus Score')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('Distraction Rate')).toBeInTheDocument();
  });

  it('should display helpful tip based on distraction rate', () => {
    render(<FocusStats stats={mockStats} />);
    
    expect(screen.getByText(/Good focus!/)).toBeInTheDocument();
  });

  it('should handle empty weekly progress', () => {
    const emptyStats = { ...mockStats, weeklyProgress: [] };
    render(<FocusStats stats={emptyStats} />);
    
    expect(screen.getByText(/No focus sessions yet/)).toBeInTheDocument();
  });

  it('should show excellent focus tip for low distraction rate', () => {
    const excellentStats = { ...mockStats, distractionRate: 0.05 };
    render(<FocusStats stats={excellentStats} />);
    
    expect(screen.getByText(/Excellent focus!/)).toBeInTheDocument();
  });

  it('should show improvement tip for high distraction rate', () => {
    const needsImprovementStats = { ...mockStats, distractionRate: 0.4 };
    render(<FocusStats stats={needsImprovementStats} />);
    
    expect(screen.getByText(/Room for improvement/)).toBeInTheDocument();
  });
});
