import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeeklyDigestService } from '../src/digest/weekly-digest.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { I18nService } from '../src/i18n/i18n.service';
import { ParentService } from '../src/parent/parent.service';

describe('WeeklyDigestService', () => {
  let digestService: WeeklyDigestService;
  let prisma: any;
  let email: any;
  let i18n: any;
  let parentService: any;

  beforeEach(() => {
    prisma = {
      parent: {
        findMany: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
      },
      learningSession: {
        findMany: vi.fn(),
      },
      achievement: {
        findMany: vi.fn(),
      },
      teacherNote: {
        findMany: vi.fn(),
      },
      assignment: {
        findMany: vi.fn(),
      },
      digestLog: {
        create: vi.fn(),
      },
    };

    email = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    i18n = {
      t: vi.fn().mockReturnValue('Weekly Progress Report'),
    };

    parentService = {};

    digestService = new WeeklyDigestService(
      prisma as unknown as PrismaService,
      i18n as unknown as I18nService,
      email as unknown as EmailService,
      parentService as unknown as ParentService
    );
  });

  describe('generateAndSendDigest', () => {
    const mockParent = {
      id: 'parent-1',
      email: 'parent@example.com',
      givenName: 'John',
      language: 'en',
      studentLinks: [{ student: { id: 'student-1' } }],
    };

    it('should generate and send digest for parent with active students', async () => {
      prisma.profile.findUnique.mockResolvedValue({
        givenName: 'Jane',
        familyName: 'Doe',
        photoUrl: null,
      });

      prisma.learningSession.findMany
        .mockResolvedValueOnce([
          {
            timeSpentSeconds: 3600,
            status: 'completed',
            score: 85,
            startedAt: new Date('2026-02-10T10:00:00Z'),
            lesson: { title: 'Fractions', subject: 'math' },
          },
          {
            timeSpentSeconds: 1800,
            status: 'completed',
            score: 90,
            startedAt: new Date('2026-02-11T14:00:00Z'),
            lesson: { title: 'Reading 101', subject: 'reading' },
          },
        ])
        // Previous week sessions for comparison
        .mockResolvedValueOnce([
          {
            timeSpentSeconds: 2400,
            status: 'completed',
            score: 80,
            startedAt: new Date('2026-02-03T10:00:00Z'),
          },
        ]);

      prisma.achievement.findMany.mockResolvedValue([{ name: 'Math Star', iconUrl: null }]);

      prisma.teacherNote.findMany.mockResolvedValue([
        {
          content: 'Great progress!',
          teacher: { givenName: 'Ms.', familyName: 'Smith' },
        },
      ]);

      prisma.assignment.findMany.mockResolvedValue([]);
      prisma.digestLog.create.mockResolvedValue({});

      await digestService.generateAndSendDigest(mockParent);

      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@example.com',
          tags: ['weekly-digest'],
        })
      );
      expect(prisma.digestLog.create).toHaveBeenCalled();
    });

    it('should skip sending when no children have activity', async () => {
      prisma.profile.findUnique.mockResolvedValue({
        givenName: 'Jane',
        familyName: 'Doe',
        photoUrl: null,
      });

      // No sessions this week or previous week
      prisma.learningSession.findMany.mockResolvedValue([]);
      prisma.achievement.findMany.mockResolvedValue([]);
      prisma.teacherNote.findMany.mockResolvedValue([]);
      prisma.assignment.findMany.mockResolvedValue([]);

      await digestService.generateAndSendDigest(mockParent);

      // No email sent when there's no activity
      expect(email.send).not.toHaveBeenCalled();
    });
  });

  describe('sendWeeklyDigests', () => {
    it('should query active parents with weekly digest preference', async () => {
      prisma.parent.findMany.mockResolvedValue([]);

      await digestService.sendWeeklyDigests();

      expect(prisma.parent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            digestFrequency: 'weekly',
            emailVerified: true,
          }),
        })
      );
    });

    it('should handle errors for individual parents gracefully', async () => {
      prisma.parent.findMany.mockResolvedValue([
        {
          id: 'parent-1',
          email: 'parent@example.com',
          givenName: 'John',
          language: 'en',
          timezone: 'UTC',
          studentLinks: [{ student: { id: 'student-1' } }],
        },
      ]);

      // Force an error during digest generation
      prisma.profile.findUnique.mockRejectedValue(new Error('DB connection lost'));

      // Should not throw — errors are caught per-parent
      await expect(digestService.sendWeeklyDigests()).resolves.not.toThrow();
    });
  });
});
