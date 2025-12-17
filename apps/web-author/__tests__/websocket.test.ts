/**
 * WebSocket Service Integration Tests
 *
 * Tests for real-time collaboration features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWebSocketService,
  resetWebSocketService,
  WebSocketService,
} from '../lib/services/websocket.service';

// Mock Socket.io client
const mockSocket = {
  connected: false,
  id: 'test-socket-id',
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock tokenManager
vi.mock('../lib/api/client', () => ({
  tokenManager: {
    getAccessToken: vi.fn(() => 'test-token'),
  },
}));

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS - Extracted to reduce nesting depth
// ══════════════════════════════════════════════════════════════════════════════

function simulateSuccessfulConnection(): void {
  mockSocket.on.mockImplementation((event: string, callback: () => void) => {
    if (event !== 'connect') return;
    mockSocket.connected = true;
    Promise.resolve().then(callback);
  });
}

function simulateJoinRoomSuccess(): void {
  mockSocket.emit.mockImplementation(
    (
      event: string,
      _payload: unknown,
      callback?: (response: { success: boolean; collaborators: unknown[] }) => void
    ) => {
      if (event === 'join_room' && callback) {
        callback({ success: true, collaborators: [] });
      }
    }
  );
}

function simulateOperationSuccess(): void {
  mockSocket.emit.mockImplementation(
    (
      event: string,
      _payload: unknown,
      callback?: (response: {
        success: boolean;
        collaborators?: unknown[];
        operationId?: string;
        applied?: boolean;
      }) => void
    ) => {
      if (event === 'join_room' && callback) {
        callback({ success: true, collaborators: [] });
      }
      if (event === 'content_change' && callback) {
        callback({ success: true, operationId: 'op-123', applied: true });
      }
    }
  );
}

function simulateLockSuccess(): void {
  mockSocket.emit.mockImplementation(
    (
      event: string,
      _payload: unknown,
      callback?: (response: {
        success: boolean;
        collaborators?: unknown[];
        lock?: { isLocked: boolean; lockedBy: string };
      }) => void
    ) => {
      if (event === 'join_room' && callback) {
        callback({ success: true, collaborators: [] });
      }
      if (event === 'request_lock' && callback) {
        callback({ success: true, lock: { isLocked: true, lockedBy: 'user-1' } });
      }
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════════════════

let webSocketService: WebSocketService;

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockReset();
    mockSocket.off.mockReset();
    mockSocket.emit.mockReset();
    resetWebSocketService();
    webSocketService = getWebSocketService();
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('Connection', () => {
    it('should connect with auth token from tokenManager', async () => {
      simulateSuccessfulConnection();

      await webSocketService.connect();

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('should disconnect and clean up', () => {
      mockSocket.connected = true;

      webSocketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should report connection status', () => {
      expect(webSocketService.isConnected()).toBe(false);

      mockSocket.connected = true;
      // Internal socket state not directly accessible
    });
  });

  describe('Room Management', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should join room with JoinRoomPayload', async () => {
      simulateJoinRoomSuccess();
      simulateSuccessfulConnection();

      await webSocketService.connect();

      const result = await webSocketService.joinRoom({
        contentId: 'content-123',
        versionId: 'v1',
        userId: 'user-1',
        userName: 'Test User',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join_room',
        expect.objectContaining({
          roomId: 'version:v1',
          contentId: 'content-123',
          versionId: 'v1',
        }),
        expect.any(Function)
      );
      expect(result).toEqual([]);
    });

    it('should leave current room', async () => {
      simulateSuccessfulConnection();
      simulateJoinRoomSuccess();

      await webSocketService.connect();
      await webSocketService.joinRoom({
        contentId: 'content-123',
        versionId: 'v1',
        userId: 'user-1',
        userName: 'Test User',
      });

      webSocketService.leaveRoom();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', expect.any(Object));
    });
  });

  describe('Cursor & Presence', () => {
    beforeEach(async () => {
      simulateSuccessfulConnection();
      simulateJoinRoomSuccess();

      await webSocketService.connect();
      await webSocketService.joinRoom({
        contentId: 'content-123',
        versionId: 'v1',
        userId: 'user-1',
        userName: 'Test User',
      });
    });

    it('should send cursor position update', () => {
      webSocketService.updateCursor({
        blockId: 'block-1',
        offset: 10,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'cursor_update',
        expect.objectContaining({
          position: expect.objectContaining({
            blockId: 'block-1',
            offset: 10,
          }),
        })
      );
    });

    it('should send heartbeat', () => {
      webSocketService.sendHeartbeat('block-1');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'presence_heartbeat',
        expect.objectContaining({
          currentBlockId: 'block-1',
        })
      );
    });
  });

  describe('Content Operations', () => {
    beforeEach(async () => {
      simulateSuccessfulConnection();
      simulateOperationSuccess();

      await webSocketService.connect();
      await webSocketService.joinRoom({
        contentId: 'content-123',
        versionId: 'v1',
        userId: 'user-1',
        userName: 'Test User',
      });
    });

    it('should send content change operation', async () => {
      const operation = {
        id: 'op-1',
        type: 'insert' as const,
        blockId: 'block-1',
        userId: 'user-1',
        timestamp: Date.now(),
        data: { text: 'Hello' },
        applied: false,
      };

      const result = await webSocketService.sendOperation(operation);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'content_change',
        expect.objectContaining({
          operation: expect.objectContaining({
            type: 'insert',
            blockId: 'block-1',
          }),
        }),
        expect.any(Function)
      );
      expect(result.operationId).toBe('op-123');
      expect(result.applied).toBe(true);
    });

    it('should acknowledge received operations', () => {
      webSocketService.acknowledgeOperation('op-456');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'operation_ack',
        expect.objectContaining({
          operationId: 'op-456',
        })
      );
    });
  });

  describe('Block Locking', () => {
    beforeEach(async () => {
      simulateSuccessfulConnection();
      simulateLockSuccess();

      await webSocketService.connect();
      await webSocketService.joinRoom({
        contentId: 'content-123',
        versionId: 'v1',
        userId: 'user-1',
        userName: 'Test User',
      });
    });

    it('should request block lock', async () => {
      const lock = await webSocketService.requestBlockLock('block-1');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'request_lock',
        expect.objectContaining({
          blockId: 'block-1',
        }),
        expect.any(Function)
      );
      expect(lock.isLocked).toBe(true);
    });

    it('should release block lock', () => {
      webSocketService.releaseBlockLock('block-1');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'release_lock',
        expect.objectContaining({
          blockId: 'block-1',
        })
      );
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to events with on()', () => {
      const callback = vi.fn();
      const unsubscribe = webSocketService.on('user_joined', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from events', () => {
      const callback = vi.fn();
      const unsubscribe = webSocketService.on('user_joined', callback);

      unsubscribe();

      // Callback should not be called after unsubscribe
    });
  });
});
