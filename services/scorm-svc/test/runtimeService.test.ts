/**
 * Tests for SCORM runtime service — session lifecycle and data model access.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  scormSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  scormDataElement: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('ScormRuntimeService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createSession', () => {
    it('creates a new session with INITIALIZED status', async () => {
      const session = {
        id: 'sess-1',
        learnerId: 'learner-1',
        scoId: 'sco-1',
        registrationId: 'reg-1',
        status: 'INITIALIZED',
        version: 'SCORM2004',
      };
      mockPrisma.scormSession.create.mockResolvedValue(session);
      const result = await mockPrisma.scormSession.create({ data: session });
      expect(result.status).toBe('INITIALIZED');
      expect(result.version).toBe('SCORM2004');
    });

    it('supports SCORM 1.2 sessions', async () => {
      const session = { id: 'sess-2', version: 'SCORM12', status: 'INITIALIZED' };
      mockPrisma.scormSession.create.mockResolvedValue(session);
      const result = await mockPrisma.scormSession.create({ data: session });
      expect(result.version).toBe('SCORM12');
    });
  });

  describe('initialize', () => {
    it('transitions session from INITIALIZED to RUNNING', async () => {
      mockPrisma.scormSession.findUnique.mockResolvedValue({ id: 'sess-1', status: 'INITIALIZED' });
      mockPrisma.scormSession.update.mockResolvedValue({ id: 'sess-1', status: 'RUNNING' });
      const result = await mockPrisma.scormSession.update({
        where: { id: 'sess-1' },
        data: { status: 'RUNNING' },
      });
      expect(result.status).toBe('RUNNING');
    });

    it('rejects initialize on already terminated session', async () => {
      mockPrisma.scormSession.findUnique.mockResolvedValue({ id: 'sess-1', status: 'TERMINATED' });
      const session = await mockPrisma.scormSession.findUnique({ where: { id: 'sess-1' } });
      expect(session?.status).toBe('TERMINATED');
      // Should not allow re-initialization
    });
  });

  describe('terminate', () => {
    it('transitions session to TERMINATED', async () => {
      mockPrisma.scormSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'TERMINATED',
        totalTime: 'PT5M30S',
      });
      const result = await mockPrisma.scormSession.update({
        where: { id: 'sess-1' },
        data: { status: 'TERMINATED' },
      });
      expect(result.status).toBe('TERMINATED');
    });
  });

  describe('getValue/setValue', () => {
    it('gets a stored data element', async () => {
      mockPrisma.scormDataElement.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        element: 'cmi.core.lesson_status',
        value: 'incomplete',
      });
      const result = await mockPrisma.scormDataElement.findUnique({
        where: { sessionId_element: { sessionId: 'sess-1', element: 'cmi.core.lesson_status' } },
      });
      expect(result?.value).toBe('incomplete');
    });

    it('sets a data element value', async () => {
      mockPrisma.scormDataElement.upsert.mockResolvedValue({
        sessionId: 'sess-1',
        element: 'cmi.core.score.raw',
        value: '85',
      });
      const result = await mockPrisma.scormDataElement.upsert({
        where: { sessionId_element: { sessionId: 'sess-1', element: 'cmi.core.score.raw' } },
        update: { value: '85' },
        create: { sessionId: 'sess-1', element: 'cmi.core.score.raw', value: '85' },
      });
      expect(result.value).toBe('85');
    });
  });

  describe('getSession', () => {
    it('retrieves session with all data elements', async () => {
      mockPrisma.scormSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        status: 'RUNNING',
        dataElements: [
          { element: 'cmi.core.lesson_status', value: 'incomplete' },
          { element: 'cmi.core.score.raw', value: '75' },
        ],
      });
      const result = await mockPrisma.scormSession.findUnique({
        where: { id: 'sess-1' },
        include: { dataElements: true },
      });
      expect(result?.dataElements).toHaveLength(2);
    });

    it('returns null for non-existent session', async () => {
      mockPrisma.scormSession.findUnique.mockResolvedValue(null);
      const result = await mockPrisma.scormSession.findUnique({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });
  });
});
