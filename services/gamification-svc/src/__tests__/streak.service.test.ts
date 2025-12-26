/**
 * Streak Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  playerProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  dailyLogin: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  streakFreezeUsage: {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

const { streakService } = await import('../services/streak.service.js');

describe('StreakService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentStreak', () => {
    it('should return current streak data', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        longestStreak: 10,
        freezesAvailable: 2,
      });

      mockPrisma.dailyLogin.findFirst.mockResolvedValue({
        date: new Date('2024-01-15'),
      });

      mockPrisma.streakFreezeUsage.count.mockResolvedValue(1);

      const streak = await streakService.getCurrentStreak('student-1');

      expect(streak.currentStreak).toBe(5);
      expect(streak.longestStreak).toBe(10);
      expect(streak.freezesAvailable).toBe(2);
      expect(streak.completedToday).toBe(true);
    });

    it('should detect broken streak when no activity today or yesterday', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        longestStreak: 10,
        freezesAvailable: 2,
      });

      // Last activity was 3 days ago
      mockPrisma.dailyLogin.findFirst.mockResolvedValue({
        date: new Date('2024-01-12'),
      });

      mockPrisma.streakFreezeUsage.count.mockResolvedValue(0);

      const streak = await streakService.getCurrentStreak('student-1');

      // Streak should be reset since more than 1 day has passed
      expect(streak.completedToday).toBe(false);
    });
  });

  describe('recordActivity', () => {
    it('should record daily login and increment streak', async () => {
      mockPrisma.dailyLogin.findFirst.mockResolvedValueOnce(null); // No login today
      mockPrisma.dailyLogin.findFirst.mockResolvedValueOnce({ // Logged in yesterday
        date: new Date('2024-01-14'),
      });

      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        longestStreak: 10,
        freezesAvailable: 2,
      });

      mockPrisma.dailyLogin.create.mockResolvedValue({});
      mockPrisma.playerProfile.update.mockResolvedValue({
        currentStreak: 6,
        longestStreak: 10,
      });

      const result = await streakService.recordActivity('student-1');

      expect(result.streakIncremented).toBe(true);
      expect(result.newStreak).toBe(6);
      expect(mockPrisma.dailyLogin.create).toHaveBeenCalled();
    });

    it('should not increment streak if already logged in today', async () => {
      mockPrisma.dailyLogin.findFirst.mockResolvedValue({
        date: new Date('2024-01-15'),
      });

      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        longestStreak: 10,
        freezesAvailable: 2,
      });

      const result = await streakService.recordActivity('student-1');

      expect(result.streakIncremented).toBe(false);
      expect(mockPrisma.dailyLogin.create).not.toHaveBeenCalled();
    });

    it('should update longest streak when exceeded', async () => {
      mockPrisma.dailyLogin.findFirst.mockResolvedValueOnce(null);
      mockPrisma.dailyLogin.findFirst.mockResolvedValueOnce({
        date: new Date('2024-01-14'),
      });

      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 10,
        longestStreak: 10,
        freezesAvailable: 2,
      });

      mockPrisma.dailyLogin.create.mockResolvedValue({});
      mockPrisma.playerProfile.update.mockResolvedValue({
        currentStreak: 11,
        longestStreak: 11,
      });

      const result = await streakService.recordActivity('student-1');

      expect(result.isNewRecord).toBe(true);
    });
  });

  describe('useStreakFreeze', () => {
    it('should use a freeze when available', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        freezesAvailable: 2,
      });

      mockPrisma.streakFreezeUsage.findFirst.mockResolvedValue(null);
      mockPrisma.streakFreezeUsage.create.mockResolvedValue({});
      mockPrisma.playerProfile.update.mockResolvedValue({
        freezesAvailable: 1,
      });

      const result = await streakService.useStreakFreeze('student-1');

      expect(result.success).toBe(true);
      expect(result.freezesRemaining).toBe(1);
    });

    it('should fail when no freezes available', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        freezesAvailable: 0,
      });

      const result = await streakService.useStreakFreeze('student-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No freezes available');
    });

    it('should fail if freeze already used today', async () => {
      mockPrisma.playerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        studentId: 'student-1',
        currentStreak: 5,
        freezesAvailable: 2,
      });

      mockPrisma.streakFreezeUsage.findFirst.mockResolvedValue({
        usedAt: new Date('2024-01-15'),
      });

      const result = await streakService.useStreakFreeze('student-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Freeze already used today');
    });
  });

  describe('getStreakCalendar', () => {
    it('should return calendar with activity status', async () => {
      mockPrisma.dailyLogin.findMany.mockResolvedValue([
        { date: new Date('2024-01-15') },
        { date: new Date('2024-01-14') },
        { date: new Date('2024-01-13') },
      ]);

      mockPrisma.streakFreezeUsage.findFirst.mockResolvedValue(null);

      const calendar = await streakService.getStreakCalendar('student-1', 7);

      expect(calendar.length).toBe(7);
      
      const today = calendar.find((d) => d.isToday);
      expect(today?.completed).toBe(true);
    });
  });
});

describe('Streak Milestones', () => {
  it('should identify milestone streaks', async () => {
    const { STREAK_MILESTONES } = await import('../services/streak.service.js');

    expect(STREAK_MILESTONES).toContain(3);
    expect(STREAK_MILESTONES).toContain(7);
    expect(STREAK_MILESTONES).toContain(30);
    expect(STREAK_MILESTONES).toContain(100);
    expect(STREAK_MILESTONES).toContain(365);
  });
});
