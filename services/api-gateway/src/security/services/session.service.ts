/**
 * Session Service
 * Manages user sessions with Redis
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { AUTH } from '../constants';

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis: Redis;
  private readonly keyPrefix = 'session:';
  
  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_SESSION_DB', 0),
      keyPrefix: this.keyPrefix,
    });
  }
  
  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    tenantId: string,
    ip: string,
    userAgent: string
  ): Promise<Session> {
    const sessionId = randomUUID();
    const now = new Date();
    
    const session: Session = {
      id: sessionId,
      userId,
      tenantId,
      ip,
      userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + AUTH.SESSION.ABSOLUTE_TIMEOUT * 1000),
      deviceInfo: this.parseUserAgent(userAgent),
    };
    
    // Check concurrent sessions limit
    await this.enforceConcurrentSessionLimit(userId);
    
    // Store session
    await this.redis.set(
      sessionId,
      JSON.stringify(session),
      'EX',
      AUTH.SESSION.ABSOLUTE_TIMEOUT
    );
    
    // Add to user's session list
    await this.redis.sadd(`user:${userId}:sessions`, sessionId);
    await this.redis.expire(`user:${userId}:sessions`, AUTH.SESSION.ABSOLUTE_TIMEOUT);
    
    this.logger.debug('Session created', { sessionId, userId });
    
    return session;
  }
  
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(sessionId);
    
    if (!data) {
      return null;
    }
    
    const session = JSON.parse(data) as Session;
    
    // Check for idle timeout
    const lastActivity = new Date(session.lastActivityAt);
    const idleTime = Date.now() - lastActivity.getTime();
    
    if (idleTime > AUTH.SESSION.IDLE_TIMEOUT * 1000) {
      await this.invalidateSession(sessionId);
      return null;
    }
    
    return session;
  }
  
  /**
   * Update session last activity
   */
  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return;
    }
    
    session.lastActivityAt = new Date();
    
    // Calculate remaining TTL
    const remainingTtl = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000
    );
    
    if (remainingTtl > 0) {
      await this.redis.set(
        sessionId,
        JSON.stringify(session),
        'EX',
        remainingTtl
      );
    }
  }
  
  /**
   * Invalidate a session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (session) {
      await this.redis.srem(`user:${session.userId}:sessions`, sessionId);
    }

    await this.redis.del(sessionId);

    this.logger.debug('Session invalidated', { sessionId });
  }

  /**
   * Regenerate session ID to prevent session fixation attacks.
   *
   * SECURITY: This should be called after:
   * - Successful authentication (any method: password, SSO, MFA)
   * - Privilege escalation (e.g., sudo mode, admin access)
   * - MFA verification
   *
   * The old session is completely destroyed (not just expired) and
   * all session data is copied to a new session ID.
   */
  async regenerateSession(oldSessionId: string): Promise<Session | null> {
    // Get existing session data
    const oldSession = await this.getSession(oldSessionId);

    if (!oldSession) {
      this.logger.warn('Attempted to regenerate non-existent session', { oldSessionId });
      return null;
    }

    // Generate new cryptographically random session ID
    const newSessionId = randomUUID();
    const now = new Date();

    // Create new session with copied data but new ID and refreshed timestamps
    const newSession: Session = {
      id: newSessionId,
      userId: oldSession.userId,
      tenantId: oldSession.tenantId,
      ip: oldSession.ip,
      userAgent: oldSession.userAgent,
      createdAt: oldSession.createdAt, // Preserve original creation time
      lastActivityAt: now, // Update activity time
      expiresAt: oldSession.expiresAt, // Keep original expiration
      deviceInfo: oldSession.deviceInfo,
    };

    // Calculate remaining TTL from original session
    const remainingTtl = Math.max(
      1,
      Math.floor((oldSession.expiresAt.getTime() - Date.now()) / 1000)
    );

    // Store new session with remaining TTL
    await this.redis.set(
      newSessionId,
      JSON.stringify(newSession),
      'EX',
      remainingTtl
    );

    // Update user's session list: remove old, add new
    await this.redis.srem(`user:${oldSession.userId}:sessions`, oldSessionId);
    await this.redis.sadd(`user:${oldSession.userId}:sessions`, newSessionId);

    // SECURITY: Immediately delete old session (don't just expire it)
    // This prevents any race conditions where the old session could be used
    await this.redis.del(oldSessionId);

    this.logger.log('Session regenerated for security', {
      oldSessionId,
      newSessionId,
      userId: oldSession.userId,
      reason: 'authentication_event',
    });

    return newSession;
  }

  /**
   * Regenerate session after authentication.
   * This is a convenience method that creates a new session with
   * updated authentication context.
   */
  async regenerateSessionForAuth(
    oldSessionId: string,
    ip: string,
    userAgent: string
  ): Promise<Session | null> {
    const oldSession = await this.getSession(oldSessionId);

    if (!oldSession) {
      return null;
    }

    // Create completely new session (regenerate)
    const newSession = await this.createSession(
      oldSession.userId,
      oldSession.tenantId,
      ip,
      userAgent
    );

    // SECURITY: Delete old session immediately
    await this.redis.srem(`user:${oldSession.userId}:sessions`, oldSessionId);
    await this.redis.del(oldSessionId);

    this.logger.log('Session regenerated after authentication', {
      oldSessionId,
      newSessionId: newSession.id,
      userId: oldSession.userId,
    });

    return newSession;
  }
  
  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    
    for (const sessionId of sessionIds) {
      await this.redis.del(sessionId);
    }
    
    await this.redis.del(`user:${userId}:sessions`);
    
    this.logger.log('All sessions invalidated for user', { userId });
  }
  
  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    const sessions: Session[] = [];
    
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }
  
  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    
    if (sessionIds.length >= AUTH.SESSION.MAX_CONCURRENT) {
      // Get all sessions with their activity times
      const sessions: Session[] = [];
      
      for (const sessionId of sessionIds) {
        const data = await this.redis.get(sessionId);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }
      
      // Sort by last activity (oldest first)
      sessions.sort(
        (a, b) =>
          new Date(a.lastActivityAt).getTime() -
          new Date(b.lastActivityAt).getTime()
      );
      
      // Remove oldest sessions
      const toRemove = sessions.length - AUTH.SESSION.MAX_CONCURRENT + 1;
      for (let i = 0; i < toRemove; i++) {
        await this.invalidateSession(sessions[i].id);
      }
    }
  }
  
  /**
   * Parse user agent string
   */
  private parseUserAgent(userAgent: string): Session['deviceInfo'] {
    // Simple parsing - in production, use a proper UA parser library
    let type = 'unknown';
    let os = 'unknown';
    let browser = 'unknown';
    
    if (/mobile/i.test(userAgent)) {
      type = 'mobile';
    } else if (/tablet/i.test(userAgent)) {
      type = 'tablet';
    } else {
      type = 'desktop';
    }
    
    if (/windows/i.test(userAgent)) {
      os = 'Windows';
    } else if (/mac/i.test(userAgent)) {
      os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
      os = 'Linux';
    } else if (/android/i.test(userAgent)) {
      os = 'Android';
    } else if (/ios|iphone|ipad/i.test(userAgent)) {
      os = 'iOS';
    }
    
    if (/chrome/i.test(userAgent)) {
      browser = 'Chrome';
    } else if (/firefox/i.test(userAgent)) {
      browser = 'Firefox';
    } else if (/safari/i.test(userAgent)) {
      browser = 'Safari';
    } else if (/edge/i.test(userAgent)) {
      browser = 'Edge';
    }
    
    return { type, os, browser };
  }
  
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
