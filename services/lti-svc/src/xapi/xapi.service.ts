/**
 * xAPI 1.0.3 Service — Learning Record Store (LRS) implementation.
 *
 * Provides a conformant xAPI statement store so that external LRSes and
 * analytics platforms can consume AIVO learning data in the standard format.
 *
 * Key features:
 * - Store / query xAPI statements (Experience API 1.0.3)
 * - Map AIVO domain events to xAPI verbs/objects
 * - Authority tagging for provenance auditing
 *
 * @see https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md
 */

import crypto from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// xAPI TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface XapiActor {
  objectType?: 'Agent' | 'Group';
  name?: string;
  mbox?: string;             // mailto:user@example.com
  mbox_sha1sum?: string;
  openid?: string;
  account?: { homePage: string; name: string };
}

export interface XapiVerb {
  id: string;                // IRI, e.g. http://adlnet.gov/expapi/verbs/completed
  display?: Record<string, string>; // language map
}

export interface XapiActivity {
  objectType?: 'Activity';
  id: string;                // IRI
  definition?: {
    type?: string;
    name?: Record<string, string>;
    description?: Record<string, string>;
    extensions?: Record<string, unknown>;
  };
}

export interface XapiResult {
  score?: {
    scaled?: number;         // -1.0 … 1.0
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;         // ISO 8601 duration
  extensions?: Record<string, unknown>;
}

export interface XapiContext {
  registration?: string;     // UUID
  instructor?: XapiActor;
  team?: XapiActor;
  contextActivities?: {
    parent?: XapiActivity[];
    grouping?: XapiActivity[];
    category?: XapiActivity[];
    other?: XapiActivity[];
  };
  extensions?: Record<string, unknown>;
}

export interface XapiStatement {
  id?: string;
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiActivity;
  result?: XapiResult;
  context?: XapiContext;
  timestamp?: string;
  stored?: string;
  authority?: XapiActor;
  version?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// VERB MAP — Maps AIVO domain events to xAPI verb IRIs
// ══════════════════════════════════════════════════════════════════════════════

export const AIVO_VERB_MAP: Record<string, { id: string; display: Record<string, string> }> = {
  'session.completed': {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  'session.started': {
    id: 'http://adlnet.gov/expapi/verbs/initialized',
    display: { 'en-US': 'initialized' },
  },
  'assessment.submitted': {
    id: 'http://adlnet.gov/expapi/verbs/answered',
    display: { 'en-US': 'answered' },
  },
  'assessment.passed': {
    id: 'http://adlnet.gov/expapi/verbs/passed',
    display: { 'en-US': 'passed' },
  },
  'assessment.failed': {
    id: 'http://adlnet.gov/expapi/verbs/failed',
    display: { 'en-US': 'failed' },
  },
  'lesson.completed': {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  'lesson.launched': {
    id: 'http://adlnet.gov/expapi/verbs/launched',
    display: { 'en-US': 'launched' },
  },
  'skill.mastered': {
    id: 'http://adlnet.gov/expapi/verbs/mastered',
    display: { 'en-US': 'mastered' },
  },
};

// AIVO authority — identifies this system as the source of statements
const AIVO_AUTHORITY: XapiActor = {
  objectType: 'Agent',
  name: 'AIVO Platform',
  account: {
    homePage: 'https://aivo.app',
    name: 'aivo-lrs',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class XapiService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Store a single xAPI statement.
   * Assigns id, stored, authority, and version if not provided.
   */
  async storeStatement(statement: XapiStatement, tenantId: string): Promise<string> {
    const id = statement.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).xapiStatement.create({
      data: {
        id,
        tenantId,
        actor: statement.actor as never,
        verb: statement.verb as never,
        object: statement.object as never,
        result: (statement.result ?? null) as never,
        context: (statement.context ?? null) as never,
        timestamp: statement.timestamp ? new Date(statement.timestamp) : new Date(),
        stored: new Date(now),
        authority: (statement.authority ?? AIVO_AUTHORITY) as never,
        version: statement.version ?? '1.0.3',
      },
    });

    return id;
  }

  /**
   * Store multiple xAPI statements in a batch.
   */
  async storeStatements(statements: XapiStatement[], tenantId: string): Promise<string[]> {
    const ids: string[] = [];
    for (const stmt of statements) {
      const id = await this.storeStatement(stmt, tenantId);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Retrieve a statement by ID.
   */
  async getStatement(id: string, tenantId: string): Promise<XapiStatement | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (this.prisma as any).xapiStatement.findFirst({
      where: { id, tenantId },
    });
    if (!row) return null;
    return this.rowToStatement(row);
  }

  /**
   * Query statements with standard xAPI filtering.
   *
   * Supported params:
   * - agent (mbox or account)
   * - verb (IRI)
   * - activity (IRI)
   * - since / until (ISO timestamps)
   * - limit / offset (pagination)
   */
  async queryStatements(
    tenantId: string,
    params: {
      agent?: string;
      verb?: string;
      activity?: string;
      since?: string;
      until?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ statements: XapiStatement[]; more: string }> {
    const { limit = 50, offset = 0 } = params;

    // Build Prisma where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId };

    if (params.verb) {
      where.verb = { path: ['id'], equals: params.verb };
    }
    if (params.activity) {
      where.object = { path: ['id'], equals: params.activity };
    }
    if (params.since || params.until) {
      where.timestamp = {};
      if (params.since) where.timestamp.gte = new Date(params.since);
      if (params.until) where.timestamp.lte = new Date(params.until);
    }
    if (params.agent) {
      // Match by mbox or account name
      where.OR = [
        { actor: { path: ['mbox'], equals: params.agent } },
        { actor: { path: ['account', 'name'], equals: params.agent } },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (this.prisma as any).xapiStatement.findMany({
      where,
      orderBy: { stored: 'desc' },
      take: limit + 1, // fetch one extra to detect "more"
      skip: offset,
    });

    const hasMore = rows.length > limit;
    const statements = (hasMore ? rows.slice(0, limit) : rows).map(this.rowToStatement);
    const more = hasMore ? `?offset=${offset + limit}&limit=${limit}` : '';

    return { statements, more };
  }

  /**
   * Map an AIVO domain event to an xAPI statement and store it.
   */
  async mapAndStoreEvent(
    eventType: string,
    tenantId: string,
    payload: {
      userId: string;
      userEmail?: string;
      activityId: string;
      activityName?: string;
      activityType?: string;
      score?: number;
      maxScore?: number;
      success?: boolean;
      duration?: string;
      sessionId?: string;
    }
  ): Promise<string | null> {
    const verbDef = AIVO_VERB_MAP[eventType];
    if (!verbDef) {
      console.warn(`[xAPI] Unknown event type: ${eventType}`);
      return null;
    }

    const statement: XapiStatement = {
      actor: {
        objectType: 'Agent',
        ...(payload.userEmail
          ? { mbox: `mailto:${payload.userEmail}` }
          : {
              account: {
                homePage: 'https://aivo.app',
                name: payload.userId,
              },
            }),
      },
      verb: verbDef,
      object: {
        objectType: 'Activity',
        id: `https://aivo.app/activities/${payload.activityId}`,
        definition: {
          type: payload.activityType
            ? `https://aivo.app/activity-types/${payload.activityType}`
            : 'http://adlnet.gov/expapi/activities/lesson',
          name: payload.activityName ? { 'en-US': payload.activityName } : undefined,
        },
      },
    };

    // Attach result if score/completion data present
    if (payload.score !== undefined || payload.success !== undefined || payload.duration) {
      statement.result = {};
      if (payload.score !== undefined) {
        statement.result.score = {
          raw: payload.score,
          max: payload.maxScore ?? 100,
          scaled:
            payload.maxScore && payload.maxScore > 0
              ? payload.score / payload.maxScore
              : payload.score / 100,
        };
      }
      if (payload.success !== undefined) statement.result.success = payload.success;
      if (payload.duration) statement.result.duration = payload.duration;
      statement.result.completion = eventType.includes('completed');
    }

    // Add session context
    if (payload.sessionId) {
      statement.context = {
        registration: payload.sessionId,
        extensions: {
          'https://aivo.app/extensions/tenant-id': tenantId,
        },
      };
    }

    return this.storeStatement(statement, tenantId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE
  // ────────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rowToStatement(row: any): XapiStatement {
    return {
      id: row.id,
      actor: row.actor,
      verb: row.verb,
      object: row.object,
      result: row.result ?? undefined,
      context: row.context ?? undefined,
      timestamp: row.timestamp?.toISOString(),
      stored: row.stored?.toISOString(),
      authority: row.authority ?? undefined,
      version: row.version,
    };
  }
}
