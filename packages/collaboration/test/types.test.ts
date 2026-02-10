import { describe, it, expect } from 'vitest';
import type {
  ConnectionState,
  ConnectionInfo,
  UserStatus,
  PresenceUser,
  PresenceUpdate,
  RoomType,
  RoomUser,
} from '../src/types.js';

/**
 * Type-level tests for @aivo/collaboration
 *
 * The collaboration package primarily exports React hooks and components
 * that require a browser/WebSocket environment. These tests validate
 * the type contracts and constant values that the package exports.
 */

// ============================================================================
// ConnectionState type contract
// ============================================================================
describe('ConnectionState type', () => {
  it('accepts all valid connection states', () => {
    const states: ConnectionState[] = [
      'connecting',
      'connected',
      'reconnecting',
      'disconnected',
      'error',
    ];
    expect(states.length).toBe(5);
    expect(new Set(states).size).toBe(5);
  });
});

// ============================================================================
// UserStatus type contract
// ============================================================================
describe('UserStatus type', () => {
  it('accepts all valid user statuses', () => {
    const statuses: UserStatus[] = ['online', 'away', 'busy', 'offline'];
    expect(statuses.length).toBe(4);
    expect(new Set(statuses).size).toBe(4);
  });
});

// ============================================================================
// RoomType type contract
// ============================================================================
describe('RoomType type', () => {
  it('accepts all valid room types', () => {
    const types: RoomType[] = [
      'class',
      'lesson',
      'assessment',
      'whiteboard',
      'document',
      'session',
      'chat',
    ];
    expect(types.length).toBe(7);
    expect(new Set(types).size).toBe(7);
  });
});

// ============================================================================
// Interface shape validation
// ============================================================================
describe('PresenceUser interface', () => {
  it('constructs a valid PresenceUser object', () => {
    const user: PresenceUser = {
      userId: 'user-1',
      displayName: 'Test User',
      status: 'online',
      lastSeen: new Date(),
    };
    expect(user.userId).toBe('user-1');
    expect(user.displayName).toBe('Test User');
    expect(user.status).toBe('online');
    expect(user.lastSeen).toBeInstanceOf(Date);
  });

  it('supports optional fields', () => {
    const user: PresenceUser = {
      userId: 'user-2',
      displayName: 'Another',
      status: 'away',
      lastSeen: new Date(),
      avatarUrl: 'https://example.com/avatar.png',
      customStatus: 'In a meeting',
      currentRoom: 'room-1',
      currentActivity: 'editing',
    };
    expect(user.avatarUrl).toBe('https://example.com/avatar.png');
    expect(user.customStatus).toBe('In a meeting');
  });
});

describe('PresenceUpdate interface', () => {
  it('constructs a valid PresenceUpdate', () => {
    const update: PresenceUpdate = { status: 'busy' };
    expect(update.status).toBe('busy');
  });

  it('supports optional custom status', () => {
    const update: PresenceUpdate = { status: 'away', customStatus: 'BRB' };
    expect(update.customStatus).toBe('BRB');
  });
});

describe('ConnectionInfo interface', () => {
  it('constructs a valid ConnectionInfo', () => {
    const info: ConnectionInfo = {
      socketId: 'sock-123',
      userId: 'user-1',
      tenantId: 'tenant-1',
      state: 'connected',
      latency: 42,
      serverTime: Date.now(),
    };
    expect(info.state).toBe('connected');
    expect(info.latency).toBe(42);
    expect(typeof info.serverTime).toBe('number');
  });
});

describe('RoomUser interface', () => {
  it('constructs a valid RoomUser', () => {
    const user: RoomUser = {
      userId: 'user-1',
      displayName: 'Student',
      color: '#ff0000',
      joinedAt: new Date(),
    };
    expect(user.color).toBe('#ff0000');
    expect(user.joinedAt).toBeInstanceOf(Date);
  });
});
