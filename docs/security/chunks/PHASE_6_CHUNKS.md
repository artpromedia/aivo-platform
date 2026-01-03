# Phase 6: Threat Detection & Monitoring - Detailed Chunks

## Chunk 6.1: Threat Detection Service - Core

**Time Estimate:** 6-8 hours  
**Priority:** P1 - High  
**Dependencies:** Phase 3

### Files to Create

#### 1. `services/api-gateway/src/security/services/threat-detection.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { AuditLogService } from './audit-log.service';
import { logger, metrics } from '@aivo/ts-observability';

export interface ThreatIndicator {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  indicators: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type ThreatType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'account_takeover'
  | 'suspicious_location'
  | 'impossible_travel'
  | 'abnormal_behavior'
  | 'sql_injection'
  | 'xss_attempt'
  | 'path_traversal'
  | 'rate_limit_abuse'
  | 'bot_activity'
  | 'data_exfiltration';

export interface UserRiskProfile {
  userId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
  indicators: ThreatIndicator[];
  actions: RiskMitigationAction[];
}

export type RiskMitigationAction =
  | 'none'
  | 'require_mfa'
  | 'require_captcha'
  | 'temporary_block'
  | 'permanent_block'
  | 'notify_user'
  | 'notify_admin';

@Injectable()
export class ThreatDetectionService implements OnModuleInit {
  private readonly RISK_WINDOW = 3600; // 1 hour in seconds
  private readonly BLOCK_DURATION = 900; // 15 minutes
  private readonly thresholds: Map<ThreatType, number>;

  constructor(
    private config: ConfigService,
    @InjectRedis() private redis: Redis,
    private auditLog: AuditLogService,
  ) {
    this.thresholds = this.initializeThresholds();
  }

  async onModuleInit() {
    logger.info('Threat detection service initialized');
  }

  /**
   * Analyze request for potential threats
   */
  async analyzeRequest(context: {
    userId?: string;
    ip: string;
    userAgent?: string;
    path: string;
    method: string;
    body?: any;
    headers?: Record<string, string>;
  }): Promise<{ blocked: boolean; threats: ThreatIndicator[] }> {
    const threats: ThreatIndicator[] = [];

    // Run detection checks in parallel
    const [
      bruteForce,
      rateLimitAbuse,
      injectionAttempt,
      botActivity,
      suspiciousLocation,
    ] = await Promise.all([
      this.detectBruteForce(context.ip, context.userId),
      this.detectRateLimitAbuse(context.ip),
      this.detectInjectionAttempt(context.path, context.body),
      this.detectBotActivity(context.userAgent, context.ip),
      context.userId ? this.detectSuspiciousLocation(context.userId, context.ip) : null,
    ]);

    if (bruteForce) threats.push(bruteForce);
    if (rateLimitAbuse) threats.push(rateLimitAbuse);
    if (injectionAttempt) threats.push(injectionAttempt);
    if (botActivity) threats.push(botActivity);
    if (suspiciousLocation) threats.push(suspiciousLocation);

    // Calculate overall risk
    const totalScore = threats.reduce((sum, t) => sum + t.score, 0);
    const blocked = totalScore >= 0.8 || threats.some(t => t.severity === 'critical');

    // Track metrics
    metrics.increment('security.threats_detected', { count: threats.length.toString() });

    // Log if threats detected
    if (threats.length > 0) {
      await this.handleThreatsDetected(context, threats, blocked);
    }

    return { blocked, threats };
  }

  /**
   * Get user's risk profile
   */
  async getUserRiskProfile(userId: string): Promise<UserRiskProfile> {
    const key = `risk:user:${userId}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate risk from recent events
    const indicators = await this.getRecentThreatIndicators(userId);
    const riskScore = this.calculateRiskScore(indicators);
    const riskLevel = this.getRiskLevel(riskScore);
    const actions = this.determineActions(riskLevel, indicators);

    const profile: UserRiskProfile = {
      userId,
      riskScore,
      riskLevel,
      lastUpdated: new Date(),
      indicators,
      actions,
    };

    // Cache for 5 minutes
    await this.redis.setex(key, 300, JSON.stringify(profile));

    return profile;
  }

  /**
   * Check if IP is blocked
   */
  async isBlocked(ip: string): Promise<boolean> {
    const blocked = await this.redis.get(`blocked:ip:${ip}`);
    return blocked === '1';
  }

  /**
   * Block an IP address
   */
  async blockIP(ip: string, reason: string, duration?: number): Promise<void> {
    const ttl = duration || this.BLOCK_DURATION;
    await this.redis.setex(`blocked:ip:${ip}`, ttl, '1');
    
    await this.auditLog.logSecurityEvent('threat_detected', 
      { id: ip, type: 'anonymous', ip },
      {
        threatType: 'ip_blocked',
        indicators: [reason],
        blocked: true,
        metadata: { duration: ttl },
      }
    );

    logger.warn('IP blocked', { ip, reason, duration: ttl });
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ip: string): Promise<void> {
    await this.redis.del(`blocked:ip:${ip}`);
    logger.info('IP unblocked', { ip });
  }

  // ============================================================================
  // DETECTION METHODS
  // ============================================================================

  private async detectBruteForce(ip: string, userId?: string): Promise<ThreatIndicator | null> {
    const key = `auth:failed:${ip}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, this.RISK_WINDOW);

    if (count >= 5) {
      return {
        type: 'brute_force',
        severity: count >= 10 ? 'critical' : 'high',
        score: Math.min(1, count / 10),
        indicators: [`${count} failed login attempts from IP`],
        timestamp: new Date(),
      };
    }

    return null;
  }

  private async detectRateLimitAbuse(ip: string): Promise<ThreatIndicator | null> {
    const key = `ratelimit:violations:${ip}`;
    const violations = await this.redis.get(key);
    const count = parseInt(violations || '0');

    if (count >= 3) {
      return {
        type: 'rate_limit_abuse',
        severity: 'medium',
        score: Math.min(1, count / 5),
        indicators: [`${count} rate limit violations`],
        timestamp: new Date(),
      };
    }

    return null;
  }

  private async detectInjectionAttempt(path: string, body?: any): Promise<ThreatIndicator | null> {
    const patterns = {
      sql: /('|"|\-\-|;|\||\*|\/\*|\*\/|xp_|sp_|@@|char\(|nchar\(|varchar\(|nvarchar\(|alter\s|begin\s|cast\(|create\s|cursor\s|declare\s|delete\s|drop\s|end\s|exec\s|execute\s|fetch\s|insert\s|kill\s|open\s|select\s|sys\.|sysobjects|syscolumns|table\s|update\s|union\s)/i,
      xss: /(<script|javascript:|on\w+\s*=|<img|<svg|<iframe|<object|<embed|<form|<input|<button|expression\(|url\(|@import)/i,
      pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c)/i,
    };

    const textToCheck = path + (body ? JSON.stringify(body) : '');
    const indicators: string[] = [];

    if (patterns.sql.test(textToCheck)) {
      indicators.push('SQL injection pattern detected');
    }
    if (patterns.xss.test(textToCheck)) {
      indicators.push('XSS pattern detected');
    }
    if (patterns.pathTraversal.test(textToCheck)) {
      indicators.push('Path traversal attempt detected');
    }

    if (indicators.length > 0) {
      return {
        type: indicators[0].includes('SQL') ? 'sql_injection' : 
              indicators[0].includes('XSS') ? 'xss_attempt' : 'path_traversal',
        severity: 'critical',
        score: 1.0,
        indicators,
        timestamp: new Date(),
      };
    }

    return null;
  }

  private async detectBotActivity(userAgent?: string, ip?: string): Promise<ThreatIndicator | null> {
    if (!userAgent) {
      return {
        type: 'bot_activity',
        severity: 'medium',
        score: 0.5,
        indicators: ['Missing user agent'],
        timestamp: new Date(),
      };
    }

    const botPatterns = [
      /bot|crawler|spider|scraper|curl|wget|python|java|ruby|perl|php|httpclient/i,
      /headless|phantom|selenium|puppeteer|playwright/i,
    ];

    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        return {
          type: 'bot_activity',
          severity: 'low',
          score: 0.3,
          indicators: [`Bot-like user agent: ${userAgent.substring(0, 50)}`],
          timestamp: new Date(),
        };
      }
    }

    return null;
  }

  private async detectSuspiciousLocation(userId: string, ip: string): Promise<ThreatIndicator | null> {
    // Get user's known IPs
    const key = `user:ips:${userId}`;
    const knownIPs = await this.redis.smembers(key);

    if (knownIPs.length === 0) {
      // First time, store IP
      await this.redis.sadd(key, ip);
      await this.redis.expire(key, 30 * 24 * 3600); // 30 days
      return null;
    }

    if (!knownIPs.includes(ip)) {
      // New IP detected
      await this.redis.sadd(key, ip);
      
      // Check for impossible travel
      const lastAccess = await this.redis.get(`user:lastaccess:${userId}`);
      if (lastAccess) {
        const { ip: lastIP, time } = JSON.parse(lastAccess);
        const timeDiff = (Date.now() - new Date(time).getTime()) / 1000 / 60; // minutes
        
        // If accessed from different IP within 5 minutes, suspicious
        if (timeDiff < 5 && lastIP !== ip) {
          return {
            type: 'impossible_travel',
            severity: 'high',
            score: 0.7,
            indicators: [`Access from ${ip} within ${Math.round(timeDiff)} minutes of ${lastIP}`],
            timestamp: new Date(),
          };
        }
      }

      // Store current access
      await this.redis.setex(
        `user:lastaccess:${userId}`,
        3600,
        JSON.stringify({ ip, time: new Date() })
      );

      return {
        type: 'suspicious_location',
        severity: 'medium',
        score: 0.4,
        indicators: [`New IP address: ${ip}`],
        timestamp: new Date(),
      };
    }

    return null;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private initializeThresholds(): Map<ThreatType, number> {
    return new Map([
      ['brute_force', 0.7],
      ['credential_stuffing', 0.8],
      ['account_takeover', 0.9],
      ['sql_injection', 0.95],
      ['xss_attempt', 0.95],
      ['path_traversal', 0.9],
      ['rate_limit_abuse', 0.5],
      ['bot_activity', 0.3],
      ['suspicious_location', 0.5],
      ['impossible_travel', 0.8],
      ['data_exfiltration', 0.9],
    ]);
  }

  private async getRecentThreatIndicators(userId: string): Promise<ThreatIndicator[]> {
    const key = `threats:user:${userId}`;
    const threats = await this.redis.lrange(key, 0, -1);
    return threats.map(t => JSON.parse(t));
  }

  private calculateRiskScore(indicators: ThreatIndicator[]): number {
    if (indicators.length === 0) return 0;
    
    const weightedSum = indicators.reduce((sum, i) => {
      const weight = {
        low: 0.2,
        medium: 0.4,
        high: 0.7,
        critical: 1.0,
      }[i.severity];
      return sum + i.score * weight;
    }, 0);

    return Math.min(1, weightedSum / indicators.length);
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private determineActions(
    riskLevel: string,
    indicators: ThreatIndicator[]
  ): RiskMitigationAction[] {
    const actions: RiskMitigationAction[] = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('temporary_block', 'notify_admin', 'notify_user');
        break;
      case 'high':
        actions.push('require_mfa', 'notify_admin');
        break;
      case 'medium':
        actions.push('require_captcha');
        break;
      default:
        actions.push('none');
    }

    return actions;
  }

  private async handleThreatsDetected(
    context: any,
    threats: ThreatIndicator[],
    blocked: boolean
  ): Promise<void> {
    // Store threats for user if authenticated
    if (context.userId) {
      const key = `threats:user:${context.userId}`;
      for (const threat of threats) {
        await this.redis.lpush(key, JSON.stringify(threat));
      }
      await this.redis.ltrim(key, 0, 99); // Keep last 100
      await this.redis.expire(key, 24 * 3600); // 24 hours
    }

    // Log security event
    await this.auditLog.logSecurityEvent('threat_detected',
      { id: context.userId || context.ip, type: context.userId ? 'user' : 'anonymous', ip: context.ip },
      {
        threatType: threats.map(t => t.type).join(', '),
        indicators: threats.flatMap(t => t.indicators),
        riskScore: threats.reduce((sum, t) => sum + t.score, 0) / threats.length,
        blocked,
      }
    );

    // Block IP if critical threat
    if (blocked) {
      await this.blockIP(context.ip, threats.map(t => t.type).join(', '));
    }
  }
}
```

### Acceptance Criteria
- [ ] Brute force detection
- [ ] Rate limit abuse detection
- [ ] Injection attempt detection (SQL, XSS, Path Traversal)
- [ ] Bot activity detection
- [ ] Suspicious location detection
- [ ] Impossible travel detection
- [ ] User risk profiling
- [ ] IP blocking/unblocking
- [ ] Risk scoring and levels
- [ ] Mitigation action recommendations

---

## Chunk 6.2: Threat Detection - Rules Engine

**Time Estimate:** 4-6 hours  
**Priority:** P1 - High  
**Dependencies:** Chunk 6.1

### Files to Create

#### 1. `services/api-gateway/src/security/services/rules-engine.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { logger } from '@aivo/ts-observability';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  cooldown?: number; // Seconds between triggers
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches' | 'in';
  value: any;
}

export interface RuleAction {
  type: 'block' | 'alert' | 'log' | 'require_mfa' | 'rate_limit' | 'captcha';
  params?: Record<string, any>;
}

export interface RuleContext {
  request: {
    ip: string;
    path: string;
    method: string;
    userAgent?: string;
    headers?: Record<string, string>;
    body?: any;
  };
  user?: {
    id: string;
    roles: string[];
    tenantId: string;
  };
  session?: {
    id: string;
    createdAt: Date;
    failedAttempts: number;
  };
  history?: {
    recentRequests: number;
    failedLogins: number;
    blockedAttempts: number;
  };
}

@Injectable()
export class RulesEngineService {
  private rules: SecurityRule[] = [];

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Evaluate all rules against context
   */
  evaluate(context: RuleContext): { 
    triggered: SecurityRule[]; 
    actions: RuleAction[];
    blocked: boolean;
  } {
    const triggered: SecurityRule[] = [];
    const actions: RuleAction[] = [];
    let blocked = false;

    const sortedRules = [...this.rules]
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, context)) {
        triggered.push(rule);
        actions.push(...rule.actions);
        
        if (rule.actions.some(a => a.type === 'block')) {
          blocked = true;
        }
      }
    }

    return { triggered, actions, blocked };
  }

  /**
   * Add a custom rule
   */
  addRule(rule: SecurityRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
    logger.info('Security rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  private evaluateRule(rule: SecurityRule, context: RuleContext): boolean {
    return rule.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    const value = this.getFieldValue(condition.field, context);
    
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lte':
        return value <= condition.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'matches':
        return new RegExp(condition.value, 'i').test(String(value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: RuleContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  private loadDefaultRules(): void {
    this.rules = [
      // Brute force protection
      {
        id: 'brute-force-block',
        name: 'Block after 10 failed logins',
        description: 'Blocks IP after 10 failed login attempts',
        enabled: true,
        priority: 1,
        conditions: [
          { field: 'history.failedLogins', operator: 'gte', value: 10 },
        ],
        actions: [
          { type: 'block', params: { duration: 900 } },
          { type: 'alert', params: { level: 'high' } },
        ],
      },

      // Rate limit abuse
      {
        id: 'rate-limit-escalation',
        name: 'Escalate rate limiting',
        description: 'Applies stricter rate limits after violations',
        enabled: true,
        priority: 2,
        conditions: [
          { field: 'history.blockedAttempts', operator: 'gte', value: 3 },
        ],
        actions: [
          { type: 'rate_limit', params: { factor: 0.5 } },
          { type: 'log' },
        ],
      },

      // Suspicious user agent
      {
        id: 'block-scanners',
        name: 'Block security scanners',
        description: 'Blocks known security scanning tools',
        enabled: true,
        priority: 3,
        conditions: [
          { field: 'request.userAgent', operator: 'matches', value: 'sqlmap|nikto|nessus|burp|owasp|acunetix' },
        ],
        actions: [
          { type: 'block' },
          { type: 'alert', params: { level: 'critical' } },
        ],
      },

      // Admin access protection
      {
        id: 'admin-mfa-required',
        name: 'Require MFA for admin',
        description: 'Requires MFA for admin endpoints',
        enabled: true,
        priority: 4,
        conditions: [
          { field: 'request.path', operator: 'matches', value: '^/api/admin' },
          { field: 'user.roles', operator: 'contains', value: 'admin' },
        ],
        actions: [
          { type: 'require_mfa' },
        ],
      },

      // Data export protection
      {
        id: 'bulk-export-alert',
        name: 'Alert on bulk exports',
        description: 'Alerts when bulk data export is performed',
        enabled: true,
        priority: 5,
        conditions: [
          { field: 'request.path', operator: 'matches', value: '/export|/download|/bulk' },
          { field: 'history.recentRequests', operator: 'gte', value: 50 },
        ],
        actions: [
          { type: 'alert', params: { level: 'medium' } },
          { type: 'log' },
        ],
      },
    ];
  }
}
```

### Acceptance Criteria
- [ ] Flexible rule condition system
- [ ] Multiple action types
- [ ] Rule priority ordering
- [ ] Enable/disable rules
- [ ] Default security rules
- [ ] Custom rule support
- [ ] Context-aware evaluation

---

## Chunk 6.3: Security Event Correlation

**Time Estimate:** 6-8 hours  
**Priority:** P1 - High  
**Dependencies:** Chunk 6.1

### Files to Create

#### 1. `services/api-gateway/src/security/services/event-correlation.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { AuditLogService } from './audit-log.service';
import { logger } from '@aivo/ts-observability';

export interface SecurityEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  actor: string;
  ip: string;
  details: Record<string, any>;
}

export interface AttackPattern {
  id: string;
  name: string;
  description: string;
  events: string[]; // Event types in sequence
  timeWindow: number; // Seconds
  threshold: number; // Minimum occurrences
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CorrelatedIncident {
  id: string;
  pattern: AttackPattern;
  events: SecurityEvent[];
  firstSeen: Date;
  lastSeen: Date;
  actor: string;
  ip: string;
  status: 'active' | 'mitigated' | 'resolved';
}

@Injectable()
export class EventCorrelationService implements OnModuleInit {
  private patterns: AttackPattern[] = [];
  private eventBuffer: Map<string, SecurityEvent[]> = new Map();

  constructor(
    @InjectRedis() private redis: Redis,
    private auditLog: AuditLogService,
  ) {
    this.loadPatterns();
  }

  async onModuleInit() {
    // Start background correlation
    setInterval(() => this.runCorrelation(), 10000); // Every 10 seconds
  }

  /**
   * Ingest a security event
   */
  async ingestEvent(event: SecurityEvent): Promise<void> {
    const key = `${event.actor}:${event.ip}`;
    
    if (!this.eventBuffer.has(key)) {
      this.eventBuffer.set(key, []);
    }
    
    this.eventBuffer.get(key)!.push(event);

    // Also store in Redis for distributed correlation
    await this.redis.lpush(`events:${key}`, JSON.stringify(event));
    await this.redis.ltrim(`events:${key}`, 0, 999); // Keep last 1000
    await this.redis.expire(`events:${key}`, 3600); // 1 hour TTL
  }

  /**
   * Check for attack patterns
   */
  async correlate(events: SecurityEvent[]): Promise<CorrelatedIncident[]> {
    const incidents: CorrelatedIncident[] = [];

    for (const pattern of this.patterns) {
      const matched = this.matchPattern(events, pattern);
      if (matched) {
        const incident: CorrelatedIncident = {
          id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern,
          events: matched,
          firstSeen: matched[0].timestamp,
          lastSeen: matched[matched.length - 1].timestamp,
          actor: matched[0].actor,
          ip: matched[0].ip,
          status: 'active',
        };

        incidents.push(incident);
        await this.handleIncident(incident);
      }
    }

    return incidents;
  }

  /**
   * Run correlation on buffered events
   */
  private async runCorrelation(): Promise<void> {
    for (const [key, events] of this.eventBuffer) {
      if (events.length >= 3) { // Minimum events for correlation
        const incidents = await this.correlate(events);
        
        if (incidents.length > 0) {
          logger.info('Security incidents detected', {
            key,
            incidents: incidents.map(i => i.pattern.name),
          });
        }
      }

      // Clean old events (> 5 minutes)
      const cutoff = Date.now() - 300000;
      this.eventBuffer.set(
        key,
        events.filter(e => e.timestamp.getTime() > cutoff)
      );
    }
  }

  private matchPattern(events: SecurityEvent[], pattern: AttackPattern): SecurityEvent[] | null {
    const window = pattern.timeWindow * 1000;
    const patternEvents = pattern.events;
    const matched: SecurityEvent[] = [];

    // Find events matching the pattern in sequence
    let patternIndex = 0;
    let windowStart: number | null = null;

    for (const event of events) {
      if (event.type === patternEvents[patternIndex]) {
        if (windowStart === null) {
          windowStart = event.timestamp.getTime();
        }

        if (event.timestamp.getTime() - windowStart <= window) {
          matched.push(event);
          patternIndex++;

          if (patternIndex >= patternEvents.length) {
            // Full pattern matched
            if (matched.length >= pattern.threshold) {
              return matched;
            }
            // Reset and continue looking for more occurrences
            patternIndex = 0;
            windowStart = null;
          }
        } else {
          // Window expired, reset
          patternIndex = 0;
          windowStart = null;
          matched.length = 0;
        }
      }
    }

    return null;
  }

  private async handleIncident(incident: CorrelatedIncident): Promise<void> {
    // Store incident
    await this.redis.hset(
      'incidents',
      incident.id,
      JSON.stringify(incident)
    );

    // Log to audit
    await this.auditLog.logSecurityEvent('threat_detected', 
      { id: incident.actor, type: 'user', ip: incident.ip },
      {
        threatType: incident.pattern.name,
        indicators: incident.events.map(e => e.type),
        riskScore: this.getSeverityScore(incident.pattern.severity),
        blocked: incident.pattern.severity === 'critical',
      }
    );

    // Take action based on severity
    switch (incident.pattern.severity) {
      case 'critical':
        await this.blockActor(incident);
        await this.sendAlert(incident, 'critical');
        break;
      case 'high':
        await this.sendAlert(incident, 'high');
        break;
      case 'medium':
        await this.sendAlert(incident, 'medium');
        break;
    }
  }

  private getSeverityScore(severity: string): number {
    return { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 }[severity] || 0.5;
  }

  private async blockActor(incident: CorrelatedIncident): Promise<void> {
    await this.redis.setex(`blocked:ip:${incident.ip}`, 3600, '1');
    logger.warn('Actor blocked due to incident', {
      incidentId: incident.id,
      ip: incident.ip,
      pattern: incident.pattern.name,
    });
  }

  private async sendAlert(incident: CorrelatedIncident, level: string): Promise<void> {
    // Integration with alerting system
    logger.warn('Security alert', {
      level,
      incidentId: incident.id,
      pattern: incident.pattern.name,
      actor: incident.actor,
      ip: incident.ip,
    });
  }

  private loadPatterns(): void {
    this.patterns = [
      {
        id: 'credential-stuffing',
        name: 'Credential Stuffing Attack',
        description: 'Multiple failed logins with different usernames from same IP',
        events: ['auth.failed', 'auth.failed', 'auth.failed', 'auth.failed', 'auth.failed'],
        timeWindow: 60, // 1 minute
        threshold: 5,
        severity: 'critical',
      },
      {
        id: 'account-enumeration',
        name: 'Account Enumeration',
        description: 'Probing for valid usernames',
        events: ['auth.user_not_found', 'auth.user_not_found', 'auth.user_not_found'],
        timeWindow: 120,
        threshold: 3,
        severity: 'high',
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Attempt',
        description: 'Accessing admin resources after denied',
        events: ['authz.denied', 'authz.denied', 'admin.access'],
        timeWindow: 300,
        threshold: 1,
        severity: 'critical',
      },
      {
        id: 'data-exfiltration',
        name: 'Potential Data Exfiltration',
        description: 'Bulk data access followed by export',
        events: ['data.bulk_read', 'data.export'],
        timeWindow: 600,
        threshold: 1,
        severity: 'high',
      },
    ];
  }
}
```

### Acceptance Criteria
- [ ] Event ingestion and buffering
- [ ] Pattern-based correlation
- [ ] Time window support
- [ ] Attack pattern detection
- [ ] Incident creation and tracking
- [ ] Automatic blocking for critical incidents
- [ ] Alert generation

---

## Chunk 6.4 & 6.5: Security Metrics & Alerting

**Time Estimate:** 8-10 hours combined  
**Priority:** P1 - High  
**Dependencies:** Chunk 6.1

### Summary of Files

1. **`services/api-gateway/src/security/services/security-metrics.service.ts`**
   - Prometheus metrics for security events
   - Dashboard data aggregation
   - Trend analysis
   - KPI tracking

2. **`services/api-gateway/src/security/services/security-alerting.service.ts`**
   - Alert thresholds
   - Multi-channel notifications (Slack, PagerDuty, email)
   - Alert deduplication
   - Escalation policies

3. **`infrastructure/grafana/dashboards/security-dashboard.json`**
   - Security metrics visualization
   - Threat detection panels
   - Compliance status
   - Incident timeline

### Key Metrics to Track

```typescript
// Security Metrics
const metrics = {
  // Authentication
  'auth.login_attempts': Counter,
  'auth.login_failures': Counter,
  'auth.mfa_challenges': Counter,
  'auth.session_created': Counter,
  
  // Authorization
  'authz.access_granted': Counter,
  'authz.access_denied': Counter,
  
  // Threats
  'security.threats_detected': Counter,
  'security.threats_blocked': Counter,
  'security.incidents_created': Counter,
  
  // Compliance
  'compliance.consent_granted': Counter,
  'compliance.dsr_submitted': Counter,
  'compliance.dsr_completed': Counter,
  
  // Performance
  'security.request_duration': Histogram,
  'security.encryption_duration': Histogram,
};
```
