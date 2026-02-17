import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParentService } from '../src/parent/parent.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CryptoService } from '../src/crypto/crypto.service';
import { I18nService } from '../src/i18n/i18n.service';
import { NotificationService } from '../src/notification/notification.service';
import { eventBus } from '../src/event-bus';
import { NotFoundException } from '../src/errors';

describe('ParentService', () => {
  let parentService: ParentService;
  let prisma: any;
  let crypto: CryptoService;
  let i18n: I18nService;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      parent: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      parentStudentLink: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      parentInvite: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      consentRecord: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      profile: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    crypto = new CryptoService();
    i18n = new I18nService();
    notifications = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    parentService = new ParentService(
      prisma as unknown as PrismaService,
      eventBus,
      i18n,
      crypto,
      notifications as unknown as NotificationService
    );
  });

  describe('getParentProfile', () => {
    it('should return parent with linked students', async () => {
      const mockParent = {
        id: 'parent-1',
        email: 'parent@example.com',
        givenName: 'John',
        familyName: 'Doe',
        phone: null,
        photoUrl: null,
        language: 'en',
        timezone: 'UTC',
        status: 'active',
        digestFrequency: 'weekly',
        notificationPreferences: {},
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        studentLinks: [],
      };

      prisma.parent.findUnique.mockResolvedValue(mockParent);

      const result = await parentService.getParentProfile('parent-1');

      expect(result).toBeDefined();
      expect(result.email).toBe('parent@example.com');
      expect(prisma.parent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'parent-1' },
          include: expect.any(Object),
        })
      );
    });

    it('should throw NotFoundException for non-existent parent', async () => {
      prisma.parent.findUnique.mockResolvedValue(null);

      await expect(parentService.getParentProfile('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateProfile', () => {
    it('should update parent profile fields', async () => {
      const updateDto = {
        givenName: 'Updated',
        familyName: 'Name',
        phone: '555-0100',
      };

      const mockUpdated = {
        id: 'parent-1',
        email: 'parent@example.com',
        givenName: 'Updated',
        familyName: 'Name',
        phone: '555-0100',
        photoUrl: null,
        language: 'en',
        timezone: 'UTC',
        status: 'active',
        digestFrequency: 'weekly',
        notificationPreferences: {},
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.parent.update.mockResolvedValue(mockUpdated);

      const result = await parentService.updateProfile('parent-1', updateDto);

      expect(result).toBeDefined();
      expect(result.givenName).toBe('Updated');
      expect(prisma.parent.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'parent-1' } })
      );
    });
  });

  describe('recordConsent', () => {
    it('should create consent record for student', async () => {
      // verifyParentAccess needs the link to exist
      prisma.parentStudentLink.findUnique.mockResolvedValue({
        id: 'link-1',
        parentId: 'parent-1',
        studentId: 'student-1',
        status: 'active',
      });

      prisma.consentRecord.create.mockResolvedValue({
        id: 'consent-1',
        consentType: 'coppa',
        granted: true,
        consentVersion: '1.0',
        grantedAt: new Date(),
        revokedAt: null,
      });

      prisma.parentStudentLink.update.mockResolvedValue({});

      const result = await parentService.recordConsent('parent-1', {
        studentId: 'student-1',
        consentType: 'coppa' as any,
        granted: true,
      });

      expect(result.granted).toBe(true);
      expect(result.consentType).toBe('coppa');
      expect(prisma.consentRecord.create).toHaveBeenCalled();
    });
  });

  describe('getConsentRecords', () => {
    it('should return consent records for parent and student', async () => {
      prisma.parentStudentLink.findUnique.mockResolvedValue({
        id: 'link-1',
        parentId: 'parent-1',
        studentId: 'student-1',
        status: 'active',
      });

      const mockRecords = [
        {
          id: 'consent-1',
          consentType: 'coppa',
          granted: true,
          consentVersion: '1.0',
          grantedAt: new Date(),
          revokedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'consent-2',
          consentType: 'ai_chat',
          granted: false,
          consentVersion: '1.0',
          grantedAt: null,
          revokedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      prisma.consentRecord.findMany.mockResolvedValue(mockRecords);

      const result = await parentService.getConsentRecords('parent-1', 'student-1');

      expect(result).toHaveLength(2);
      expect(result[0].consentType).toBe('coppa');
    });
  });

  describe('updatePreferences', () => {
    it('should update parent preferences', async () => {
      const mockUpdated = {
        language: 'es',
        timezone: 'America/New_York',
        digestFrequency: 'weekly',
        notificationPreferences: { email: true, push: true },
      };

      prisma.parent.update.mockResolvedValue(mockUpdated);

      const result = await parentService.updatePreferences('parent-1', {
        language: 'es',
        timezone: 'America/New_York',
      });

      expect(result.language).toBe('es');
      expect(result.timezone).toBe('America/New_York');
    });
  });
});
