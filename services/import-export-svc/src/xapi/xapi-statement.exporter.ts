// ══════════════════════════════════════════════════════════════════════════════
// xAPI STATEMENT EXPORTER - Exports learning data as xAPI statements
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportResult, XAPIExportOptions } from '../export/export.types';

// xAPI Statement Types
interface XAPIStatement {
  id: string;
  actor: XAPIActor;
  verb: XAPIVerb;
  object: XAPIObject;
  result?: XAPIResult;
  context?: XAPIContext;
  timestamp: string;
  stored?: string;
  authority?: XAPIActor;
}

interface XAPIActor {
  objectType?: 'Agent' | 'Group';
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: { homePage: string; name: string };
}

interface XAPIVerb {
  id: string;
  display: { [lang: string]: string };
}

interface XAPIObject {
  objectType?: 'Activity' | 'Agent' | 'Group' | 'SubStatement' | 'StatementRef';
  id: string;
  definition?: {
    type?: string;
    name?: { [lang: string]: string };
    description?: { [lang: string]: string };
    extensions?: Record<string, any>;
  };
}

interface XAPIResult {
  score?: { scaled?: number; raw?: number; min?: number; max?: number };
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;
  extensions?: Record<string, any>;
}

interface XAPIContext {
  registration?: string;
  instructor?: XAPIActor;
  team?: XAPIActor;
  contextActivities?: {
    parent?: XAPIObject[];
    grouping?: XAPIObject[];
    category?: XAPIObject[];
    other?: XAPIObject[];
  };
  revision?: string;
  platform?: string;
  language?: string;
  statement?: { objectType: 'StatementRef'; id: string };
  extensions?: Record<string, any>;
}

// Standard xAPI Verbs
const XAPI_VERBS = {
  initialized: { id: 'http://adlnet.gov/expapi/verbs/initialized', display: { 'en-US': 'initialized' } },
  completed: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
  passed: { id: 'http://adlnet.gov/expapi/verbs/passed', display: { 'en-US': 'passed' } },
  failed: { id: 'http://adlnet.gov/expapi/verbs/failed', display: { 'en-US': 'failed' } },
  attempted: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: { 'en-US': 'attempted' } },
  experienced: { id: 'http://adlnet.gov/expapi/verbs/experienced', display: { 'en-US': 'experienced' } },
  answered: { id: 'http://adlnet.gov/expapi/verbs/answered', display: { 'en-US': 'answered' } },
  progressed: { id: 'http://adlnet.gov/expapi/verbs/progressed', display: { 'en-US': 'progressed' } },
  scored: { id: 'http://adlnet.gov/expapi/verbs/scored', display: { 'en-US': 'scored' } },
  terminated: { id: 'http://adlnet.gov/expapi/verbs/terminated', display: { 'en-US': 'terminated' } },
};

const XAPI_ACTIVITY_TYPES = {
  course: 'http://adlnet.gov/expapi/activities/course',
  module: 'http://adlnet.gov/expapi/activities/module',
  lesson: 'http://adlnet.gov/expapi/activities/lesson',
  assessment: 'http://adlnet.gov/expapi/activities/assessment',
  question: 'http://adlnet.gov/expapi/activities/question',
};

@Injectable()
export class XAPIExporter {
  private readonly logger = new Logger(XAPIExporter.name);
  private baseIRI: string;

  constructor(private prisma: PrismaService) {
    this.baseIRI = process.env.XAPI_BASE_IRI || 'https://aivo.education';
  }

  async export(
    tenantId: string,
    contentIds: string[],
    options: XAPIExportOptions = {}
  ): Promise<ExportResult> {
    this.logger.log('Starting xAPI export', { tenantId, contentCount: contentIds.length });
    options.onProgress?.(5, 'Loading learning records...');

    // Load learning activity data
    const statements = await this.generateStatements(tenantId, contentIds, options);
    options.onProgress?.(80, 'Formatting output...');

    // Format output based on options
    const output = options.format === 'json-lines'
      ? statements.map(s => JSON.stringify(s)).join('\n')
      : JSON.stringify({ statements }, null, 2);

    const buffer = Buffer.from(output, 'utf-8');
    const ext = options.format === 'json-lines' ? 'jsonl' : 'json';

    options.onProgress?.(100, 'Complete');

    return {
      buffer,
      fileName: `xapi_statements_${Date.now()}.${ext}`,
      fileSize: buffer.length,
      contentType: 'application/json',
      metadata: { statementCount: statements.length },
      warnings: [],
    };
  }

  private async generateStatements(
    tenantId: string,
    contentIds: string[],
    options: XAPIExportOptions
  ): Promise<XAPIStatement[]> {
    const statements: XAPIStatement[] = [];
    const { startDate, endDate, actorId } = options;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Load SCORM attempts
    const scormAttempts = await this.prisma.scormAttempt.findMany({
      where: {
        tenantId,
        packageId: { in: contentIds },
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        ...(actorId ? { userId: actorId } : {}),
      },
      include: { user: true, package: true },
    });

    for (const attempt of scormAttempts) {
      statements.push(...this.convertScormAttempt(attempt));
    }

    // Load assessment results
    const assessmentResults = await this.prisma.assessmentResult.findMany({
      where: {
        tenantId,
        assessmentId: { in: contentIds },
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        ...(actorId ? { userId: actorId } : {}),
      },
      include: { user: true, assessment: true, answers: { include: { question: true } } },
    });

    for (const result of assessmentResults) {
      statements.push(...this.convertAssessmentResult(result));
    }

    // Load lesson progress
    const lessonProgress = await this.prisma.lessonProgress.findMany({
      where: {
        tenantId,
        lessonId: { in: contentIds },
        ...(Object.keys(dateFilter).length ? { updatedAt: dateFilter } : {}),
        ...(actorId ? { userId: actorId } : {}),
      },
      include: { user: true, lesson: true },
    });

    for (const progress of lessonProgress) {
      statements.push(...this.convertLessonProgress(progress));
    }

    return statements;
  }

  private convertScormAttempt(attempt: any): XAPIStatement[] {
    const statements: XAPIStatement[] = [];
    const actor = this.createActor(attempt.user);
    const activity = this.createActivity(
      attempt.package.id,
      attempt.package.title,
      'course',
      attempt.package.description
    );

    // Initialized statement
    statements.push({
      id: `${attempt.id}-init`,
      actor,
      verb: XAPI_VERBS.initialized,
      object: activity,
      timestamp: attempt.createdAt.toISOString(),
      context: this.createContext(attempt.tenantId),
    });

    // Completion/result statement
    if (attempt.completionStatus === 'completed') {
      const verb = attempt.successStatus === 'passed' ? XAPI_VERBS.passed
        : attempt.successStatus === 'failed' ? XAPI_VERBS.failed
        : XAPI_VERBS.completed;

      statements.push({
        id: `${attempt.id}-complete`,
        actor,
        verb,
        object: activity,
        result: {
          score: attempt.scoreScaled ? {
            scaled: attempt.scoreScaled,
            raw: attempt.scoreRaw,
            min: attempt.scoreMin,
            max: attempt.scoreMax,
          } : undefined,
          success: attempt.successStatus === 'passed',
          completion: true,
          duration: attempt.totalTime ? this.formatDuration(attempt.totalTime) : undefined,
        },
        timestamp: attempt.updatedAt.toISOString(),
        context: this.createContext(attempt.tenantId),
      });
    }

    return statements;
  }

  private convertAssessmentResult(result: any): XAPIStatement[] {
    const statements: XAPIStatement[] = [];
    const actor = this.createActor(result.user);
    const activity = this.createActivity(
      result.assessment.id,
      result.assessment.title,
      'assessment'
    );

    // Attempted statement
    statements.push({
      id: `${result.id}-attempt`,
      actor,
      verb: XAPI_VERBS.attempted,
      object: activity,
      timestamp: result.createdAt.toISOString(),
      context: this.createContext(result.tenantId),
    });

    // Individual answer statements
    for (const answer of result.answers || []) {
      const questionActivity = this.createActivity(
        answer.question.id,
        answer.question.text?.substring(0, 100) || 'Question',
        'question'
      );

      statements.push({
        id: `${result.id}-q-${answer.questionId}`,
        actor,
        verb: XAPI_VERBS.answered,
        object: questionActivity,
        result: {
          success: answer.isCorrect,
          response: JSON.stringify(answer.response),
        },
        context: {
          ...this.createContext(result.tenantId),
          contextActivities: { parent: [activity] },
        },
        timestamp: answer.createdAt?.toISOString() || result.createdAt.toISOString(),
      });
    }

    // Final score statement
    if (result.score !== null) {
      const maxScore = result.maxScore || 100;
      statements.push({
        id: `${result.id}-score`,
        actor,
        verb: result.passed ? XAPI_VERBS.passed : XAPI_VERBS.failed,
        object: activity,
        result: {
          score: { scaled: result.score / maxScore, raw: result.score, max: maxScore, min: 0 },
          success: result.passed,
          completion: true,
          duration: result.duration ? this.formatDuration(result.duration) : undefined,
        },
        timestamp: result.completedAt?.toISOString() || result.updatedAt.toISOString(),
        context: this.createContext(result.tenantId),
      });
    }

    return statements;
  }

  private convertLessonProgress(progress: any): XAPIStatement[] {
    const statements: XAPIStatement[] = [];
    const actor = this.createActor(progress.user);
    const activity = this.createActivity(progress.lesson.id, progress.lesson.title, 'lesson');

    if (progress.startedAt) {
      statements.push({
        id: `${progress.id}-start`,
        actor,
        verb: XAPI_VERBS.initialized,
        object: activity,
        timestamp: progress.startedAt.toISOString(),
        context: this.createContext(progress.tenantId),
      });
    }

    if (progress.progress > 0 && progress.progress < 100) {
      statements.push({
        id: `${progress.id}-progress`,
        actor,
        verb: XAPI_VERBS.progressed,
        object: activity,
        result: { extensions: { 'http://aivo.education/xapi/extensions/progress': progress.progress } },
        timestamp: progress.updatedAt.toISOString(),
        context: this.createContext(progress.tenantId),
      });
    }

    if (progress.completedAt) {
      statements.push({
        id: `${progress.id}-complete`,
        actor,
        verb: XAPI_VERBS.completed,
        object: activity,
        result: { completion: true },
        timestamp: progress.completedAt.toISOString(),
        context: this.createContext(progress.tenantId),
      });
    }

    return statements;
  }

  private createActor(user: any): XAPIActor {
    return {
      objectType: 'Agent',
      name: user.name || user.email,
      account: { homePage: this.baseIRI, name: user.id },
    };
  }

  private createActivity(id: string, name: string, type: keyof typeof XAPI_ACTIVITY_TYPES, description?: string): XAPIObject {
    return {
      objectType: 'Activity',
      id: `${this.baseIRI}/activities/${type}/${id}`,
      definition: {
        type: XAPI_ACTIVITY_TYPES[type],
        name: { 'en-US': name },
        ...(description ? { description: { 'en-US': description } } : {}),
      },
    };
  }

  private createContext(tenantId: string): XAPIContext {
    return {
      platform: 'AIVO',
      extensions: { 'http://aivo.education/xapi/extensions/tenant': tenantId },
    };
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `PT${h ? h + 'H' : ''}${m ? m + 'M' : ''}${s}S`;
  }
}
