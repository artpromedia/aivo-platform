/**
 * Chat Service
 *
 * Manages real-time chat functionality with:
 * - Message persistence
 * - Threaded conversations
 * - Reactions
 * - Typing indicators
 * - Read receipts
 * - Message search
 */

import { nanoid } from 'nanoid';
import { getRedisClient, RedisKeys } from '../redis/index.js';
import { config } from '../config.js';

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  type: 'text' | 'system' | 'file' | 'image';
  replyTo?: string;
  threadId?: string;
  attachments?: ChatAttachment[];
  reactions: ChatReaction[];
  mentions?: string[];
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  createdAt: Date;
}

/**
 * Chat attachment
 */
export interface ChatAttachment {
  id: string;
  type: 'file' | 'image' | 'video' | 'audio' | 'link';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat reaction
 */
export interface ChatReaction {
  emoji: string;
  userIds: string[];
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  userId: string;
  displayName: string;
  timestamp: number;
}

/**
 * Read receipt
 */
export interface ReadReceipt {
  userId: string;
  messageId: string;
  timestamp: Date;
}

/**
 * Thread summary
 */
export interface ThreadSummary {
  threadId: string;
  parentMessageId: string;
  replyCount: number;
  lastReply: Date;
  participants: string[];
}

/**
 * Chat Service
 */
export class ChatService {
  private readonly MAX_MESSAGES = 500; // Max messages per room in memory
  private readonly MESSAGE_TTL = 86400 * 7; // 7 days
  private readonly TYPING_TTL = 5; // 5 seconds

  /**
   * Send a message
   */
  async sendMessage(
    roomId: string,
    userId: string,
    displayName: string,
    content: string,
    options?: {
      avatarUrl?: string;
      type?: ChatMessage['type'];
      replyTo?: string;
      threadId?: string;
      attachments?: ChatAttachment[];
      mentions?: string[];
    }
  ): Promise<ChatMessage> {
    const redis = getRedisClient();
    const messageId = nanoid(12);

    const message: ChatMessage = {
      id: messageId,
      roomId,
      userId,
      displayName,
      avatarUrl: options?.avatarUrl,
      content,
      type: options?.type || 'text',
      replyTo: options?.replyTo,
      threadId: options?.threadId,
      attachments: options?.attachments || [],
      reactions: [],
      mentions: options?.mentions || [],
      edited: false,
      deleted: false,
      createdAt: new Date(),
    };

    // Store in Redis
    const key = `chat:messages:${roomId}`;
    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, this.MAX_MESSAGES - 1);
    await redis.expire(key, this.MESSAGE_TTL);

    // Store individual message for quick lookup
    await redis.setex(
      `chat:message:${messageId}`,
      this.MESSAGE_TTL,
      JSON.stringify(message)
    );

    // Update thread if this is a reply
    if (options?.threadId) {
      await this.updateThread(roomId, options.threadId, messageId, userId);
    }

    // Index mentions
    if (options?.mentions?.length) {
      for (const mentionedUserId of options.mentions) {
        await redis.lpush(
          `chat:mentions:${mentionedUserId}`,
          JSON.stringify({ messageId, roomId, timestamp: new Date() })
        );
        await redis.ltrim(`chat:mentions:${mentionedUserId}`, 0, 99);
      }
    }

    console.log(`[Chat] Message ${messageId} sent to room ${roomId}`);
    return message;
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<ChatMessage | null> {
    const redis = getRedisClient();
    const messageStr = await redis.get(`chat:message:${messageId}`);

    if (!messageStr) {
      return null;
    }

    const message: ChatMessage = JSON.parse(messageStr);

    // Only author can edit
    if (message.userId !== userId) {
      throw new Error('Not authorized to edit this message');
    }

    // Update message
    message.content = newContent;
    message.edited = true;
    message.editedAt = new Date();

    // Save updated message
    await redis.setex(
      `chat:message:${messageId}`,
      this.MESSAGE_TTL,
      JSON.stringify(message)
    );

    console.log(`[Chat] Message ${messageId} edited`);
    return message;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const redis = getRedisClient();
    const messageStr = await redis.get(`chat:message:${messageId}`);

    if (!messageStr) {
      return false;
    }

    const message: ChatMessage = JSON.parse(messageStr);

    // Only author can delete
    if (message.userId !== userId) {
      throw new Error('Not authorized to delete this message');
    }

    // Soft delete
    message.deleted = true;
    message.content = '[Message deleted]';
    message.attachments = [];

    await redis.setex(
      `chat:message:${messageId}`,
      this.MESSAGE_TTL,
      JSON.stringify(message)
    );

    console.log(`[Chat] Message ${messageId} deleted`);
    return true;
  }

  /**
   * Toggle reaction on a message
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reactions: ChatReaction[] }> {
    const redis = getRedisClient();
    const messageStr = await redis.get(`chat:message:${messageId}`);

    if (!messageStr) {
      throw new Error('Message not found');
    }

    const message: ChatMessage = JSON.parse(messageStr);
    let added = false;

    // Find or create reaction
    let reaction = message.reactions.find((r) => r.emoji === emoji);

    if (reaction) {
      const userIndex = reaction.userIds.indexOf(userId);
      if (userIndex > -1) {
        // Remove reaction
        reaction.userIds.splice(userIndex, 1);
        if (reaction.userIds.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        // Add reaction
        reaction.userIds.push(userId);
        added = true;
      }
    } else {
      // Create new reaction
      message.reactions.push({ emoji, userIds: [userId] });
      added = true;
    }

    // Save updated message
    await redis.setex(
      `chat:message:${messageId}`,
      this.MESSAGE_TTL,
      JSON.stringify(message)
    );

    console.log(`[Chat] Reaction ${emoji} ${added ? 'added to' : 'removed from'} message ${messageId}`);
    return { added, reactions: message.reactions };
  }

  /**
   * Get messages for a room
   */
  async getMessages(
    roomId: string,
    options?: {
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<ChatMessage[]> {
    const redis = getRedisClient();
    const key = `chat:messages:${roomId}`;
    const limit = options?.limit || 50;

    let messages: string[];

    if (options?.before) {
      // Get messages before a specific message
      const allMessages = await redis.lrange(key, 0, -1);
      const beforeIndex = allMessages.findIndex((m) => {
        const msg = JSON.parse(m);
        return msg.id === options.before;
      });

      if (beforeIndex > -1) {
        messages = allMessages.slice(beforeIndex + 1, beforeIndex + 1 + limit);
      } else {
        messages = [];
      }
    } else if (options?.after) {
      // Get messages after a specific message
      const allMessages = await redis.lrange(key, 0, -1);
      const afterIndex = allMessages.findIndex((m) => {
        const msg = JSON.parse(m);
        return msg.id === options.after;
      });

      if (afterIndex > -1) {
        messages = allMessages.slice(Math.max(0, afterIndex - limit), afterIndex);
      } else {
        messages = [];
      }
    } else {
      // Get latest messages
      messages = await redis.lrange(key, 0, limit - 1);
    }

    return messages.map((m) => JSON.parse(m)).reverse();
  }

  /**
   * Get a single message
   */
  async getMessage(messageId: string): Promise<ChatMessage | null> {
    const redis = getRedisClient();
    const messageStr = await redis.get(`chat:message:${messageId}`);
    return messageStr ? JSON.parse(messageStr) : null;
  }

  /**
   * Set typing indicator
   */
  async setTyping(
    roomId: string,
    userId: string,
    displayName: string,
    isTyping: boolean
  ): Promise<void> {
    const redis = getRedisClient();
    const key = `chat:typing:${roomId}`;

    if (isTyping) {
      const indicator: TypingIndicator = {
        userId,
        displayName,
        timestamp: Date.now(),
      };
      await redis.hset(key, userId, JSON.stringify(indicator));
      await redis.expire(key, this.TYPING_TTL);
    } else {
      await redis.hdel(key, userId);
    }
  }

  /**
   * Get users currently typing
   */
  async getTypingUsers(roomId: string): Promise<TypingIndicator[]> {
    const redis = getRedisClient();
    const key = `chat:typing:${roomId}`;
    const data = await redis.hgetall(key);

    const now = Date.now();
    const indicators: TypingIndicator[] = [];

    for (const value of Object.values(data)) {
      const indicator: TypingIndicator = JSON.parse(value);
      // Filter out stale indicators
      if (now - indicator.timestamp < this.TYPING_TTL * 1000) {
        indicators.push(indicator);
      }
    }

    return indicators;
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    roomId: string,
    userId: string,
    messageId: string
  ): Promise<void> {
    const redis = getRedisClient();
    const key = `chat:read:${roomId}:${userId}`;

    const receipt: ReadReceipt = {
      userId,
      messageId,
      timestamp: new Date(),
    };

    await redis.set(key, JSON.stringify(receipt));
    await redis.expire(key, this.MESSAGE_TTL);
  }

  /**
   * Get read receipts for a room
   */
  async getReadReceipts(roomId: string): Promise<Map<string, ReadReceipt>> {
    const redis = getRedisClient();
    const pattern = `chat:read:${roomId}:*`;
    const keys = await redis.keys(pattern);

    const receipts = new Map<string, ReadReceipt>();

    if (keys.length > 0) {
      const values = await redis.mget(keys);
      values.forEach((value, index) => {
        if (value) {
          const receipt: ReadReceipt = JSON.parse(value);
          receipts.set(receipt.userId, receipt);
        }
      });
    }

    return receipts;
  }

  /**
   * Get thread summary
   */
  async getThread(roomId: string, threadId: string): Promise<ThreadSummary | null> {
    const redis = getRedisClient();
    const key = `chat:thread:${roomId}:${threadId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get thread messages
   */
  async getThreadMessages(
    roomId: string,
    threadId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const redis = getRedisClient();
    const key = `chat:thread:messages:${roomId}:${threadId}`;
    const messages = await redis.lrange(key, 0, limit - 1);
    return messages.map((m) => JSON.parse(m)).reverse();
  }

  /**
   * Search messages
   */
  async searchMessages(
    roomId: string,
    query: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    // Get all messages from room
    const messages = await this.getMessages(roomId, { limit: 500 });

    // Simple text search
    const queryLower = query.toLowerCase();
    return messages
      .filter((m) => !m.deleted && m.content.toLowerCase().includes(queryLower))
      .slice(0, limit);
  }

  /**
   * Get unread count for user in room
   */
  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const redis = getRedisClient();
    const readReceiptStr = await redis.get(`chat:read:${roomId}:${userId}`);

    if (!readReceiptStr) {
      // User hasn't read any messages, return total count
      const messages = await this.getMessages(roomId, { limit: 500 });
      return messages.filter((m) => m.userId !== userId).length;
    }

    const readReceipt: ReadReceipt = JSON.parse(readReceiptStr);
    const messages = await this.getMessages(roomId, { limit: 500 });

    // Count messages after the last read message
    const lastReadIndex = messages.findIndex((m) => m.id === readReceipt.messageId);
    if (lastReadIndex === -1) {
      return 0;
    }

    return messages
      .slice(lastReadIndex + 1)
      .filter((m) => m.userId !== userId).length;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async updateThread(
    roomId: string,
    threadId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    const redis = getRedisClient();
    const key = `chat:thread:${roomId}:${threadId}`;
    const messagesKey = `chat:thread:messages:${roomId}:${threadId}`;

    // Get or create thread
    let thread = await this.getThread(roomId, threadId);

    if (!thread) {
      thread = {
        threadId,
        parentMessageId: threadId,
        replyCount: 0,
        lastReply: new Date(),
        participants: [],
      };
    }

    // Update thread
    thread.replyCount++;
    thread.lastReply = new Date();
    if (!thread.participants.includes(userId)) {
      thread.participants.push(userId);
    }

    // Save thread summary
    await redis.setex(key, this.MESSAGE_TTL, JSON.stringify(thread));

    // Add message to thread messages
    const message = await this.getMessage(messageId);
    if (message) {
      await redis.lpush(messagesKey, JSON.stringify(message));
      await redis.ltrim(messagesKey, 0, this.MAX_MESSAGES - 1);
      await redis.expire(messagesKey, this.MESSAGE_TTL);
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
