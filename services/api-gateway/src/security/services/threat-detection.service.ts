/**
 * Threat Detection Service
 * Detects and responds to security threats
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  ThreatIndicator,
  ThreatSeverity,
  SecurityEvent,
} from '../types';
import { RATE_LIMITS, AUTH } from '../constants';
import { AuditLogService } from './audit-log.service';

interface ThreatRecord {
  indicators: ThreatIndicator[];
  score: number;
  lastSeen: number;
  blocked: boolean;
}

interface BruteForceAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

@Injectable()
export class ThreatDetectionService implements OnModuleDestroy {
  private readonly logger = new Logger(ThreatDetectionService.name);
  private readonly redis: Redis;
  
  // Threat scoring thresholds
  private readonly WARN_THRESHOLD = 30;
  private readonly BLOCK_THRESHOLD = 70;
  
  // Keys
  private readonly THREAT_PREFIX = 'threat:';
  private readonly BRUTE_FORCE_PREFIX = 'bruteforce:';
  private readonly BLOCKED_IP_PREFIX = 'blocked:ip:';
  private readonly BLOCKED_USER_PREFIX = 'blocked:user:';
  private readonly SUSPICIOUS_PATTERN_PREFIX = 'suspicious:';
  
  // TTLs
  private readonly THREAT_TTL = 3600; // 1 hour
  private readonly BLOCK_TTL = 86400; // 24 hours
  private readonly BRUTE_FORCE_TTL = 900; // 15 minutes
  
  constructor(
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      keyPrefix: 'security:threats:',
      maxRetriesPerRequest: 3,
    });
  }
  
  async onModuleDestroy() {
    await this.redis.quit();
  }
  
  /**
   * Analyze request for threats
   */
  async analyzeRequest(context: {
    ip: string;
    userId?: string;
    userAgent?: string;
    path: string;
    method: string;
    body?: any;
    headers?: Record<string, string>;
  }): Promise<{ allowed: boolean; threats: ThreatIndicator[]; score: number }> {
    const threats: ThreatIndicator[] = [];
    let score = 0;
    
    // Check if IP is blocked
    if (await this.isIPBlocked(context.ip)) {
      threats.push({
        type: 'blocked_ip',
        severity: 'critical',
        score: 100,
        description: 'IP address is blocked',
      });
      return { allowed: false, threats, score: 100 };
    }
    
    // Check if user is blocked
    if (context.userId && await this.isUserBlocked(context.userId)) {
      threats.push({
        type: 'blocked_user',
        severity: 'critical',
        score: 100,
        description: 'User account is blocked',
      });
      return { allowed: false, threats, score: 100 };
    }
    
    // Check for brute force attacks
    const bruteForceIndicator = await this.checkBruteForce(context.ip, context.path);
    if (bruteForceIndicator) {
      threats.push(bruteForceIndicator);
      score += bruteForceIndicator.score;
    }
    
    // Check for suspicious patterns
    const patternIndicators = await this.checkSuspiciousPatterns(context);
    threats.push(...patternIndicators);
    score += patternIndicators.reduce((sum, t) => sum + t.score, 0);
    
    // Check for SQL injection attempts
    if (context.body) {
      const sqlIndicators = this.checkSQLInjection(JSON.stringify(context.body));
      threats.push(...sqlIndicators);
      score += sqlIndicators.reduce((sum, t) => sum + t.score, 0);
    }
    
    // Check for XSS attempts
    if (context.body) {
      const xssIndicators = this.checkXSS(JSON.stringify(context.body));
      threats.push(...xssIndicators);
      score += xssIndicators.reduce((sum, t) => sum + t.score, 0);
    }
    
    // Check user agent anomalies
    if (context.userAgent) {
      const uaIndicators = this.checkUserAgent(context.userAgent);
      threats.push(...uaIndicators);
      score += uaIndicators.reduce((sum, t) => sum + t.score, 0);
    }
    
    // Record threats if any
    if (threats.length > 0) {
      await this.recordThreats(context.ip, context.userId, threats, score);
    }
    
    // Block if score exceeds threshold
    const allowed = score < this.BLOCK_THRESHOLD;
    
    if (!allowed) {
      await this.blockIP(context.ip, 'Threat score exceeded threshold');
      await this.logSecurityEvent({
        type: 'threat_blocked',
        ip: context.ip,
        userId: context.userId,
        threats,
        score,
      });
    } else if (score >= this.WARN_THRESHOLD) {
      await this.logSecurityEvent({
        type: 'threat_warning',
        ip: context.ip,
        userId: context.userId,
        threats,
        score,
      });
    }
    
    return { allowed, threats, score };
  }
  
  /**
   * Record failed login attempt
   */
  async recordFailedLogin(ip: string, userId?: string): Promise<void> {
    const key = `${this.BRUTE_FORCE_PREFIX}${ip}`;
    
    const multi = this.redis.multi();
    multi.hincrby(key, 'count', 1);
    multi.hsetnx(key, 'firstAttempt', Date.now().toString());
    multi.hset(key, 'lastAttempt', Date.now().toString());
    multi.expire(key, this.BRUTE_FORCE_TTL);
    await multi.exec();
    
    // Check if we should block
    const count = await this.redis.hget(key, 'count');
    if (parseInt(count || '0') >= AUTH.LOCKOUT.MAX_ATTEMPTS) {
      await this.blockIP(ip, 'Brute force attack detected');
      
      if (userId) {
        await this.lockoutUser(userId);
      }
    }
  }
  
  /**
   * Check for brute force attacks
   */
  private async checkBruteForce(ip: string, path: string): Promise<ThreatIndicator | null> {
    const key = `${this.BRUTE_FORCE_PREFIX}${ip}`;
    const data = await this.redis.hgetall(key);
    
    if (!data.count) {
      return null;
    }
    
    const count = parseInt(data.count);
    const firstAttempt = parseInt(data.firstAttempt);
    const duration = (Date.now() - firstAttempt) / 1000;
    
    // Calculate attempts per minute
    const rate = (count / duration) * 60;
    
    if (count >= 10 || rate > 20) {
      return {
        type: 'brute_force',
        severity: 'high',
        score: Math.min(50, count * 5),
        description: `High rate of failed attempts: ${count} attempts, ${rate.toFixed(1)}/min`,
        metadata: { count, rate },
      };
    }
    
    if (count >= 5) {
      return {
        type: 'brute_force_warning',
        severity: 'medium',
        score: count * 3,
        description: `Elevated failed attempts: ${count} attempts`,
        metadata: { count },
      };
    }
    
    return null;
  }
  
  /**
   * Check for suspicious patterns
   */
  private async checkSuspiciousPatterns(context: {
    ip: string;
    path: string;
    method: string;
    headers?: Record<string, string>;
  }): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];
    
    // Check for path traversal
    if (context.path.includes('..') || context.path.includes('%2e%2e')) {
      indicators.push({
        type: 'path_traversal',
        severity: 'high',
        score: 40,
        description: 'Path traversal attempt detected',
      });
    }
    
    // Check for sensitive file access
    const sensitivePatterns = [
      '.env', '.git', '.htaccess', 'wp-admin', 'wp-config',
      'phpinfo', 'passwd', 'shadow', '.ssh',
    ];
    
    if (sensitivePatterns.some(p => context.path.toLowerCase().includes(p))) {
      indicators.push({
        type: 'sensitive_file_access',
        severity: 'high',
        score: 35,
        description: 'Attempt to access sensitive files',
      });
    }
    
    // Check for scanner patterns
    const scannerPatterns = [
      '/admin', '/phpmyadmin', '/mysql', '/backup',
      '/config', '/test', '/debug', '/.well-known',
    ];
    
    if (scannerPatterns.some(p => context.path.toLowerCase().startsWith(p))) {
      // Increment scanner counter
      const scanKey = `${this.SUSPICIOUS_PATTERN_PREFIX}scan:${context.ip}`;
      const scanCount = await this.redis.incr(scanKey);
      await this.redis.expire(scanKey, 300);
      
      if (scanCount >= 5) {
        indicators.push({
          type: 'scanning',
          severity: 'medium',
          score: 25,
          description: `Possible vulnerability scanning: ${scanCount} suspicious paths accessed`,
        });
      }
    }
    
    return indicators;
  }
  
  /**
   * Check for SQL injection attempts
   */
  private checkSQLInjection(content: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|table|database)\b)/gi,
      /(\b(or|and)\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi,
      /(;\s*(drop|delete|truncate|update|insert)\b)/gi,
      /('|\");\s*--/gi,
      /\b(xp_|sp_|0x[0-9a-f]+)\b/gi,
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(content)) {
        indicators.push({
          type: 'sql_injection',
          severity: 'critical',
          score: 60,
          description: 'SQL injection pattern detected',
        });
        break;
      }
    }
    
    return indicators;
  }
  
  /**
   * Check for XSS attempts
   */
  private checkXSS(content: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    
    const xssPatterns = [
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      /<\s*img[^>]+onerror\s*=/gi,
      /javascript:/gi,
      /on(load|error|click|mouse|focus|blur)\s*=/gi,
      /<\s*(iframe|object|embed|applet)/gi,
      /expression\s*\(/gi,
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(content)) {
        indicators.push({
          type: 'xss',
          severity: 'high',
          score: 50,
          description: 'XSS pattern detected',
        });
        break;
      }
    }
    
    return indicators;
  }
  
  /**
   * Check user agent for anomalies
   */
  private checkUserAgent(userAgent: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    
    // Empty or missing user agent
    if (!userAgent || userAgent.length < 10) {
      indicators.push({
        type: 'suspicious_user_agent',
        severity: 'low',
        score: 10,
        description: 'Missing or minimal user agent',
      });
    }
    
    // Known malicious patterns
    const maliciousPatterns = [
      /nikto/i, /sqlmap/i, /nmap/i, /masscan/i,
      /havij/i, /acunetix/i, /burp/i, /nessus/i,
      /w3af/i, /wpscan/i, /nuclei/i,
    ];
    
    if (maliciousPatterns.some(p => p.test(userAgent))) {
      indicators.push({
        type: 'malicious_tool',
        severity: 'high',
        score: 45,
        description: 'Known malicious tool detected in user agent',
      });
    }
    
    return indicators;
  }
  
  /**
   * Record threats for an IP/user
   */
  private async recordThreats(
    ip: string,
    userId: string | undefined,
    threats: ThreatIndicator[],
    score: number,
  ): Promise<void> {
    const key = `${this.THREAT_PREFIX}${ip}`;
    
    const record: ThreatRecord = {
      indicators: threats,
      score,
      lastSeen: Date.now(),
      blocked: score >= this.BLOCK_THRESHOLD,
    };
    
    await this.redis.setex(key, this.THREAT_TTL, JSON.stringify(record));
  }
  
  /**
   * Block an IP address
   */
  async blockIP(ip: string, reason: string): Promise<void> {
    const key = `${this.BLOCKED_IP_PREFIX}${ip}`;
    await this.redis.setex(key, this.BLOCK_TTL, JSON.stringify({
      blockedAt: Date.now(),
      reason,
    }));
    
    this.logger.warn(`Blocked IP: ${ip}, reason: ${reason}`);
  }
  
  /**
   * Unblock an IP address
   */
  async unblockIP(ip: string): Promise<void> {
    const key = `${this.BLOCKED_IP_PREFIX}${ip}`;
    await this.redis.del(key);
    
    this.logger.log(`Unblocked IP: ${ip}`);
  }
  
  /**
   * Check if IP is blocked
   */
  async isIPBlocked(ip: string): Promise<boolean> {
    const key = `${this.BLOCKED_IP_PREFIX}${ip}`;
    const result = await this.redis.exists(key);
    return result === 1;
  }
  
  /**
   * Lock out a user account
   */
  async lockoutUser(userId: string): Promise<void> {
    const key = `${this.BLOCKED_USER_PREFIX}${userId}`;
    await this.redis.setex(key, AUTH.LOCKOUT.DURATION_SECONDS, JSON.stringify({
      lockedAt: Date.now(),
      reason: 'Too many failed login attempts',
    }));
    
    this.logger.warn(`Locked out user: ${userId}`);
  }
  
  /**
   * Check if user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    const key = `${this.BLOCKED_USER_PREFIX}${userId}`;
    const result = await this.redis.exists(key);
    return result === 1;
  }
  
  /**
   * Clear user lockout
   */
  async clearUserLockout(userId: string): Promise<void> {
    const key = `${this.BLOCKED_USER_PREFIX}${userId}`;
    await this.redis.del(key);
  }
  
  /**
   * Log security event to audit service
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.auditLog.log({
      action: event.type,
      actor: event.userId ? { userId: event.userId, type: 'user' } : { type: 'system' },
      resource: { type: 'security', id: event.ip },
      context: {
        ip: event.ip,
        threats: event.threats,
        score: event.score,
      },
      severity: event.score >= this.BLOCK_THRESHOLD ? 'critical' : 'warning',
    });
  }
  
  /**
   * Get threat statistics for an IP
   */
  async getThreatStats(ip: string): Promise<ThreatRecord | null> {
    const key = `${this.THREAT_PREFIX}${ip}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}
