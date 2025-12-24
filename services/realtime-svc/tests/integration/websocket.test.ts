/**
 * WebSocket Integration Tests
 *
 * Tests for WebSocket gateway functionality including:
 * - Connection and authentication
 * - Room management
 * - Presence updates
 * - Message broadcasting
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket } from 'socket.io-client';
import * as jose from 'jose';
import { createApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

const TEST_PORT = 4001;
const TEST_URL = `http://localhost:${TEST_PORT}`;
const JWT_SECRET = 'test-secret-key-for-integration-tests';

// Test user data
const testUsers = {
  teacher1: {
    userId: 'teacher_001',
    tenantId: 'tenant_001',
    displayName: 'Teacher One',
    role: 'teacher',
  },
  teacher2: {
    userId: 'teacher_002',
    tenantId: 'tenant_001',
    displayName: 'Teacher Two',
    role: 'teacher',
  },
  student1: {
    userId: 'student_001',
    tenantId: 'tenant_001',
    displayName: 'Student One',
    role: 'student',
  },
};

/**
 * Generate a test JWT token
 */
async function generateTestToken(user: typeof testUsers.teacher1): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({
    sub: user.userId,
    tenantId: user.tenantId,
    displayName: user.displayName,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/**
 * Create a connected socket client
 */
async function createConnectedClient(user: typeof testUsers.teacher1): Promise<Socket> {
  const token = await generateTestToken(user);
  
  return new Promise((resolve, reject) => {
    const socket = ioClient(TEST_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });

    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

/**
 * Wait for an event with timeout
 */
function waitForEvent<T>(socket: Socket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('WebSocket Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Set test environment variables
    process.env.PORT = String(TEST_PORT);
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.REDIS_URL = 'redis://localhost:6379';

    app = await createApp();
    await app.listen({ port: TEST_PORT, host: '0.0.0.0' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Connection', () => {
    it('should connect with valid token', async () => {
      const socket = await createConnectedClient(testUsers.teacher1);
      expect(socket.connected).toBe(true);
      socket.disconnect();
    });

    it('should reject connection without token', async () => {
      await expect(
        new Promise((_, reject) => {
          const socket = ioClient(TEST_URL, {
            transports: ['websocket'],
            reconnection: false,
          });
          socket.on('connect_error', reject);
        })
      ).rejects.toThrow();
    });

    it('should reject connection with invalid token', async () => {
      await expect(
        new Promise((_, reject) => {
          const socket = ioClient(TEST_URL, {
            auth: { token: 'invalid-token' },
            transports: ['websocket'],
            reconnection: false,
          });
          socket.on('connect_error', reject);
        })
      ).rejects.toThrow();
    });
  });

  describe('Room Management', () => {
    let socket1: Socket;
    let socket2: Socket;

    beforeEach(async () => {
      socket1 = await createConnectedClient(testUsers.teacher1);
      socket2 = await createConnectedClient(testUsers.teacher2);
    });

    afterEach(() => {
      socket1?.disconnect();
      socket2?.disconnect();
    });

    it('should join a room successfully', async () => {
      const roomId = 'class:class_001';

      const joinPromise = new Promise((resolve) => {
        socket1.emit('room:join', { roomId }, (response: unknown) => {
          resolve(response);
        });
      });

      const response = await joinPromise as { success: boolean; state: unknown };
      expect(response.success).toBe(true);
      expect(response.state).toBeDefined();
    });

    it('should broadcast messages to room members', async () => {
      const roomId = 'class:class_002';

      // Both users join the room
      await new Promise((resolve) => {
        socket1.emit('room:join', { roomId }, resolve);
      });
      await new Promise((resolve) => {
        socket2.emit('room:join', { roomId }, resolve);
      });

      // Socket2 listens for messages
      const messagePromise = waitForEvent<{ message: string }>(socket2, 'room:message');

      // Socket1 sends a message
      socket1.emit('room:message', {
        roomId,
        message: 'Hello room!',
      });

      const received = await messagePromise;
      expect(received.message).toBe('Hello room!');
    });

    it('should leave a room successfully', async () => {
      const roomId = 'class:class_003';

      // Join room
      await new Promise((resolve) => {
        socket1.emit('room:join', { roomId }, resolve);
      });

      // Leave room
      const leavePromise = new Promise((resolve) => {
        socket1.emit('room:leave', { roomId }, (response: unknown) => {
          resolve(response);
        });
      });

      const response = await leavePromise as { success: boolean };
      expect(response.success).toBe(true);
    });
  });

  describe('Presence', () => {
    let socket1: Socket;
    let socket2: Socket;

    beforeEach(async () => {
      socket1 = await createConnectedClient(testUsers.teacher1);
      socket2 = await createConnectedClient(testUsers.teacher2);
    });

    afterEach(() => {
      socket1?.disconnect();
      socket2?.disconnect();
    });

    it('should sync presence when joining a room', async () => {
      const roomId = 'class:class_004';

      // Socket1 joins first
      await new Promise((resolve) => {
        socket1.emit('room:join', { roomId }, resolve);
      });

      // Socket2 requests presence sync and should see socket1
      const syncPromise = waitForEvent<{ presences: unknown[] }>(socket2, 'presence:sync');

      await new Promise((resolve) => {
        socket2.emit('room:join', { roomId }, resolve);
      });
      socket2.emit('presence:sync', { roomId });

      const sync = await syncPromise;
      expect(sync.presences).toBeDefined();
      expect(sync.presences.length).toBeGreaterThanOrEqual(1);
    });

    it('should broadcast presence updates', async () => {
      const roomId = 'class:class_005';

      // Both join the room
      await new Promise((resolve) => {
        socket1.emit('room:join', { roomId }, resolve);
      });
      await new Promise((resolve) => {
        socket2.emit('room:join', { roomId }, resolve);
      });

      // Socket2 listens for presence updates
      const presencePromise = waitForEvent<{ status: string }>(socket2, 'presence:update');

      // Socket1 updates presence
      socket1.emit('presence:update', {
        status: 'busy',
        currentActivity: 'Reviewing assignments',
      });

      const update = await presencePromise;
      expect(update.status).toBe('busy');
    });
  });

  describe('Collaboration', () => {
    let socket1: Socket;
    let socket2: Socket;
    const roomId = 'document:doc_001';

    beforeEach(async () => {
      socket1 = await createConnectedClient(testUsers.teacher1);
      socket2 = await createConnectedClient(testUsers.teacher2);

      // Both join the document room
      await new Promise((resolve) => {
        socket1.emit('room:join', { roomId }, resolve);
      });
      await new Promise((resolve) => {
        socket2.emit('room:join', { roomId }, resolve);
      });
    });

    afterEach(() => {
      socket1?.disconnect();
      socket2?.disconnect();
    });

    it('should broadcast collaborative operations', async () => {
      const operationPromise = waitForEvent<{ op: { type: string } }>(
        socket2,
        'collab:operation'
      );

      socket1.emit('collab:operation', {
        roomId,
        op: {
          type: 'insert',
          position: 0,
          text: 'Hello ',
          version: 1,
        },
      });

      const received = await operationPromise;
      expect(received.op.type).toBe('insert');
    });

    it('should broadcast cursor updates', async () => {
      const cursorPromise = waitForEvent<{ cursor: { position: number } }>(
        socket2,
        'collab:cursor'
      );

      socket1.emit('collab:cursor', {
        roomId,
        cursor: {
          position: 10,
          selectionStart: 10,
          selectionEnd: 10,
        },
      });

      const received = await cursorPromise;
      expect(received.cursor.position).toBe(10);
    });

    it('should acquire and release document locks', async () => {
      // Socket1 acquires lock
      const lockPromise = new Promise((resolve) => {
        socket1.emit('collab:lock', { roomId }, (response: unknown) => {
          resolve(response);
        });
      });

      const lockResponse = await lockPromise as { success: boolean };
      expect(lockResponse.success).toBe(true);

      // Socket2 should fail to acquire lock
      const lock2Promise = new Promise((resolve) => {
        socket2.emit('collab:lock', { roomId }, (response: unknown) => {
          resolve(response);
        });
      });

      const lock2Response = await lock2Promise as { success: boolean };
      expect(lock2Response.success).toBe(false);

      // Socket1 releases lock
      const unlockPromise = new Promise((resolve) => {
        socket1.emit('collab:unlock', { roomId }, (response: unknown) => {
          resolve(response);
        });
      });

      const unlockResponse = await unlockPromise as { success: boolean };
      expect(unlockResponse.success).toBe(true);

      // Now socket2 should be able to acquire lock
      const lock3Promise = new Promise((resolve) => {
        socket2.emit('collab:lock', { roomId }, (response: unknown) => {
          resolve(response);
        });
      });

      const lock3Response = await lock3Promise as { success: boolean };
      expect(lock3Response.success).toBe(true);
    });
  });

  describe('Analytics Subscription', () => {
    let socket: Socket;

    beforeEach(async () => {
      socket = await createConnectedClient(testUsers.teacher1);
    });

    afterEach(() => {
      socket?.disconnect();
    });

    it('should subscribe to class analytics', async () => {
      const subscribePromise = new Promise((resolve) => {
        socket.emit(
          'analytics:subscribe',
          { classId: 'class_001' },
          (response: unknown) => {
            resolve(response);
          }
        );
      });

      const response = await subscribePromise as { success: boolean };
      expect(response.success).toBe(true);
    });
  });
});
