/**
 * WebSocket Server
 *
 * Real-time notifications for gamification events
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { eventEmitter } from '../events/event-emitter.js';

interface ClientConnection {
  ws: WebSocket;
  studentId: string;
  isAlive: boolean;
}

const clients = new Map<string, ClientConnection>();

export function startWebSocketServer(server: HTTPServer): void {
  const wss = new WebSocketServer({ server, path: '/ws/gamification' });

  // Heartbeat to detect stale connections
  const heartbeatInterval = setInterval(() => {
    clients.forEach((client, key) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(key);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws, req) => {
    // Extract studentId from query or header
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const studentId = url.searchParams.get('studentId');

    if (!studentId) {
      ws.close(4001, 'Student ID required');
      return;
    }

    const connectionId = `${studentId}-${Date.now()}`;
    const client: ClientConnection = {
      ws,
      studentId,
      isAlive: true,
    };

    clients.set(connectionId, client);
    console.log(`WebSocket connected: ${studentId}`);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(client, data);
      } catch {
        // Invalid JSON, ignore
      }
    });

    ws.on('close', () => {
      clients.delete(connectionId);
      console.log(`WebSocket disconnected: ${studentId}`);
    });

    // Send welcome message
    sendToClient(ws, {
      type: 'connected',
      message: 'Connected to gamification service',
    });
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // XP awarded
  eventEmitter.on('xp.awarded', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'xp_awarded',
      data: {
        amount: data.amount,
        activity: data.activity,
        totalXP: data.totalXP,
        dailyXP: data.dailyXP,
      },
    });
  });

  // Level up
  eventEmitter.on('level.up', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'level_up',
      data: {
        previousLevel: data.previousLevel,
        newLevel: data.newLevel,
        levelName: data.levelName,
        rewards: data.rewards,
      },
    });
  });

  // Achievement earned
  eventEmitter.on('achievement.earned', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'achievement_earned',
      data: {
        achievementId: data.achievementId,
        title: data.title,
        description: data.description,
        icon: data.icon,
        rarity: data.rarity,
        xpReward: data.xpReward,
      },
    });
  });

  // Streak milestone
  eventEmitter.on('streak.milestone', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'streak_milestone',
      data: {
        days: data.days,
        milestoneName: data.milestoneName,
        xpBonus: data.xpBonus,
      },
    });
  });

  // Challenge completed
  eventEmitter.on('challenge.completed', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'challenge_completed',
      data: {
        challengeId: data.challengeId,
        title: data.title,
        xpReward: data.xpReward,
        coinReward: data.coinReward,
      },
    });
  });

  // Daily goal completed
  eventEmitter.on('goal.dailyCompleted', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'daily_goal_completed',
      data: {
        goalType: data.goalType,
        xpBonus: data.xpBonus,
      },
    });
  });

  // Break reminder
  eventEmitter.on('session.breakReminder', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'break_reminder',
      data: {
        sessionMinutes: data.sessionMinutes,
        message: `You've been learning for ${data.sessionMinutes} minutes! Take a short break to stay fresh.`,
      },
    });
  });

  // Shop purchase
  eventEmitter.on('shop.purchase', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'purchase_complete',
      data: {
        itemName: data.itemName,
        price: data.price,
        currency: data.currency,
      },
    });
  });

  // Leaderboard position change
  eventEmitter.on('leaderboard.positionChange', (data) => {
    broadcastToStudent(data.studentId, {
      type: 'rank_change',
      data: {
        previousRank: data.previousRank,
        newRank: data.newRank,
        scope: data.scope,
        period: data.period,
      },
    });
  });

  console.log('WebSocket event handlers registered');
}

/**
 * Handle messages from client
 */
function handleClientMessage(client: ClientConnection, data: { type: string; payload?: unknown }): void {
  switch (data.type) {
    case 'ping':
      sendToClient(client.ws, { type: 'pong' });
      break;

    case 'subscribe':
      // Client can subscribe to specific event types
      // For now, all clients receive all their own events
      break;

    default:
      // Unknown message type
      break;
  }
}

/**
 * Send message to a specific client
 */
function sendToClient(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast message to all connections for a student
 */
function broadcastToStudent(studentId: string, message: unknown): void {
  clients.forEach((client) => {
    if (client.studentId === studentId) {
      sendToClient(client.ws, message);
    }
  });
}

/**
 * Broadcast message to all connected clients
 */
export function broadcastToAll(message: unknown): void {
  clients.forEach((client) => {
    sendToClient(client.ws, message);
  });
}

/**
 * Get count of connected clients
 */
export function getConnectionCount(): number {
  return clients.size;
}

/**
 * Get count of unique students connected
 */
export function getUniqueStudentCount(): number {
  const uniqueStudents = new Set<string>();
  clients.forEach((client) => {
    uniqueStudents.add(client.studentId);
  });
  return uniqueStudents.size;
}
