/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion */
/**
 * xAPI Statement Service
 *
 * Implements xAPI 1.0.3 (Experience API / Tin Can API) for learning
 * activity tracking. Provides:
 * - Statement creation and validation
 * - Statement querying and filtering
 * - LRS (Learning Record Store) integration
 * - Statement forwarding to external LRS
 *
 * @see https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md
 */

import { randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// XAPI TYPES - Core specification types
// ══════════════════════════════════════════════════════════════════════════════

export interface XapiAgent {
  objectType?: 'Agent';
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: {
    homePage: string;
    name: string;
  };
}

export interface XapiGroup extends Omit<XapiAgent, 'objectType'> {
  objectType: 'Group';
  member?: XapiAgent[];
}

export type XapiActor = XapiAgent | XapiGroup;

export interface XapiVerb {
  id: string;
  display?: Record<string, string>;
}

export interface XapiActivity {
  objectType?: 'Activity';
  id: string;
  definition?: XapiActivityDefinition;
}

export interface XapiActivityDefinition {
  name?: Record<string, string>;
  description?: Record<string, string>;
  type?: string;
  moreInfo?: string;
  interactionType?: XapiInteractionType;
  correctResponsesPattern?: string[];
  choices?: XapiInteractionComponent[];
  scale?: XapiInteractionComponent[];
  source?: XapiInteractionComponent[];
  target?: XapiInteractionComponent[];
  steps?: XapiInteractionComponent[];
  extensions?: Record<string, unknown>;
}

export type XapiInteractionType =
  | 'true-false'
  | 'choice'
  | 'fill-in'
  | 'long-fill-in'
  | 'matching'
  | 'performance'
  | 'sequencing'
  | 'likert'
  | 'numeric'
  | 'other';

export interface XapiInteractionComponent {
  id: string;
  description?: Record<string, string>;
}

export interface XapiStatementRef {
  objectType: 'StatementRef';
  id: string;
}

export interface XapiSubStatement {
  objectType: 'SubStatement';
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiActivity | XapiStatementRef | XapiSubStatement;
  result?: XapiResult;
  context?: XapiContext;
  timestamp?: string;
  attachments?: XapiAttachment[];
}

export type XapiObject = XapiActivity | XapiAgent | XapiGroup | XapiStatementRef | XapiSubStatement;

export interface XapiResult {
  score?: XapiScore;
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string; // ISO 8601 duration
  extensions?: Record<string, unknown>;
}

export interface XapiScore {
  scaled?: number; // -1.0 to 1.0
  raw?: number;
  min?: number;
  max?: number;
}

export interface XapiContext {
  registration?: string;
  instructor?: XapiAgent | XapiGroup;
  team?: XapiGroup;
  contextActivities?: XapiContextActivities;
  revision?: string;
  platform?: string;
  language?: string;
  statement?: XapiStatementRef;
  extensions?: Record<string, unknown>;
}

export interface XapiContextActivities {
  parent?: XapiActivity[];
  grouping?: XapiActivity[];
  category?: XapiActivity[];
  other?: XapiActivity[];
}

export interface XapiAttachment {
  usageType: string;
  display: Record<string, string>;
  description?: Record<string, string>;
  contentType: string;
  length: number;
  sha2: string;
  fileUrl?: string;
}

export interface XapiStatement {
  id?: string;
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiObject;
  result?: XapiResult;
  context?: XapiContext;
  timestamp?: string;
  stored?: string;
  authority?: XapiAgent | XapiGroup;
  version?: string;
  attachments?: XapiAttachment[];
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMON VERBS - ADL vocabulary
// ══════════════════════════════════════════════════════════════════════════════

export const XapiVerbs = {
  answered: {
    id: 'http://adlnet.gov/expapi/verbs/answered',
    display: { 'en-US': 'answered' },
  },
  asked: {
    id: 'http://adlnet.gov/expapi/verbs/asked',
    display: { 'en-US': 'asked' },
  },
  attempted: {
    id: 'http://adlnet.gov/expapi/verbs/attempted',
    display: { 'en-US': 'attempted' },
  },
  attended: {
    id: 'http://adlnet.gov/expapi/verbs/attended',
    display: { 'en-US': 'attended' },
  },
  commented: {
    id: 'http://adlnet.gov/expapi/verbs/commented',
    display: { 'en-US': 'commented' },
  },
  completed: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  exited: {
    id: 'http://adlnet.gov/expapi/verbs/exited',
    display: { 'en-US': 'exited' },
  },
  experienced: {
    id: 'http://adlnet.gov/expapi/verbs/experienced',
    display: { 'en-US': 'experienced' },
  },
  failed: {
    id: 'http://adlnet.gov/expapi/verbs/failed',
    display: { 'en-US': 'failed' },
  },
  imported: {
    id: 'http://adlnet.gov/expapi/verbs/imported',
    display: { 'en-US': 'imported' },
  },
  initialized: {
    id: 'http://adlnet.gov/expapi/verbs/initialized',
    display: { 'en-US': 'initialized' },
  },
  interacted: {
    id: 'http://adlnet.gov/expapi/verbs/interacted',
    display: { 'en-US': 'interacted' },
  },
  launched: {
    id: 'http://adlnet.gov/expapi/verbs/launched',
    display: { 'en-US': 'launched' },
  },
  mastered: {
    id: 'http://adlnet.gov/expapi/verbs/mastered',
    display: { 'en-US': 'mastered' },
  },
  passed: {
    id: 'http://adlnet.gov/expapi/verbs/passed',
    display: { 'en-US': 'passed' },
  },
  preferred: {
    id: 'http://adlnet.gov/expapi/verbs/preferred',
    display: { 'en-US': 'preferred' },
  },
  progressed: {
    id: 'http://adlnet.gov/expapi/verbs/progressed',
    display: { 'en-US': 'progressed' },
  },
  registered: {
    id: 'http://adlnet.gov/expapi/verbs/registered',
    display: { 'en-US': 'registered' },
  },
  responded: {
    id: 'http://adlnet.gov/expapi/verbs/responded',
    display: { 'en-US': 'responded' },
  },
  resumed: {
    id: 'http://adlnet.gov/expapi/verbs/resumed',
    display: { 'en-US': 'resumed' },
  },
  scored: {
    id: 'http://adlnet.gov/expapi/verbs/scored',
    display: { 'en-US': 'scored' },
  },
  shared: {
    id: 'http://adlnet.gov/expapi/verbs/shared',
    display: { 'en-US': 'shared' },
  },
  suspended: {
    id: 'http://adlnet.gov/expapi/verbs/suspended',
    display: { 'en-US': 'suspended' },
  },
  terminated: {
    id: 'http://adlnet.gov/expapi/verbs/terminated',
    display: { 'en-US': 'terminated' },
  },
  voided: {
    id: 'http://adlnet.gov/expapi/verbs/voided',
    display: { 'en-US': 'voided' },
  },
  waived: {
    id: 'http://adlnet.gov/expapi/verbs/waived',
    display: { 'en-US': 'waived' },
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// COMMON ACTIVITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const XapiActivityTypes = {
  assessment: 'http://adlnet.gov/expapi/activities/assessment',
  course: 'http://adlnet.gov/expapi/activities/course',
  file: 'http://adlnet.gov/expapi/activities/file',
  interaction: 'http://adlnet.gov/expapi/activities/interaction',
  lesson: 'http://adlnet.gov/expapi/activities/lesson',
  link: 'http://adlnet.gov/expapi/activities/link',
  media: 'http://adlnet.gov/expapi/activities/media',
  meeting: 'http://adlnet.gov/expapi/activities/meeting',
  module: 'http://adlnet.gov/expapi/activities/module',
  objective: 'http://adlnet.gov/expapi/activities/objective',
  performance: 'http://adlnet.gov/expapi/activities/performance',
  profile: 'http://adlnet.gov/expapi/activities/profile',
  question: 'http://adlnet.gov/expapi/activities/question',
  simulation: 'http://adlnet.gov/expapi/activities/simulation',
  // Aivo-specific
  lesson_activity: 'https://aivo.com/xapi/activity-types/lesson-activity',
  practice_problem: 'https://aivo.com/xapi/activity-types/practice-problem',
  skill: 'https://aivo.com/xapi/activity-types/skill',
  learning_objective: 'https://aivo.com/xapi/activity-types/learning-objective',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateStatement(statement: XapiStatement): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required: actor
  if (!statement.actor) {
    errors.push({ path: 'actor', message: 'actor is required', severity: 'error' });
  } else {
    validateActor(statement.actor, 'actor', errors, warnings);
  }

  // Required: verb
  if (!statement.verb) {
    errors.push({ path: 'verb', message: 'verb is required', severity: 'error' });
  } else {
    validateVerb(statement.verb, 'verb', errors, warnings);
  }

  // Required: object
  if (!statement.object) {
    errors.push({ path: 'object', message: 'object is required', severity: 'error' });
  } else {
    validateObject(statement.object, 'object', errors, warnings);
  }

  // Optional: result
  if (statement.result) {
    validateResult(statement.result, 'result', errors, warnings);
  }

  // Optional: context
  if (statement.context) {
    validateContext(statement.context, 'context', errors, warnings);
  }

  // Optional: id (must be UUID)
  if (statement.id && !isValidUUID(statement.id)) {
    errors.push({ path: 'id', message: 'id must be a valid UUID', severity: 'error' });
  }

  // Optional: timestamp (must be ISO 8601)
  if (statement.timestamp && !isValidISO8601(statement.timestamp)) {
    errors.push({
      path: 'timestamp',
      message: 'timestamp must be ISO 8601 format',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateActor(
  actor: XapiActor,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Must have exactly one IFI
  const ifis = [actor.mbox, actor.mbox_sha1sum, actor.openid, actor.account].filter(Boolean);

  if (ifis.length === 0) {
    errors.push({
      path,
      message:
        'actor must have exactly one Inverse Functional Identifier (mbox, mbox_sha1sum, openid, or account)',
      severity: 'error',
    });
  } else if (ifis.length > 1) {
    errors.push({
      path,
      message: 'actor must have exactly one IFI, not multiple',
      severity: 'error',
    });
  }

  // Validate mbox format
  if (actor.mbox && !actor.mbox.startsWith('mailto:')) {
    errors.push({
      path: `${path}.mbox`,
      message: 'mbox must be a mailto URI',
      severity: 'error',
    });
  }

  // Validate account
  if (actor.account) {
    if (!actor.account.homePage) {
      errors.push({
        path: `${path}.account.homePage`,
        message: 'account.homePage is required',
        severity: 'error',
      });
    }
    if (!actor.account.name) {
      errors.push({
        path: `${path}.account.name`,
        message: 'account.name is required',
        severity: 'error',
      });
    }
  }

  // Group-specific validation
  if ('objectType' in actor && actor.objectType === 'Group') {
    const group = actor;
    if (group.member) {
      group.member.forEach((member, i) => {
        validateActor(member, `${path}.member[${i}]`, errors, warnings);
      });
    }
  }
}

function validateVerb(
  verb: XapiVerb,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!verb.id) {
    errors.push({ path: `${path}.id`, message: 'verb.id is required', severity: 'error' });
  } else if (!isValidIRI(verb.id)) {
    errors.push({ path: `${path}.id`, message: 'verb.id must be a valid IRI', severity: 'error' });
  }

  if (!verb.display) {
    warnings.push({
      path: `${path}.display`,
      message: 'verb.display is recommended for human-readable verb representation',
      severity: 'warning',
    });
  }
}

function validateObject(
  object: XapiObject,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const objectType = 'objectType' in object ? object.objectType : 'Activity';

  switch (objectType) {
    case 'Activity': {
      const activity = object as XapiActivity;
      if (!activity.id) {
        errors.push({ path: `${path}.id`, message: 'activity.id is required', severity: 'error' });
      } else if (!isValidIRI(activity.id)) {
        errors.push({
          path: `${path}.id`,
          message: 'activity.id must be a valid IRI',
          severity: 'error',
        });
      }
      break;
    }

    case 'Agent':
    case 'Group':
      validateActor(object as XapiActor, path, errors, warnings);
      break;

    case 'StatementRef': {
      const ref = object as XapiStatementRef;
      if (!ref.id || !isValidUUID(ref.id)) {
        errors.push({
          path: `${path}.id`,
          message: 'StatementRef.id must be a valid UUID',
          severity: 'error',
        });
      }
      break;
    }

    case 'SubStatement': {
      const sub = object as XapiSubStatement;
      validateActor(sub.actor, `${path}.actor`, errors, warnings);
      validateVerb(sub.verb, `${path}.verb`, errors, warnings);
      validateObject(sub.object, `${path}.object`, errors, warnings);
      break;
    }
  }
}

function validateResult(
  result: XapiResult,
  path: string,
  errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  if (result.score) {
    const { scaled, raw, min, max } = result.score;

    if (scaled !== undefined) {
      if (scaled < -1 || scaled > 1) {
        errors.push({
          path: `${path}.score.scaled`,
          message: 'score.scaled must be between -1.0 and 1.0',
          severity: 'error',
        });
      }
    }

    if (min !== undefined && max !== undefined && min > max) {
      errors.push({
        path: `${path}.score`,
        message: 'score.min must not be greater than score.max',
        severity: 'error',
      });
    }

    if (raw !== undefined && min !== undefined && raw < min) {
      errors.push({
        path: `${path}.score.raw`,
        message: 'score.raw must not be less than score.min',
        severity: 'error',
      });
    }

    if (raw !== undefined && max !== undefined && raw > max) {
      errors.push({
        path: `${path}.score.raw`,
        message: 'score.raw must not be greater than score.max',
        severity: 'error',
      });
    }
  }

  if (result.duration && !isValidISO8601Duration(result.duration)) {
    errors.push({
      path: `${path}.duration`,
      message: 'duration must be ISO 8601 duration format',
      severity: 'error',
    });
  }
}

function validateContext(
  context: XapiContext,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (context.registration && !isValidUUID(context.registration)) {
    errors.push({
      path: `${path}.registration`,
      message: 'registration must be a valid UUID',
      severity: 'error',
    });
  }

  if (context.instructor) {
    validateActor(context.instructor, `${path}.instructor`, errors, warnings);
  }

  if (context.team) {
    if (context.team.objectType !== 'Group') {
      errors.push({
        path: `${path}.team`,
        message: 'team must be a Group',
        severity: 'error',
      });
    }
    validateActor(context.team, `${path}.team`, errors, warnings);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATEMENT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export interface LrsConfig {
  endpoint: string;
  username?: string;
  password?: string;
  authToken?: string;
  version?: string;
}

export interface StoreOptions {
  validate?: boolean;
  addTimestamp?: boolean;
  addId?: boolean;
}

export interface QueryParams {
  statementId?: string;
  voidedStatementId?: string;
  agent?: XapiAgent;
  verb?: string;
  activity?: string;
  registration?: string;
  related_activities?: boolean;
  related_agents?: boolean;
  since?: string;
  until?: string;
  limit?: number;
  format?: 'ids' | 'exact' | 'canonical';
  ascending?: boolean;
}

export interface StatementsResult {
  statements: XapiStatement[];
  more?: string;
}

export class XapiStatementService {
  private lrsConfig?: LrsConfig;
  private statements = new Map<string, XapiStatement>();

  constructor(lrsConfig?: LrsConfig) {
    this.lrsConfig = lrsConfig;
  }

  /**
   * Create and optionally store a statement
   */
  async createStatement(
    statement: Omit<XapiStatement, 'id' | 'stored'>,
    options: StoreOptions = {}
  ): Promise<XapiStatement> {
    const fullStatement: XapiStatement = {
      ...statement,
      id: options.addId !== false ? randomUUID() : statement.id,
      timestamp:
        options.addTimestamp !== false && !statement.timestamp
          ? new Date().toISOString()
          : statement.timestamp,
      version: '1.0.3',
    };

    if (options.validate !== false) {
      const validation = validateStatement(fullStatement);
      if (!validation.valid) {
        throw new Error(`Invalid statement: ${validation.errors.map((e) => e.message).join(', ')}`);
      }
    }

    // Store locally
    if (fullStatement.id) {
      this.statements.set(fullStatement.id, fullStatement);
    }

    // Forward to LRS if configured
    if (this.lrsConfig) {
      await this.sendToLrs(fullStatement);
    }

    return fullStatement;
  }

  /**
   * Store multiple statements
   */
  async storeStatements(
    statements: Omit<XapiStatement, 'stored'>[],
    options: StoreOptions = {}
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const statement of statements) {
      const stored = await this.createStatement(statement, options);
      if (stored.id) {
        ids.push(stored.id);
      }
    }

    return ids;
  }

  /**
   * Get a statement by ID
   */
  async getStatement(id: string): Promise<XapiStatement | null> {
    // Try local store first
    const local = this.statements.get(id);
    if (local) return local;

    // Try LRS if configured
    if (this.lrsConfig) {
      return this.fetchFromLrs({ statementId: id });
    }

    return null;
  }

  /**
   * Query statements
   */
  async queryStatements(params: QueryParams): Promise<StatementsResult> {
    // For local store, apply filters
    let results = Array.from(this.statements.values());

    if (params.verb) {
      results = results.filter((s) => s.verb.id === params.verb);
    }

    if (params.activity) {
      results = results.filter((s) => {
        if ('id' in s.object && s.object.id === params.activity) return true;
        if (params.related_activities && s.context?.contextActivities) {
          const all = [
            ...(s.context.contextActivities.parent ?? []),
            ...(s.context.contextActivities.grouping ?? []),
            ...(s.context.contextActivities.category ?? []),
            ...(s.context.contextActivities.other ?? []),
          ];
          return all.some((a) => a.id === params.activity);
        }
        return false;
      });
    }

    if (params.agent) {
      results = results.filter((s) => this.matchesAgent(s.actor, params.agent!));
    }

    if (params.registration) {
      results = results.filter((s) => s.context?.registration === params.registration);
    }

    if (params.since) {
      const since = new Date(params.since);
      results = results.filter((s) => s.timestamp && new Date(s.timestamp) > since);
    }

    if (params.until) {
      const until = new Date(params.until);
      results = results.filter((s) => s.timestamp && new Date(s.timestamp) < until);
    }

    // Sort
    results.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return params.ascending ? aTime - bTime : bTime - aTime;
    });

    // Apply limit
    if (params.limit) {
      results = results.slice(0, params.limit);
    }

    return { statements: results };
  }

  /**
   * Void a statement
   */
  async voidStatement(statementId: string, actor: XapiActor): Promise<XapiStatement> {
    const voidingStatement = await this.createStatement({
      actor,
      verb: XapiVerbs.voided,
      object: {
        objectType: 'StatementRef',
        id: statementId,
      },
    });

    return voidingStatement;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LRS INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  private async sendToLrs(statement: XapiStatement): Promise<void> {
    if (!this.lrsConfig) return;

    const headers = this.getLrsHeaders();
    const url = `${this.lrsConfig.endpoint}/statements`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(statement),
      });

      if (!response.ok) {
        throw new Error(`LRS error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send statement to LRS:', error);
      throw error;
    }
  }

  private async fetchFromLrs(params: QueryParams): Promise<XapiStatement | null> {
    if (!this.lrsConfig) return null;

    const headers = this.getLrsHeaders();
    const url = new URL(`${this.lrsConfig.endpoint}/statements`);

    if (params.statementId) {
      url.searchParams.set('statementId', params.statementId);
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`LRS error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<XapiStatement>;
    } catch (error) {
      console.error('Failed to fetch from LRS:', error);
      throw error;
    }
  }

  private getLrsHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Experience-API-Version': this.lrsConfig?.version ?? '1.0.3',
    };

    if (this.lrsConfig?.authToken) {
      headers.Authorization = `Bearer ${this.lrsConfig.authToken}`;
    } else if (this.lrsConfig?.username && this.lrsConfig?.password) {
      const auth = Buffer.from(`${this.lrsConfig.username}:${this.lrsConfig.password}`).toString(
        'base64'
      );
      headers.Authorization = `Basic ${auth}`;
    }

    return headers;
  }

  private matchesAgent(actor: XapiActor, agent: XapiAgent): boolean {
    if (actor.mbox && agent.mbox) return actor.mbox === agent.mbox;
    if (actor.mbox_sha1sum && agent.mbox_sha1sum) {
      return actor.mbox_sha1sum === agent.mbox_sha1sum;
    }
    if (actor.openid && agent.openid) return actor.openid === agent.openid;
    if (actor.account && agent.account) {
      return (
        actor.account.homePage === agent.account.homePage &&
        actor.account.name === agent.account.name
      );
    }
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidIRI(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function isValidISO8601(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime());
}

function isValidISO8601Duration(str: string): boolean {
  // ISO 8601 duration: P[n]Y[n]M[n]DT[n]H[n]M[n]S
  const durationRegex = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/;
  return durationRegex.test(str);
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

export function createAgent(opts: {
  email?: string;
  name?: string;
  account?: { homePage: string; name: string };
}): XapiAgent {
  const agent: XapiAgent = { objectType: 'Agent' };

  if (opts.name) agent.name = opts.name;
  if (opts.email) agent.mbox = `mailto:${opts.email}`;
  if (opts.account) agent.account = opts.account;

  return agent;
}

export function createActivity(opts: {
  id: string;
  name?: string | Record<string, string>;
  description?: string | Record<string, string>;
  type?: string;
  extensions?: Record<string, unknown>;
}): XapiActivity {
  const activity: XapiActivity = {
    objectType: 'Activity',
    id: opts.id,
  };

  if (opts.name || opts.description || opts.type || opts.extensions) {
    activity.definition = {};
    if (opts.name) {
      activity.definition.name = typeof opts.name === 'string' ? { 'en-US': opts.name } : opts.name;
    }
    if (opts.description) {
      activity.definition.description =
        typeof opts.description === 'string' ? { 'en-US': opts.description } : opts.description;
    }
    if (opts.type) activity.definition.type = opts.type;
    if (opts.extensions) activity.definition.extensions = opts.extensions;
  }

  return activity;
}

export function createResult(opts: {
  score?: { raw?: number; min?: number; max?: number; scaled?: number };
  success?: boolean;
  completion?: boolean;
  duration?: string | number; // seconds if number
  response?: string;
  extensions?: Record<string, unknown>;
}): XapiResult {
  const result: XapiResult = {};

  if (opts.score) result.score = opts.score;
  if (opts.success !== undefined) result.success = opts.success;
  if (opts.completion !== undefined) result.completion = opts.completion;
  if (opts.response) result.response = opts.response;
  if (opts.extensions) result.extensions = opts.extensions;

  if (opts.duration) {
    if (typeof opts.duration === 'number') {
      // Convert seconds to ISO 8601 duration
      const hours = Math.floor(opts.duration / 3600);
      const minutes = Math.floor((opts.duration % 3600) / 60);
      const seconds = opts.duration % 60;

      let iso = 'PT';
      if (hours > 0) iso += `${hours}H`;
      if (minutes > 0) iso += `${minutes}M`;
      if (seconds > 0 || (hours === 0 && minutes === 0)) iso += `${seconds}S`;

      result.duration = iso;
    } else {
      result.duration = opts.duration;
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const xapiService = new XapiStatementService();
