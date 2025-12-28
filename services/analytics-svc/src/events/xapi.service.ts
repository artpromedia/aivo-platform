// ══════════════════════════════════════════════════════════════════════════════
// xAPI SERVICE
// Experience API (xAPI/Tin Can) statement generation and dispatch
// ADL xAPI 1.0.3 compliant
// ══════════════════════════════════════════════════════════════════════════════

import { createHash, randomUUID } from 'crypto';
import { Redis } from 'ioredis';

import { logger, metrics } from '@aivo/ts-observability';

// ─── xAPI Vocabulary ───────────────────────────────────────────────────────────

/**
 * ADL Verbs - Standard xAPI verbs
 * @see https://registry.tincanapi.com/
 */
export const XAPI_VERBS = {
  // Learning verbs
  launched: {
    id: 'http://adlnet.gov/expapi/verbs/launched',
    display: { 'en-US': 'launched' },
  },
  initialized: {
    id: 'http://adlnet.gov/expapi/verbs/initialized',
    display: { 'en-US': 'initialized' },
  },
  completed: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  passed: {
    id: 'http://adlnet.gov/expapi/verbs/passed',
    display: { 'en-US': 'passed' },
  },
  failed: {
    id: 'http://adlnet.gov/expapi/verbs/failed',
    display: { 'en-US': 'failed' },
  },
  experienced: {
    id: 'http://adlnet.gov/expapi/verbs/experienced',
    display: { 'en-US': 'experienced' },
  },
  attempted: {
    id: 'http://adlnet.gov/expapi/verbs/attempted',
    display: { 'en-US': 'attempted' },
  },
  progressed: {
    id: 'http://adlnet.gov/expapi/verbs/progressed',
    display: { 'en-US': 'progressed' },
  },
  answered: {
    id: 'http://adlnet.gov/expapi/verbs/answered',
    display: { 'en-US': 'answered' },
  },
  interacted: {
    id: 'http://adlnet.gov/expapi/verbs/interacted',
    display: { 'en-US': 'interacted' },
  },
  // Session verbs
  loggedin: {
    id: 'https://w3id.org/xapi/adl/verbs/logged-in',
    display: { 'en-US': 'logged-in' },
  },
  loggedout: {
    id: 'https://w3id.org/xapi/adl/verbs/logged-out',
    display: { 'en-US': 'logged-out' },
  },
  // Achievement verbs
  earned: {
    id: 'http://specification.openbadges.org/xapi/verbs/earned',
    display: { 'en-US': 'earned' },
  },
  mastered: {
    id: 'https://w3id.org/xapi/adb/verbs/mastered',
    display: { 'en-US': 'mastered' },
  },
  // Video verbs
  played: {
    id: 'https://w3id.org/xapi/video/verbs/played',
    display: { 'en-US': 'played' },
  },
  paused: {
    id: 'https://w3id.org/xapi/video/verbs/paused',
    display: { 'en-US': 'paused' },
  },
  seeked: {
    id: 'https://w3id.org/xapi/video/verbs/seeked',
    display: { 'en-US': 'seeked' },
  },
  // Social verbs
  shared: {
    id: 'http://adlnet.gov/expapi/verbs/shared',
    display: { 'en-US': 'shared' },
  },
  commented: {
    id: 'http://adlnet.gov/expapi/verbs/commented',
    display: { 'en-US': 'commented' },
  },
} as const;

export type XAPIVerbKey = keyof typeof XAPI_VERBS;

/**
 * Activity Types - Standard xAPI activity types
 */
export const XAPI_ACTIVITY_TYPES = {
  // Learning
  lesson: 'http://adlnet.gov/expapi/activities/lesson',
  assessment: 'http://adlnet.gov/expapi/activities/assessment',
  question: 'http://adlnet.gov/expapi/activities/question',
  course: 'http://adlnet.gov/expapi/activities/course',
  module: 'http://adlnet.gov/expapi/activities/module',
  // Content
  media: 'http://adlnet.gov/expapi/activities/media',
  video: 'https://w3id.org/xapi/video/activity-type/video',
  file: 'http://adlnet.gov/expapi/activities/file',
  // Interaction
  interaction: 'http://adlnet.gov/expapi/activities/interaction',
  simulation: 'http://adlnet.gov/expapi/activities/simulation',
  // Achievement
  badge: 'http://specification.openbadges.org/xapi/definition/badge',
  skill: 'https://w3id.org/xapi/dod-isd/activity-types/skill',
} as const;

export type XAPIActivityTypeKey = keyof typeof XAPI_ACTIVITY_TYPES;

// ─── xAPI Statement Interfaces ─────────────────────────────────────────────────

export interface XAPIActor {
  objectType?: 'Agent' | 'Group';
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: {
    homePage: string;
    name: string;
  };
  member?: XAPIActor[]; // For groups
}

export interface XAPIVerb {
  id: string;
  display?: Record<string, string>;
}

export interface XAPIActivity {
  objectType?: 'Activity';
  id: string;
  definition?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    type?: string;
    moreInfo?: string;
    interactionType?: string;
    correctResponsesPattern?: string[];
    choices?: Array<{ id: string; description: Record<string, string> }>;
    extensions?: Record<string, unknown>;
  };
}

export interface XAPIResult {
  score?: {
    scaled?: number; // -1 to 1
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string; // ISO 8601 duration (e.g., PT2H30M)
  extensions?: Record<string, unknown>;
}

export interface XAPIContext {
  registration?: string;
  instructor?: XAPIActor;
  team?: XAPIActor;
  contextActivities?: {
    parent?: XAPIActivity[];
    grouping?: XAPIActivity[];
    category?: XAPIActivity[];
    other?: XAPIActivity[];
  };
  revision?: string;
  platform?: string;
  language?: string;
  statement?: {
    objectType: 'StatementRef';
    id: string;
  };
  extensions?: Record<string, unknown>;
}

export interface XAPIStatement {
  id?: string;
  actor: XAPIActor;
  verb: XAPIVerb;
  object: XAPIActivity;
  result?: XAPIResult;
  context?: XAPIContext;
  timestamp?: string;
  stored?: string;
  authority?: XAPIActor;
  version?: string;
  attachments?: Array<{
    usageType: string;
    display: Record<string, string>;
    contentType: string;
    length: number;
    sha2: string;
  }>;
}

// ─── Service Types ─────────────────────────────────────────────────────────────

export interface XAPIServiceConfig {
  lrsEndpoint: string;
  lrsUsername: string;
  lrsPassword: string;
  version: string;
  authority: XAPIActor;
  homePage: string;
  bufferSize: number;
  flushIntervalMs: number;
  enabled: boolean;
}

export interface StatementInput {
  actor: { id: string; name?: string };
  verb: XAPIVerbKey | string;
  object: {
    type: XAPIActivityTypeKey | string;
    id: string;
    name?: string;
    description?: string;
  };
  result?: {
    score?: { scaled?: number; raw?: number; max?: number };
    success?: boolean;
    completion?: boolean;
    duration?: string;
    response?: string;
  };
  context?: {
    tenantId: string;
    classId?: string;
    courseId?: string;
    sessionId?: string;
    parentActivityId?: string;
    language?: string;
  };
}

const DEFAULT_CONFIG: XAPIServiceConfig = {
  lrsEndpoint: process.env['XAPI_LRS_ENDPOINT'] ?? 'http://localhost:8000/xapi',
  lrsUsername: process.env['XAPI_LRS_USERNAME'] ?? '',
  lrsPassword: process.env['XAPI_LRS_PASSWORD'] ?? '',
  version: '1.0.3',
  authority: {
    objectType: 'Agent',
    name: 'AIVO Platform',
    mbox: 'mailto:xapi@aivo.com',
  },
  homePage: 'https://app.aivo.com',
  bufferSize: 50,
  flushIntervalMs: 10000,
  enabled: true,
};

// ─── xAPI Service Implementation ───────────────────────────────────────────────

export class XAPIService {
  private config: XAPIServiceConfig;
  private statementBuffer: XAPIStatement[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly redis: Redis,
    config?: Partial<XAPIServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the xAPI service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('xAPI service is disabled');
      return;
    }

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      void this.flushBuffer();
    }, this.config.flushIntervalMs);

    logger.info('xAPI service initialized', {
      lrsEndpoint: this.config.lrsEndpoint,
      version: this.config.version,
    });
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flushBuffer();
    logger.info('xAPI service shutdown complete');
  }

  /**
   * Generate and queue an xAPI statement
   */
  async generateStatement(input: StatementInput): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const statement = this.buildStatement(input);
    this.statementBuffer.push(statement);

    // Flush if buffer is full
    if (this.statementBuffer.length >= this.config.bufferSize) {
      await this.flushBuffer();
    }

    metrics.increment('xapi.statements.generated', {
      verb: typeof input.verb === 'string' ? input.verb : input.verb,
    });

    return statement.id!;
  }

  /**
   * Send statement immediately (bypass buffer)
   */
  async sendStatementImmediate(input: StatementInput): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const statement = this.buildStatement(input);
    await this.sendStatements([statement]);
    return statement.id!;
  }

  /**
   * Build an xAPI statement from input
   */
  private buildStatement(input: StatementInput): XAPIStatement {
    const verb = this.resolveVerb(input.verb);
    const activityType = this.resolveActivityType(input.object.type);

    const statement: XAPIStatement = {
      id: randomUUID(),
      actor: this.buildActor(input.actor),
      verb,
      object: this.buildActivity(input.object, activityType),
      timestamp: new Date().toISOString(),
      version: this.config.version,
      authority: this.config.authority,
    };

    // Add result if provided
    if (input.result) {
      statement.result = this.buildResult(input.result);
    }

    // Add context if provided
    if (input.context) {
      statement.context = this.buildContext(input.context);
    }

    return statement;
  }

  /**
   * Build actor object
   */
  private buildActor(actor: { id: string; name?: string }): XAPIActor {
    // Use account identifier (FERPA compliant - no email)
    return {
      objectType: 'Agent',
      name: actor.name,
      account: {
        homePage: this.config.homePage,
        name: this.hashStudentId(actor.id),
      },
    };
  }

  /**
   * Build activity object
   */
  private buildActivity(
    object: { type: string; id: string; name?: string; description?: string },
    activityType: string
  ): XAPIActivity {
    return {
      objectType: 'Activity',
      id: `${this.config.homePage}/activities/${object.type}/${object.id}`,
      definition: {
        name: object.name ? { 'en-US': object.name } : undefined,
        description: object.description ? { 'en-US': object.description } : undefined,
        type: activityType,
      },
    };
  }

  /**
   * Build result object
   */
  private buildResult(result: StatementInput['result']): XAPIResult | undefined {
    if (!result) return undefined;

    const xapiResult: XAPIResult = {};

    if (result.score) {
      xapiResult.score = {
        scaled: result.score.scaled,
        raw: result.score.raw,
        max: result.score.max,
      };
    }

    if (result.success !== undefined) {
      xapiResult.success = result.success;
    }

    if (result.completion !== undefined) {
      xapiResult.completion = result.completion;
    }

    if (result.duration) {
      xapiResult.duration = result.duration;
    }

    if (result.response) {
      xapiResult.response = result.response;
    }

    return xapiResult;
  }

  /**
   * Build context object
   */
  private buildContext(context: StatementInput['context']): XAPIContext | undefined {
    if (!context) return undefined;

    const xapiContext: XAPIContext = {
      registration: context.sessionId,
      platform: 'AIVO Platform',
      language: context.language ?? 'en-US',
      extensions: {
        'https://aivo.com/xapi/extensions/tenant': context.tenantId,
      },
    };

    // Add context activities
    const contextActivities: NonNullable<XAPIContext['contextActivities']> = {};

    if (context.parentActivityId) {
      contextActivities.parent = [
        {
          id: `${this.config.homePage}/activities/${context.parentActivityId}`,
        },
      ];
    }

    if (context.classId) {
      contextActivities.grouping = [
        {
          id: `${this.config.homePage}/classes/${context.classId}`,
          definition: {
            type: 'http://adlnet.gov/expapi/activities/course',
          },
        },
      ];
    }

    if (context.courseId) {
      if (!contextActivities.grouping) {
        contextActivities.grouping = [];
      }
      contextActivities.grouping.push({
        id: `${this.config.homePage}/courses/${context.courseId}`,
        definition: {
          type: 'http://adlnet.gov/expapi/activities/course',
        },
      });
    }

    if (Object.keys(contextActivities).length > 0) {
      xapiContext.contextActivities = contextActivities;
    }

    return xapiContext;
  }

  /**
   * Resolve verb from key or return custom verb
   */
  private resolveVerb(verb: XAPIVerbKey | string): XAPIVerb {
    if (verb in XAPI_VERBS) {
      return XAPI_VERBS[verb as XAPIVerbKey];
    }

    // Custom verb
    return {
      id: verb,
      display: { 'en-US': verb },
    };
  }

  /**
   * Resolve activity type from key or return custom type
   */
  private resolveActivityType(type: XAPIActivityTypeKey | string): string {
    if (type in XAPI_ACTIVITY_TYPES) {
      return XAPI_ACTIVITY_TYPES[type as XAPIActivityTypeKey];
    }

    return type;
  }

  /**
   * Hash student ID for privacy (FERPA compliance)
   */
  private hashStudentId(studentId: string): string {
    return createHash('sha256').update(studentId).digest('hex');
  }

  /**
   * Flush statement buffer to LRS
   */
  private async flushBuffer(): Promise<void> {
    if (this.statementBuffer.length === 0) {
      return;
    }

    const statements = [...this.statementBuffer];
    this.statementBuffer = [];

    await this.sendStatements(statements);
  }

  /**
   * Send statements to LRS
   */
  private async sendStatements(statements: XAPIStatement[]): Promise<void> {
    if (!this.config.lrsEndpoint || !this.config.lrsUsername) {
      // No LRS configured - store in Redis for later processing
      await this.storeStatementsLocally(statements);
      return;
    }

    try {
      const auth = Buffer.from(
        `${this.config.lrsUsername}:${this.config.lrsPassword}`
      ).toString('base64');

      const response = await fetch(`${this.config.lrsEndpoint}/statements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Experience-API-Version': this.config.version,
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(statements),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LRS responded with ${response.status}: ${error}`);
      }

      metrics.increment('xapi.statements.sent', { count: String(statements.length) });
      logger.debug(`Sent ${statements.length} xAPI statements to LRS`);
    } catch (error) {
      logger.error('Failed to send xAPI statements to LRS', { error });

      // Re-queue if not shutting down
      if (!this.isShuttingDown) {
        this.statementBuffer.unshift(...statements.slice(0, 100));
      }

      // Store locally as fallback
      await this.storeStatementsLocally(statements);
    }
  }

  /**
   * Store statements locally (Redis) when LRS is unavailable
   */
  private async storeStatementsLocally(statements: XAPIStatement[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const statement of statements) {
        pipeline.lpush('xapi:pending_statements', JSON.stringify(statement));
      }

      // Keep max 10000 pending statements
      pipeline.ltrim('xapi:pending_statements', 0, 9999);
      pipeline.expire('xapi:pending_statements', 86400 * 7); // 7 days

      await pipeline.exec();
    } catch (error) {
      logger.error('Failed to store xAPI statements locally', { error });
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get statements from LRS
   */
  async getStatements(params: {
    agent?: string;
    verb?: string;
    activity?: string;
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<XAPIStatement[]> {
    if (!this.config.lrsEndpoint || !this.config.lrsUsername) {
      return [];
    }

    try {
      const queryParams = new URLSearchParams();

      if (params.agent) {
        queryParams.set(
          'agent',
          JSON.stringify({
            account: {
              homePage: this.config.homePage,
              name: this.hashStudentId(params.agent),
            },
          })
        );
      }

      if (params.verb) {
        const verb = this.resolveVerb(params.verb as XAPIVerbKey);
        queryParams.set('verb', verb.id);
      }

      if (params.activity) {
        queryParams.set('activity', params.activity);
      }

      if (params.since) {
        queryParams.set('since', params.since.toISOString());
      }

      if (params.until) {
        queryParams.set('until', params.until.toISOString());
      }

      if (params.limit) {
        queryParams.set('limit', String(params.limit));
      }

      const auth = Buffer.from(
        `${this.config.lrsUsername}:${this.config.lrsPassword}`
      ).toString('base64');

      const response = await fetch(
        `${this.config.lrsEndpoint}/statements?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'X-Experience-API-Version': this.config.version,
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`LRS responded with ${response.status}`);
      }

      const result = (await response.json()) as { statements: XAPIStatement[] };
      return result.statements;
    } catch (error) {
      logger.error('Failed to get xAPI statements from LRS', { error });
      return [];
    }
  }

  /**
   * Get statement count for activity
   */
  async getStatementCount(activityId: string): Promise<number> {
    const countKey = `xapi:activity:${activityId}:count`;
    const count = await this.redis.get(countKey);
    return count ? parseInt(count, 10) : 0;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Track lesson started
   */
  async trackLessonStarted(
    studentId: string,
    lessonId: string,
    lessonName: string,
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: 'launched',
      object: { type: 'lesson', id: lessonId, name: lessonName },
      context,
    });
  }

  /**
   * Track lesson completed
   */
  async trackLessonCompleted(
    studentId: string,
    lessonId: string,
    lessonName: string,
    result: { score: number; timeSeconds: number; success: boolean },
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: 'completed',
      object: { type: 'lesson', id: lessonId, name: lessonName },
      result: {
        score: { scaled: result.score / 100 },
        duration: this.formatDuration(result.timeSeconds),
        success: result.success,
        completion: true,
      },
      context,
    });
  }

  /**
   * Track question answered
   */
  async trackQuestionAnswered(
    studentId: string,
    questionId: string,
    result: { correct: boolean; score: number; response?: string },
    context: { tenantId: string; lessonId?: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: 'answered',
      object: { type: 'question', id: questionId },
      result: {
        score: { scaled: result.score / 100 },
        success: result.correct,
        response: result.response,
      },
      context: {
        ...context,
        parentActivityId: context.lessonId,
      },
    });
  }

  /**
   * Track assessment completed
   */
  async trackAssessmentCompleted(
    studentId: string,
    assessmentId: string,
    assessmentName: string,
    result: {
      score: number;
      maxScore: number;
      timeSeconds: number;
      passed: boolean;
    },
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: result.passed ? 'passed' : 'failed',
      object: { type: 'assessment', id: assessmentId, name: assessmentName },
      result: {
        score: {
          scaled: result.score / result.maxScore,
          raw: result.score,
          max: result.maxScore,
        },
        duration: this.formatDuration(result.timeSeconds),
        success: result.passed,
        completion: true,
      },
      context,
    });
  }

  /**
   * Track skill mastered
   */
  async trackSkillMastered(
    studentId: string,
    skillId: string,
    skillName: string,
    masteryLevel: number,
    context: { tenantId: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: 'mastered',
      object: { type: 'skill', id: skillId, name: skillName },
      result: {
        score: { scaled: masteryLevel },
        success: true,
        completion: true,
      },
      context,
    });
  }

  /**
   * Track badge earned
   */
  async trackBadgeEarned(
    studentId: string,
    badgeId: string,
    badgeName: string,
    context: { tenantId: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: 'earned',
      object: { type: 'badge', id: badgeId, name: badgeName },
      result: {
        success: true,
        completion: true,
      },
      context,
    });
  }

  /**
   * Track video progress
   */
  async trackVideoProgress(
    studentId: string,
    videoId: string,
    videoName: string,
    action: 'played' | 'paused' | 'completed',
    position: number,
    duration: number,
    context: { tenantId: string; lessonId?: string }
  ): Promise<void> {
    await this.generateStatement({
      actor: { id: studentId },
      verb: action === 'completed' ? 'completed' : action,
      object: { type: 'video', id: videoId, name: videoName },
      result:
        action === 'completed'
          ? {
              duration: this.formatDuration(duration),
              completion: true,
            }
          : undefined,
      context: {
        ...context,
        parentActivityId: context.lessonId,
      },
    });
  }

  /**
   * Format duration as ISO 8601
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let duration = 'PT';
    if (hours > 0) duration += `${hours}H`;
    if (minutes > 0) duration += `${minutes}M`;
    if (secs > 0 || (hours === 0 && minutes === 0)) duration += `${secs}S`;

    return duration;
  }
}
