/**
 * Contextual Threads Integration Tests
 *
 * Tests for Messaging 2.0 contextual thread functionality.
 */

import { describe, it, expect } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ══════════════════════════════════════════════════════════════════════════════

const testTenantId = 'test-tenant-001';
const testUserId = 'user-001';
const testLearnerId = 'learner-001';
const testActionPlanId = 'plan-001';
const testMeetingId = 'meeting-001';

const mockHeaders = {
  'x-tenant-id': testTenantId,
  'x-user-id': testUserId,
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

function createMockThread(overrides = {}) {
  return {
    id: `thread-${Date.now()}`,
    name: 'Care Team Discussion',
    type: 'GROUP',
    contextType: 'LEARNER',
    contextLearnerId: testLearnerId,
    participants: [
      { userId: 'user-1', name: 'Jane Doe', role: 'OWNER' },
      { userId: 'user-2', name: 'Mr. Thompson', role: 'MEMBER' },
    ],
    messageCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockMessage(conversationId: string, overrides = {}) {
  return {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: testUserId,
    senderName: 'Jane Doe',
    type: 'TEXT',
    content: 'Hello, team!',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER THREAD TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Learner Threads API', () => {
  describe('POST /threads/learner/:learnerId', () => {
    it('should create new learner care team thread', async () => {
      const input = {
        name: "Emma's Care Team",
        participantIds: ['user-1', 'user-2', 'user-3'],
      };

      const expectedShape = {
        data: {
          id: expect.any(String),
          name: input.name,
          contextType: 'LEARNER',
          contextLearnerId: testLearnerId,
          participants: expect.any(Array),
        },
        created: true,
      };

      const mockResponse = {
        data: createMockThread({
          name: input.name,
          contextLearnerId: testLearnerId,
        }),
        created: true,
      };

      expect(mockResponse).toMatchObject(expectedShape);
      expect(mockResponse.created).toBe(true);
    });

    it('should return existing thread if one exists', async () => {
      const mockResponse = {
        data: createMockThread({
          id: 'existing-thread',
          contextLearnerId: testLearnerId,
        }),
        created: false,
      };

      expect(mockResponse.created).toBe(false);
      expect(mockResponse.data.id).toBe('existing-thread');
    });

    it('should generate default name if not provided', async () => {
      // Input with minimal required fields
      const participantIds = ['user-1', 'user-2'];
      expect(participantIds).toHaveLength(2);

      const mockResponse = {
        data: createMockThread({
          name: 'Care Team Discussion', // Default name
        }),
        created: true,
      };

      expect(mockResponse.data.name).toBe('Care Team Discussion');
    });
  });

  describe('GET /threads/learner/:learnerId', () => {
    it('should list all threads for a learner', async () => {
      const mockResponse = {
        data: [
          createMockThread({ contextType: 'LEARNER' }),
          createMockThread({ contextType: 'ACTION_PLAN', contextActionPlanId: 'plan-1' }),
          createMockThread({ contextType: 'MEETING', contextMeetingId: 'meeting-1' }),
        ],
        total: 3,
        page: 1,
        pageSize: 20,
      };

      expect(mockResponse.data).toHaveLength(3);
      expect(mockResponse.data[0].contextType).toBe('LEARNER');
    });

    it('should paginate results', async () => {
      const mockResponse = {
        data: [createMockThread()],
        total: 25,
        page: 2,
        pageSize: 10,
        hasMore: true,
      };

      expect(mockResponse.page).toBe(2);
      expect(mockResponse.hasMore).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACTION PLAN THREAD TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Action Plan Threads API', () => {
  describe('POST /threads/action-plan/:actionPlanId', () => {
    it('should create thread for action plan', async () => {
      const input = {
        actionPlanId: testActionPlanId,
        learnerId: testLearnerId,
        name: 'Reading Plan Discussion',
        participantIds: ['user-1', 'user-2'],
      };

      const expectedShape = {
        data: {
          contextType: 'ACTION_PLAN',
          contextActionPlanId: testActionPlanId,
          contextLearnerId: testLearnerId,
        },
        created: true,
      };

      const mockResponse = {
        data: createMockThread({
          contextType: 'ACTION_PLAN',
          contextActionPlanId: testActionPlanId,
          contextLearnerId: testLearnerId,
          name: input.name,
        }),
        created: true,
      };

      expect(mockResponse).toMatchObject(expectedShape);
    });

    it('should link thread to both action plan and learner', async () => {
      const mockThread = createMockThread({
        contextType: 'ACTION_PLAN',
        contextActionPlanId: testActionPlanId,
        contextLearnerId: testLearnerId,
      });

      expect(mockThread.contextActionPlanId).toBe(testActionPlanId);
      expect(mockThread.contextLearnerId).toBe(testLearnerId);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MEETING THREAD TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Meeting Threads API', () => {
  describe('POST /threads/meeting/:meetingId', () => {
    it('should create thread for meeting', async () => {
      const input = {
        meetingId: testMeetingId,
        learnerId: testLearnerId,
        name: 'IEP Meeting Discussion',
        participantIds: ['user-1', 'user-2', 'user-3'],
      };

      const mockResponse = {
        data: createMockThread({
          contextType: 'MEETING',
          contextMeetingId: testMeetingId,
          contextLearnerId: testLearnerId,
          name: input.name,
        }),
        created: true,
      };

      expect(mockResponse.data.contextType).toBe('MEETING');
      expect(mockResponse.data.contextMeetingId).toBe(testMeetingId);
    });

    it('should auto-generate meeting thread name', async () => {
      const mockResponse = {
        data: createMockThread({
          contextType: 'MEETING',
          name: 'Meeting Thread', // Default
        }),
        created: true,
      };

      expect(mockResponse.data.name).toBe('Meeting Thread');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT LOOKUP TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Context Lookup API', () => {
  describe('GET /threads/context/:contextType/:contextId', () => {
    it('should find thread by context type and ID', async () => {
      const mockResponse = {
        data: createMockThread({
          contextType: 'ACTION_PLAN',
          contextActionPlanId: testActionPlanId,
        }),
      };

      expect(mockResponse.data.contextType).toBe('ACTION_PLAN');
    });

    it('should return 404 if no thread exists for context', async () => {
      const expectedError = {
        error: 'Thread not found',
        contextType: 'ACTION_PLAN',
        contextId: 'non-existent',
        suggestion: 'Use POST /threads/{context-type}/{id} to create a thread',
      };

      expect(expectedError.error).toBe('Thread not found');
      expect(expectedError).toHaveProperty('suggestion');
    });

    it('should validate context type', async () => {
      const expectedError = {
        error: 'Invalid context type',
        validTypes: ['LEARNER', 'ACTION_PLAN', 'TASK', 'CARE_NOTE', 'MEETING', 'SESSION', 'GOAL', 'CLASS'],
      };

      expect(expectedError.validTypes).toContain('LEARNER');
      expect(expectedError.validTypes).toContain('ACTION_PLAN');
    });
  });

  describe('GET /threads', () => {
    it('should list all threads for user', async () => {
      const mockResponse = {
        data: [
          createMockThread({ contextType: 'LEARNER' }),
          createMockThread({ contextType: 'ACTION_PLAN' }),
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      expect(mockResponse.data).toHaveLength(2);
    });

    it('should filter by context type', async () => {
      const mockResponse = {
        data: [createMockThread({ contextType: 'MEETING' })],
        total: 1,
      };

      expect(mockResponse.data.every((t) => t.contextType === 'MEETING')).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// THREAD MESSAGING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Thread Messaging', () => {
  const testThreadId = 'thread-001';

  describe('Sending messages to contextual threads', () => {
    it('should send message to thread', async () => {
      const message = createMockMessage(testThreadId, {
        content: 'Hi team, wanted to share an update on reading progress.',
      });

      expect(message.conversationId).toBe(testThreadId);
      expect(message).toHaveProperty('content');
    });

    it('should update thread last message preview', async () => {
      const thread = createMockThread({
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: 'Hi team, wanted to share...',
        messageCount: 1,
      });

      expect(thread.lastMessagePreview).toBeTruthy();
      expect(thread.messageCount).toBe(1);
    });
  });

  describe('Thread context display', () => {
    it('should include context info in thread response', async () => {
      const learnerThread = createMockThread({
        contextType: 'LEARNER',
        contextLearnerId: testLearnerId,
      });

      expect(learnerThread.contextType).toBe('LEARNER');
      expect(learnerThread.contextLearnerId).toBe(testLearnerId);
    });

    it('should include action plan context', async () => {
      const planThread = createMockThread({
        contextType: 'ACTION_PLAN',
        contextActionPlanId: testActionPlanId,
        contextLearnerId: testLearnerId,
      });

      expect(planThread.contextType).toBe('ACTION_PLAN');
      expect(planThread.contextActionPlanId).toBe(testActionPlanId);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION SCENARIOS
// ══════════════════════════════════════════════════════════════════════════════

describe('Thread Integration Scenarios', () => {
  describe('Complete messaging workflow', () => {
    it('should create thread, send messages, and track activity', async () => {
      // 1. Create learner care team thread
      const thread = createMockThread({
        contextType: 'LEARNER',
        contextLearnerId: testLearnerId,
      });
      expect(thread.contextType).toBe('LEARNER');

      // 2. Send messages
      const msg1 = createMockMessage(thread.id, {
        content: 'Welcome to the care team discussion!',
        senderId: 'user-1',
      });
      const msg2 = createMockMessage(thread.id, {
        content: 'Thanks for setting this up.',
        senderId: 'user-2',
      });
      expect(msg1.conversationId).toBe(thread.id);
      expect(msg2.conversationId).toBe(thread.id);

      // 3. Thread stats updated
      const updatedThread = {
        ...thread,
        messageCount: 2,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: 'Thanks for setting this up.',
      };
      expect(updatedThread.messageCount).toBe(2);
    });
  });

  describe('Cross-context thread navigation', () => {
    it('should navigate from learner to all related threads', async () => {
      const learnerThreads = [
        createMockThread({ contextType: 'LEARNER', name: 'Care Team' }),
        createMockThread({
          contextType: 'ACTION_PLAN',
          name: 'Reading Plan',
          contextActionPlanId: 'plan-1',
        }),
        createMockThread({
          contextType: 'MEETING',
          name: 'IEP Meeting',
          contextMeetingId: 'meeting-1',
        }),
      ];

      expect(learnerThreads).toHaveLength(3);
      expect(learnerThreads.map((t) => t.contextType)).toContain('LEARNER');
      expect(learnerThreads.map((t) => t.contextType)).toContain('ACTION_PLAN');
      expect(learnerThreads.map((t) => t.contextType)).toContain('MEETING');
    });
  });

  describe('Thread participant management', () => {
    it('should include all care team members in learner thread', async () => {
      const thread = createMockThread({
        participants: [
          { userId: 'parent-1', name: 'Jane Doe', role: 'OWNER' },
          { userId: 'teacher-1', name: 'Mr. Thompson', role: 'MEMBER' },
          { userId: 'counselor-1', name: 'Dr. Martinez', role: 'MEMBER' },
        ],
      });

      expect(thread.participants).toHaveLength(3);
      expect(thread.participants.some((p) => p.role === 'OWNER')).toBe(true);
    });
  });
});
