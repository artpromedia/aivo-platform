import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeeklyDigestService } from '../src/digest/weekly-digest.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { I18nService } from '../src/i18n/i18n.service';

describe('WeeklyDigestService', () => {
  let digestService: WeeklyDigestService;
  let prisma: any;
  let emailService: any;
  let i18n: I18nService;

  beforeEach(() => {
    prisma = {
      parent: {
        findMany: vi.fn(),
      },
      parentStudentLink: {
        findMany: vi.fn(),
      },
      consentRecord: {
        findFirst: vi.fn(),
      },
      digestLog: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      learningActivity: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
      assessment: {
        aggregate: vi.fn(),
      },
    };

    emailService = {
      sendEmail: vi.fn().mockResolvedValue(true),
    };

    i18n = new I18nService();

    digestService = new WeeklyDigestService(
      prisma as unknown as PrismaService,
      emailService,
      i18n
    );
  });

  describe('generateDigestForParent', () => {
    it('should generate digest data for parent with students', async () => {
      prisma.parentStudentLink.findMany.mockResolvedValue([
        {
          student: {
            id: 'student-1',
            firstName: 'Jane',
            lastName: 'Doe',
          },
        },
      ]);

      prisma.learningActivity.aggregate.mockResolvedValue({
        _sum: { durationMinutes: 120 },
        _count: { id: 5 },
      });

      prisma.assessment.aggregate.mockResolvedValue({
        _avg: { score: 85 },
      });

      prisma.learningActivity.groupBy.mockResolvedValue([
        { subjectId: 'math', _avg: { score: 90 } },
        { subjectId: 'reading', _avg: { score: 80 } },
      ]);

      const result = await digestService.generateDigestForParent('parent-1');

      expect(result).toBeDefined();
      expect(result.students).toHaveLength(1);
      expect(result.students[0].totalTimeMinutes).toBe(120);
    });

    it('should handle parent with no students', async () => {
      prisma.parentStudentLink.findMany.mockResolvedValue([]);

      const result = await digestService.generateDigestForParent('parent-1');

      expect(result.students).toHaveLength(0);
    });
  });

  describe('sendWeeklyDigests', () => {
    it('should send digests to opted-in parents', async () => {
      const mockParents = [
        {
          id: 'parent-1',
          email: 'parent1@example.com',
          firstName: 'John',
          locale: 'en',
        },
      ];

      prisma.parent.findMany.mockResolvedValue(mockParents);
      prisma.consentRecord.findFirst.mockResolvedValue({
        granted: true,
      });
      prisma.parentStudentLink.findMany.mockResolvedValue([]);
      prisma.digestLog.findFirst.mockResolvedValue(null);

      await digestService.sendWeeklyDigests();

      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should skip parents who opted out', async () => {
      prisma.parent.findMany.mockResolvedValue([
        { id: 'parent-1', email: 'parent@example.com', locale: 'en' },
      ]);
      prisma.consentRecord.findFirst.mockResolvedValue({
        granted: false,
      });

      await digestService.sendWeeklyDigests();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send duplicate digests', async () => {
      prisma.parent.findMany.mockResolvedValue([
        { id: 'parent-1', email: 'parent@example.com', locale: 'en' },
      ]);
      prisma.consentRecord.findFirst.mockResolvedValue({ granted: true });
      prisma.digestLog.findFirst.mockResolvedValue({
        id: 'existing-digest',
        sentAt: new Date(),
      });

      await digestService.sendWeeklyDigests();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });
});
