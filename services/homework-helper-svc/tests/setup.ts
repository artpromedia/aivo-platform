import { vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// Mock fetch globally for service-to-service calls
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
