import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParentService } from '../src/parent/parent.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CryptoService } from '../src/crypto/crypto.service';

describe('ParentService', () => {
  let parentService: ParentService;
  let prisma: any;
  let crypto: CryptoService;

  beforeEach(() => {
    prisma = {
      parent: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      parentStudentLink: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      parentInvite: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      consentRecord: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
    };
    crypto = new CryptoService();
    parentService = new ParentService(prisma as unknown as PrismaService, crypto);
  });

  describe('getParentById', () => {
    it('should return parent with students', async () => {
      const mockParent = {
        id: 'parent-1',
        email: 'parent@example.com',
        firstName: 'John',
        lastName: 'Doe',
        studentLinks: [
          {
            student: {
              id: 'student-1',
              firstName: 'Jane',
              lastName: 'Doe',
              grade: '5',
            },
            relationship: 'parent',
          },
        ],
      };

      prisma.parent.findUnique.mockResolvedValue(mockParent);

      const result = await parentService.getParentById('parent-1');

      expect(result).toBeDefined();
      expect(result?.email).toBe('parent@example.com');
      expect(prisma.parent.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
        include: expect.any(Object),
      });
    });

    it('should return null for non-existent parent', async () => {
      prisma.parent.findUnique.mockResolvedValue(null);

      const result = await parentService.getParentById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createParent', () => {
    it('should create a new parent with hashed password', async () => {
      const createDto = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'Parent',
        tenantId: 'tenant-1',
        locale: 'en',
      };

      const mockCreated = {
        id: 'new-parent-id',
        ...createDto,
        passwordHash: 'hashed-password',
      };

      prisma.parent.findFirst.mockResolvedValue(null);
      prisma.parent.create.mockResolvedValue(mockCreated);

      const result = await parentService.createParent(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-parent-id');
      expect(prisma.parent.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      prisma.parent.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        parentService.createParent({
          email: 'existing@example.com',
          password: 'pass',
          firstName: 'Test',
          lastName: 'User',
          tenantId: 'tenant-1',
          locale: 'en',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('linkStudentToParent', () => {
    it('should create parent-student link', async () => {
      const mockLink = {
        id: 'link-1',
        parentId: 'parent-1',
        studentId: 'student-1',
        relationship: 'parent',
      };

      prisma.parentStudentLink.create.mockResolvedValue(mockLink);

      const result = await parentService.linkStudentToParent(
        'parent-1',
        'student-1',
        'parent'
      );

      expect(result).toBeDefined();
      expect(result.studentId).toBe('student-1');
    });
  });

  describe('getConsentRecords', () => {
    it('should return consent records for parent', async () => {
      const mockRecords = [
        {
          id: 'consent-1',
          type: 'learning_analytics',
          granted: true,
          grantedAt: new Date(),
        },
        {
          id: 'consent-2',
          type: 'push_notifications',
          granted: false,
          revokedAt: new Date(),
        },
      ];

      prisma.consentRecord.findMany.mockResolvedValue(mockRecords);

      const result = await parentService.getConsentRecords('parent-1');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('learning_analytics');
    });
  });

  describe('updateConsent', () => {
    it('should update consent record', async () => {
      const mockUpdated = {
        id: 'consent-1',
        type: 'push_notifications',
        granted: true,
        grantedAt: new Date(),
      };

      prisma.consentRecord.upsert.mockResolvedValue(mockUpdated);

      const result = await parentService.updateConsent(
        'parent-1',
        'push_notifications',
        true
      );

      expect(result.granted).toBe(true);
    });
  });
});
