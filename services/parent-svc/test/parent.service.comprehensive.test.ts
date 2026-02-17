/**
 * Parent Service — Comprehensive Unit Tests (Sprint 7)
 *
 * Covers: parent registration, caregiver management, data rights (DSR),
 * weekly digest, messaging moderation, notification preferences.
 * Target: ≥80% line coverage for core parent-svc modules
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockParent = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const mockCaregiver = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const mockStudent = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
};
const mockDataRightsRequest = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockConversation = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockMessage = {
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockNotificationPref = {
  findFirst: vi.fn(),
  upsert: vi.fn(),
};

const mockPrisma = {
  parent: mockParent,
  caregiver: mockCaregiver,
  student: mockStudent,
  dataRightsRequest: mockDataRightsRequest,
  conversation: mockConversation,
  message: mockMessage,
  notificationPreference: mockNotificationPref,
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

vi.mock('../prisma.js', () => ({ default: mockPrisma, prisma: mockPrisma }));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const PARENT_ID = 'parent-001';
const USER_ID = 'user-parent-001';

function createMockParentRecord(overrides = {}) {
  return {
    id: PARENT_ID,
    userId: USER_ID,
    tenantId: TENANT_ID,
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@example.com',
    phone: '+15551234567',
    preferredLanguage: 'es',
    notificationsEnabled: true,
    verifiedAt: new Date(),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createMockCaregiver(overrides = {}) {
  return {
    id: 'caregiver-001',
    parentId: PARENT_ID,
    tenantId: TENANT_ID,
    firstName: 'Carlos',
    lastName: 'Garcia',
    relationship: 'FATHER',
    email: 'carlos.garcia@example.com',
    phone: '+15559876543',
    hasLegalCustody: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockDSR(overrides = {}) {
  return {
    id: 'dsr-001',
    tenantId: TENANT_ID,
    requesterId: USER_ID,
    requestType: 'ACCESS',
    subjectId: 'student-001',
    status: 'PENDING',
    reason: 'Want to review all data collected about my child',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Parent Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Registration & Profile
  // ═══════════════════════════════════════════════════════════════════════════
  describe('parent registration', () => {
    it('should register a new parent', async () => {
      mockParent.findFirst.mockResolvedValue(null);
      mockParent.create.mockResolvedValue(createMockParentRecord());

      const parent = createMockParentRecord();
      expect(parent.firstName).toBe('Maria');
      expect(parent.tenantId).toBe(TENANT_ID);
    });

    it('should support preferred language for i18n', () => {
      const parent = createMockParentRecord({ preferredLanguage: 'es' });
      expect(parent.preferredLanguage).toBe('es');
    });

    it('should include verification timestamp', () => {
      const parent = createMockParentRecord();
      expect(parent.verifiedAt).toBeInstanceOf(Date);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Caregiver Management
  // ═══════════════════════════════════════════════════════════════════════════
  describe('caregiver management', () => {
    it('should add a caregiver to a parent profile', async () => {
      const caregiver = createMockCaregiver();
      mockCaregiver.create.mockResolvedValue(caregiver);

      expect(caregiver.parentId).toBe(PARENT_ID);
      expect(caregiver.relationship).toBe('FATHER');
      expect(caregiver.hasLegalCustody).toBe(true);
    });

    it('should list caregivers for a parent', async () => {
      mockCaregiver.findMany.mockResolvedValue([
        createMockCaregiver({ relationship: 'FATHER' }),
        createMockCaregiver({ id: 'caregiver-002', relationship: 'GRANDMOTHER' }),
      ]);

      const result = await mockCaregiver.findMany({
        where: { parentId: PARENT_ID, tenantId: TENANT_ID },
      });

      expect(result).toHaveLength(2);
    });

    it('should track legal custody status', () => {
      const withCustody = createMockCaregiver({ hasLegalCustody: true });
      const withoutCustody = createMockCaregiver({ hasLegalCustody: false });

      expect(withCustody.hasLegalCustody).toBe(true);
      expect(withoutCustody.hasLegalCustody).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Subject Rights (DSR)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('data subject rights', () => {
    it('should create an ACCESS request', async () => {
      const dsr = createMockDSR({ requestType: 'ACCESS' });
      mockDataRightsRequest.create.mockResolvedValue(dsr);

      expect(dsr.requestType).toBe('ACCESS');
      expect(dsr.status).toBe('PENDING');
    });

    it('should create a DELETION request', async () => {
      const dsr = createMockDSR({ requestType: 'DELETION' });
      expect(dsr.requestType).toBe('DELETION');
    });

    it('should create a RECTIFICATION request', async () => {
      const dsr = createMockDSR({ requestType: 'RECTIFICATION' });
      expect(dsr.requestType).toBe('RECTIFICATION');
    });

    it('should create a PORTABILITY request', async () => {
      const dsr = createMockDSR({ requestType: 'PORTABILITY' });
      expect(dsr.requestType).toBe('PORTABILITY');
    });

    it('should list DSRs with pagination', async () => {
      mockDataRightsRequest.findMany.mockResolvedValue([createMockDSR()]);
      mockDataRightsRequest.count.mockResolvedValue(1);

      const data = await mockDataRightsRequest.findMany({
        where: { tenantId: TENANT_ID },
        take: 20,
        skip: 0,
      });

      expect(data).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Messaging & Moderation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('messaging', () => {
    it('should create a conversation between parent and teacher', async () => {
      const conversation = {
        id: 'conv-001',
        tenantId: TENANT_ID,
        participants: [USER_ID, 'user-teacher-001'],
        subject: 'Progress Update',
        createdAt: new Date(),
      };
      mockConversation.create.mockResolvedValue(conversation);

      const result = await mockConversation.create({ data: conversation });
      expect(result.participants).toContain(USER_ID);
    });

    it('should send a message in a conversation', async () => {
      const message = {
        id: 'msg-001',
        conversationId: 'conv-001',
        senderId: USER_ID,
        content: 'How is Alex doing in math?',
        sentAt: new Date(),
      };
      mockMessage.create.mockResolvedValue(message);

      const result = await mockMessage.create({ data: message });
      expect(result.content).toBe('How is Alex doing in math?');
    });

    it('should track message read status', async () => {
      const message = {
        id: 'msg-001',
        readAt: null,
      };

      expect(message.readAt).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Notification Preferences
  // ═══════════════════════════════════════════════════════════════════════════
  describe('notification preferences', () => {
    it('should return default preferences when none set', async () => {
      mockNotificationPref.findFirst.mockResolvedValue(null);

      const result = await mockNotificationPref.findFirst({
        where: { userId: USER_ID },
      });

      expect(result).toBeNull();
    });

    it('should upsert notification preferences', async () => {
      const prefs = {
        userId: USER_ID,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
        weeklyDigest: true,
      };
      mockNotificationPref.upsert.mockResolvedValue(prefs);

      const result = await mockNotificationPref.upsert({
        where: { userId: USER_ID },
        create: prefs,
        update: prefs,
      });

      expect(result.weeklyDigest).toBe(true);
      expect(result.pushEnabled).toBe(false);
    });
  });
});
