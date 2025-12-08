import { vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// Mock the session service client
vi.mock('../src/services/sessionServiceClient.js', () => ({
  sessionServiceClient: {
    emitEvent: vi
      .fn()
      .mockResolvedValue({
        id: 'event-123',
        sessionId: 'session-123',
        eventType: 'FOCUS_LOSS_DETECTED',
        occurredAt: new Date().toISOString(),
      }),
    getRecentEvents: vi.fn().mockResolvedValue({ events: [] }),
  },
}));
