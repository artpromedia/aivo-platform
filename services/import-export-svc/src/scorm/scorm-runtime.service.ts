/**
 * SCORM Runtime Service
 *
 * Implements the SCORM 1.2 and 2004 runtime API:
 * - LMSInitialize / Initialize
 * - LMSGetValue / GetValue
 * - LMSSetValue / SetValue
 * - LMSCommit / Commit
 * - LMSFinish / Terminate
 * - LMSGetLastError / GetLastError
 * - LMSGetErrorString / GetErrorString
 * - LMSGetDiagnostic / GetDiagnostic
 *
 * Manages learner data model (CMI) and tracks progress via Redis for sessions
 * and Prisma for persistence.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';

/**
 * SCORM version enum
 */
export type SCORMVersion = '1.2' | '2004';

/**
 * SCORM error codes
 */
const SCORM_ERRORS = {
  // SCORM 2004 Error Codes
  '0': 'No Error',
  '101': 'General Exception',
  '102': 'General Initialization Failure',
  '103': 'Already Initialized',
  '104': 'Content Instance Terminated',
  '111': 'General Termination Failure',
  '112': 'Termination Before Initialization',
  '113': 'Termination After Termination',
  '122': 'Retrieve Data Before Initialization',
  '123': 'Retrieve Data After Termination',
  '132': 'Store Data Before Initialization',
  '133': 'Store Data After Termination',
  '142': 'Commit Before Initialization',
  '143': 'Commit After Termination',
  '201': 'General Argument Error',
  '301': 'General Get Failure',
  '351': 'General Set Failure',
  '391': 'General Commit Failure',
  '401': 'Undefined Data Model Element',
  '402': 'Unimplemented Data Model Element',
  '403': 'Data Model Element Value Not Initialized',
  '404': 'Data Model Element Is Read Only',
  '405': 'Data Model Element Is Write Only',
  '406': 'Data Model Element Type Mismatch',
  '407': 'Data Model Element Value Out Of Range',
  '408': 'Data Model Dependency Not Established',

  // SCORM 1.2 Error Codes (mapped to 2004 equivalents where applicable)
  '201_12': 'Invalid argument error',
  '202': 'Element cannot have children',
  '203': 'Element not an array. Cannot have count',
  '301_12': 'Not initialized',
  '401_12': 'Not implemented error',
  '402_12': 'Invalid set value, element is a keyword',
  '403_12': 'Element is read only',
  '404_12': 'Element is write only',
  '405_12': 'Incorrect Data Type',
} as const;

/**
 * CMI Data Model for SCORM 1.2
 */
interface CMI12 {
  _version?: string;
  core: {
    student_id: string;
    student_name: string;
    lesson_location: string;
    credit: 'credit' | 'no-credit';
    lesson_status: 'passed' | 'completed' | 'failed' | 'incomplete' | 'browsed' | 'not attempted';
    entry: 'ab-initio' | 'resume' | '';
    score: {
      raw: string;
      min: string;
      max: string;
    };
    total_time: string;
    lesson_mode: 'browse' | 'normal' | 'review';
    exit: 'time-out' | 'suspend' | 'logout' | '';
    session_time: string;
  };
  suspend_data: string;
  launch_data: string;
  comments: string;
  comments_from_lms: string;
  objectives?: CMI12Objective[];
  student_data?: {
    mastery_score: string;
    max_time_allowed: string;
    time_limit_action: string;
  };
  student_preference?: {
    audio: string;
    language: string;
    speed: string;
    text: string;
  };
  interactions?: CMI12Interaction[];
}

interface CMI12Objective {
  id: string;
  score: {
    raw: string;
    min: string;
    max: string;
  };
  status: string;
}

interface CMI12Interaction {
  id: string;
  objectives?: { id: string }[];
  time: string;
  type: string;
  correct_responses?: { pattern: string }[];
  weighting: string;
  student_response: string;
  result: string;
  latency: string;
}

/**
 * CMI Data Model for SCORM 2004
 */
interface CMI2004 {
  _version?: string;
  completion_status: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
  completion_threshold?: string;
  credit: 'credit' | 'no-credit';
  entry: 'ab-initio' | 'resume' | '';
  exit: 'time-out' | 'suspend' | 'logout' | 'normal' | '';
  launch_data: string;
  learner_id: string;
  learner_name: string;
  learner_preference?: {
    audio_level: string;
    language: string;
    delivery_speed: string;
    audio_captioning: string;
  };
  location: string;
  max_time_allowed?: string;
  mode: 'browse' | 'normal' | 'review';
  progress_measure?: string;
  scaled_passing_score?: string;
  score?: {
    scaled: string;
    raw: string;
    min: string;
    max: string;
  };
  session_time: string;
  success_status: 'passed' | 'failed' | 'unknown';
  suspend_data: string;
  time_limit_action?: string;
  total_time: string;
  objectives?: CMI2004Objective[];
  interactions?: CMI2004Interaction[];
  comments_from_learner?: CMI2004Comment[];
  comments_from_lms?: CMI2004Comment[];
}

interface CMI2004Objective {
  id: string;
  score?: {
    scaled: string;
    raw: string;
    min: string;
    max: string;
  };
  success_status: 'passed' | 'failed' | 'unknown';
  completion_status: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
  progress_measure?: string;
  description?: string;
}

interface CMI2004Interaction {
  id: string;
  type: string;
  objectives?: { id: string }[];
  timestamp: string;
  correct_responses?: { pattern: string }[];
  weighting: string;
  learner_response: string;
  result: string;
  latency: string;
  description?: string;
}

interface CMI2004Comment {
  comment: string;
  location?: string;
  timestamp?: string;
}

/**
 * Runtime session
 */
interface RuntimeSession {
  id: string;
  learnerId: string;
  packageId: string;
  scoId: string;
  tenantId: string;
  version: SCORMVersion;
  initialized: boolean;
  terminated: boolean;
  startTime: Date;
  lastError: string;
  cmi: CMI12 | CMI2004;
}

@Injectable()
export class SCORMRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SCORMRuntimeService.name);
  private readonly redis: Redis;
  private readonly sessionTTL = 60 * 60 * 4; // 4 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const password = this.config.get<string>('REDIS_PASSWORD');
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST') ?? 'localhost',
      port: this.config.get<number>('REDIS_PORT') ?? 6379,
      ...(password ? { password } : {}),
      keyPrefix: 'scorm:session:',
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('SCORM Runtime Service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Create a new SCORM runtime session
   */
  async createSession(
    learnerId: string,
    packageId: string,
    scoId: string,
    tenantId: string,
    version: SCORMVersion
  ): Promise<{ sessionId: string; apiUrl: string }> {
    const sessionId = uuidv4();

    // Load learner data
    const learner = await this.prisma.user.findUnique({
      where: { id: learnerId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!learner) {
      throw new Error('Learner not found');
    }

    // Load previous attempt data
    const previousAttempt = await this.prisma.scormAttempt.findFirst({
      where: { learnerId, scoId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Initialize CMI data model
    const cmi = this.initializeCMI(
      version,
      learner,
      previousAttempt?.cmiData as Record<string, unknown> | null
    );

    const session: RuntimeSession = {
      id: sessionId,
      learnerId,
      packageId,
      scoId,
      tenantId,
      version,
      initialized: false,
      terminated: false,
      startTime: new Date(),
      lastError: '0',
      cmi,
    };

    // Store in Redis
    await this.redis.setex(sessionId, this.sessionTTL, JSON.stringify(session));

    // Generate API URL
    const baseUrl = this.config.get<string>('API_BASE_URL') ?? 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/scorm/runtime/${sessionId}`;

    return { sessionId, apiUrl };
  }

  /**
   * Initialize CMI data model
   */
  private initializeCMI(
    version: SCORMVersion,
    learner: { id: string; firstName: string | null; lastName: string | null },
    previousData: Record<string, unknown> | null
  ): CMI12 | CMI2004 {
    const learnerName = `${learner.lastName ?? ''}, ${learner.firstName ?? ''}`.trim();
    const hasResume = previousData !== null;

    if (version === '1.2') {
      const cmi: CMI12 = {
        core: {
          student_id: learner.id,
          student_name: learnerName,
          lesson_location: '',
          credit: 'credit',
          lesson_status: 'not attempted',
          entry: hasResume ? 'resume' : 'ab-initio',
          score: { raw: '', min: '', max: '' },
          total_time: '0000:00:00',
          lesson_mode: 'normal',
          exit: '',
          session_time: '0000:00:00',
        },
        suspend_data: '',
        launch_data: '',
        comments: '',
        comments_from_lms: '',
        objectives: [],
        interactions: [],
      };

      // Restore previous data
      if (previousData) {
        this.restoreCMI12(cmi, previousData);
      }

      return cmi;
    } else {
      const cmi: CMI2004 = {
        completion_status: 'not attempted',
        credit: 'credit',
        entry: hasResume ? 'resume' : 'ab-initio',
        exit: '',
        launch_data: '',
        learner_id: learner.id,
        learner_name: learnerName,
        location: '',
        mode: 'normal',
        score: { scaled: '', raw: '', min: '', max: '' },
        session_time: 'PT0S',
        success_status: 'unknown',
        suspend_data: '',
        total_time: 'PT0S',
        objectives: [],
        interactions: [],
        comments_from_learner: [],
        comments_from_lms: [],
      };

      // Restore previous data
      if (previousData) {
        this.restoreCMI2004(cmi, previousData);
      }

      return cmi;
    }
  }

  /**
   * Restore CMI 1.2 from previous data
   */
  private restoreCMI12(cmi: CMI12, data: Record<string, unknown>): void {
    const prevCore = data['core'] as Record<string, unknown> | undefined;
    if (prevCore) {
      cmi.core.lesson_location = (prevCore['lesson_location'] as string) ?? '';
      cmi.core.lesson_status = (prevCore['lesson_status'] as CMI12['core']['lesson_status']) ?? 'not attempted';
      cmi.core.total_time = (prevCore['total_time'] as string) ?? '0000:00:00';

      const prevScore = prevCore['score'] as Record<string, string> | undefined;
      if (prevScore) {
        cmi.core.score = {
          raw: prevScore['raw'] ?? '',
          min: prevScore['min'] ?? '',
          max: prevScore['max'] ?? '',
        };
      }
    }

    cmi.suspend_data = (data['suspend_data'] as string) ?? '';
    cmi.objectives = (data['objectives'] as CMI12Objective[]) ?? [];
    cmi.interactions = (data['interactions'] as CMI12Interaction[]) ?? [];
  }

  /**
   * Restore CMI 2004 from previous data
   */
  private restoreCMI2004(cmi: CMI2004, data: Record<string, unknown>): void {
    cmi.completion_status = (data['completion_status'] as CMI2004['completion_status']) ?? 'not attempted';
    cmi.success_status = (data['success_status'] as CMI2004['success_status']) ?? 'unknown';
    cmi.location = (data['location'] as string) ?? '';
    cmi.total_time = (data['total_time'] as string) ?? 'PT0S';
    cmi.suspend_data = (data['suspend_data'] as string) ?? '';
    
    const progressMeasure = data['progress_measure'] as string | undefined;
    if (progressMeasure !== undefined) {
      cmi.progress_measure = progressMeasure;
    }

    const prevScore = data['score'] as Record<string, string> | undefined;
    if (prevScore) {
      cmi.score = {
        scaled: prevScore['scaled'] ?? '',
        raw: prevScore['raw'] ?? '',
        min: prevScore['min'] ?? '',
        max: prevScore['max'] ?? '',
      };
    }

    cmi.objectives = (data['objectives'] as CMI2004Objective[]) ?? [];
    cmi.interactions = (data['interactions'] as CMI2004Interaction[]) ?? [];
  }

  // ============================================================================
  // SCORM API IMPLEMENTATION
  // ============================================================================

  /**
   * Initialize / LMSInitialize
   */
  async initialize(sessionId: string): Promise<'true' | 'false'> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return 'false';
    }

    if (session.terminated) {
      session.lastError = '104'; // Content Instance Terminated
      await this.saveSession(session);
      return 'false';
    }

    if (session.initialized) {
      session.lastError = '103'; // Already Initialized
      await this.saveSession(session);
      return 'false';
    }

    session.initialized = true;
    session.startTime = new Date();
    session.lastError = '0';
    await this.saveSession(session);

    this.logger.log(`SCORM session initialized: ${sessionId}`);
    return 'true';
  }

  /**
   * Terminate / LMSFinish
   */
  async terminate(sessionId: string): Promise<'true' | 'false'> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return 'false';
    }

    if (!session.initialized) {
      session.lastError = '112'; // Termination Before Initialization
      await this.saveSession(session);
      return 'false';
    }

    if (session.terminated) {
      session.lastError = '113'; // Termination After Termination
      await this.saveSession(session);
      return 'false';
    }

    // Calculate and update total time
    this.updateTotalTime(session);

    // Persist data to database
    await this.persistSessionData(session);

    session.terminated = true;
    session.lastError = '0';
    await this.saveSession(session);

    this.logger.log(`SCORM session terminated: ${sessionId}`);
    return 'true';
  }

  /**
   * GetValue / LMSGetValue
   */
  async getValue(sessionId: string, element: string): Promise<string> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return '';
    }

    if (!session.initialized) {
      session.lastError = session.version === '1.2' ? '301_12' : '122';
      await this.saveSession(session);
      return '';
    }

    if (session.terminated) {
      session.lastError = '123';
      await this.saveSession(session);
      return '';
    }

    try {
      const value = this.getCMIValue(session, element);
      session.lastError = '0';
      await this.saveSession(session);
      return value;
    } catch (error) {
      const errorCode = (error as { code?: string }).code ?? '401';
      session.lastError = errorCode;
      await this.saveSession(session);
      return '';
    }
  }

  /**
   * SetValue / LMSSetValue
   */
  async setValue(
    sessionId: string,
    element: string,
    value: string
  ): Promise<'true' | 'false'> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return 'false';
    }

    if (!session.initialized) {
      session.lastError = session.version === '1.2' ? '301_12' : '132';
      await this.saveSession(session);
      return 'false';
    }

    if (session.terminated) {
      session.lastError = '133';
      await this.saveSession(session);
      return 'false';
    }

    try {
      this.setCMIValue(session, element, value);
      session.lastError = '0';
      await this.saveSession(session);
      return 'true';
    } catch (error) {
      const errorCode = (error as { code?: string }).code ?? '351';
      session.lastError = errorCode;
      await this.saveSession(session);
      return 'false';
    }
  }

  /**
   * Commit / LMSCommit
   */
  async commit(sessionId: string): Promise<'true' | 'false'> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return 'false';
    }

    if (!session.initialized) {
      session.lastError = '142';
      await this.saveSession(session);
      return 'false';
    }

    if (session.terminated) {
      session.lastError = '143';
      await this.saveSession(session);
      return 'false';
    }

    // Persist data
    try {
      await this.persistSessionData(session);
      session.lastError = '0';
      await this.saveSession(session);
      return 'true';
    } catch (error) {
      session.lastError = '391';
      await this.saveSession(session);
      return 'false';
    }
  }

  /**
   * GetLastError / LMSGetLastError
   */
  async getLastError(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    return session?.lastError ?? '0';
  }

  /**
   * GetErrorString / LMSGetErrorString
   */
  getErrorString(errorCode: string): string {
    return SCORM_ERRORS[errorCode as keyof typeof SCORM_ERRORS] ?? 'Unknown Error';
  }

  /**
   * GetDiagnostic / LMSGetDiagnostic
   */
  async getDiagnostic(sessionId: string, _errorCode: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return 'Session not found';
    }

    return this.getErrorString(session.lastError);
  }

  // ============================================================================
  // CMI DATA MODEL ACCESS
  // ============================================================================

  /**
   * Get CMI value by element path
   */
  private getCMIValue(session: RuntimeSession, element: string): string {
    const parts = element.split('.');
    let current: unknown = session.cmi;

    // Map element paths based on version
    if (session.version === '1.2') {
      return this.getCMI12Value(session.cmi as CMI12, parts);
    } else {
      return this.getCMI2004Value(session.cmi as CMI2004, parts);
    }
  }

  /**
   * Get CMI 1.2 value
   */
  private getCMI12Value(cmi: CMI12, parts: string[]): string {
    if (parts[0] !== 'cmi') {
      throw { code: '401' };
    }

    const path = parts.slice(1).join('.');

    // Handle special elements
    if (path === '_version') return '3.4';

    // Handle core elements
    if (path.startsWith('core.')) {
      const corePath = path.substring(5);
      if (corePath === 'student_id') return cmi.core.student_id;
      if (corePath === 'student_name') return cmi.core.student_name;
      if (corePath === 'lesson_location') return cmi.core.lesson_location;
      if (corePath === 'credit') return cmi.core.credit;
      if (corePath === 'lesson_status') return cmi.core.lesson_status;
      if (corePath === 'entry') return cmi.core.entry;
      if (corePath === 'score.raw') return cmi.core.score.raw;
      if (corePath === 'score.min') return cmi.core.score.min;
      if (corePath === 'score.max') return cmi.core.score.max;
      if (corePath === 'score._children') return 'raw,min,max';
      if (corePath === 'total_time') return cmi.core.total_time;
      if (corePath === 'lesson_mode') return cmi.core.lesson_mode;
      if (corePath === 'exit') throw { code: '404_12' }; // Write only
      if (corePath === 'session_time') throw { code: '404_12' }; // Write only
      if (corePath === '_children')
        return 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time';
    }

    if (path === 'suspend_data') return cmi.suspend_data;
    if (path === 'launch_data') return cmi.launch_data;
    if (path === 'comments') return cmi.comments;
    if (path === 'comments_from_lms') return cmi.comments_from_lms;

    // Handle objectives
    if (path.startsWith('objectives.')) {
      return this.getObjective12Value(cmi.objectives ?? [], path.substring(11));
    }

    // Handle interactions
    if (path.startsWith('interactions.')) {
      return this.getInteraction12Value(
        cmi.interactions ?? [],
        path.substring(13)
      );
    }

    throw { code: '401' };
  }

  /**
   * Get CMI 2004 value
   */
  private getCMI2004Value(cmi: CMI2004, parts: string[]): string {
    if (parts[0] !== 'cmi') {
      throw { code: '401' };
    }

    const path = parts.slice(1).join('.');

    // Handle simple elements
    if (path === '_version') return '1.0';
    if (path === 'completion_status') return cmi.completion_status;
    if (path === 'completion_threshold') return cmi.completion_threshold ?? '';
    if (path === 'credit') return cmi.credit;
    if (path === 'entry') return cmi.entry;
    if (path === 'exit') throw { code: '405' }; // Write only
    if (path === 'launch_data') return cmi.launch_data;
    if (path === 'learner_id') return cmi.learner_id;
    if (path === 'learner_name') return cmi.learner_name;
    if (path === 'location') return cmi.location;
    if (path === 'max_time_allowed') return cmi.max_time_allowed ?? '';
    if (path === 'mode') return cmi.mode;
    if (path === 'progress_measure') return cmi.progress_measure ?? '';
    if (path === 'scaled_passing_score') return cmi.scaled_passing_score ?? '';
    if (path === 'session_time') throw { code: '405' }; // Write only
    if (path === 'success_status') return cmi.success_status;
    if (path === 'suspend_data') return cmi.suspend_data;
    if (path === 'time_limit_action') return cmi.time_limit_action ?? '';
    if (path === 'total_time') return cmi.total_time;

    // Handle score
    if (path.startsWith('score.')) {
      const scorePath = path.substring(6);
      if (!cmi.score) return '';
      if (scorePath === 'scaled') return cmi.score.scaled;
      if (scorePath === 'raw') return cmi.score.raw;
      if (scorePath === 'min') return cmi.score.min;
      if (scorePath === 'max') return cmi.score.max;
      if (scorePath === '_children') return 'scaled,raw,min,max';
    }

    // Handle learner_preference
    if (path.startsWith('learner_preference.')) {
      const prefPath = path.substring(19);
      if (!cmi.learner_preference) return '';
      if (prefPath === 'audio_level') return cmi.learner_preference.audio_level;
      if (prefPath === 'language') return cmi.learner_preference.language;
      if (prefPath === 'delivery_speed')
        return cmi.learner_preference.delivery_speed;
      if (prefPath === 'audio_captioning')
        return cmi.learner_preference.audio_captioning;
      if (prefPath === '_children')
        return 'audio_level,language,delivery_speed,audio_captioning';
    }

    // Handle objectives
    if (path.startsWith('objectives.')) {
      return this.getObjective2004Value(
        cmi.objectives ?? [],
        path.substring(11)
      );
    }

    // Handle interactions
    if (path.startsWith('interactions.')) {
      return this.getInteraction2004Value(
        cmi.interactions ?? [],
        path.substring(13)
      );
    }

    // Handle comments
    if (path.startsWith('comments_from_learner.')) {
      return this.getComment2004Value(
        cmi.comments_from_learner ?? [],
        path.substring(22)
      );
    }

    if (path.startsWith('comments_from_lms.')) {
      return this.getComment2004Value(
        cmi.comments_from_lms ?? [],
        path.substring(18)
      );
    }

    throw { code: '401' };
  }

  /**
   * Set CMI value
   */
  private setCMIValue(
    session: RuntimeSession,
    element: string,
    value: string
  ): void {
    const parts = element.split('.');

    if (session.version === '1.2') {
      this.setCMI12Value(session.cmi as CMI12, parts, value);
    } else {
      this.setCMI2004Value(session.cmi as CMI2004, parts, value);
    }
  }

  /**
   * Set CMI 1.2 value
   */
  private setCMI12Value(cmi: CMI12, parts: string[], value: string): void {
    if (parts[0] !== 'cmi') {
      throw { code: '401' };
    }

    const path = parts.slice(1).join('.');

    // Core elements
    if (path === 'core.lesson_location') {
      cmi.core.lesson_location = value;
      return;
    }
    if (path === 'core.lesson_status') {
      if (!this.isValidLessonStatus12(value)) throw { code: '405_12' };
      cmi.core.lesson_status = value as CMI12['core']['lesson_status'];
      return;
    }
    if (path === 'core.score.raw') {
      cmi.core.score.raw = value;
      return;
    }
    if (path === 'core.score.min') {
      cmi.core.score.min = value;
      return;
    }
    if (path === 'core.score.max') {
      cmi.core.score.max = value;
      return;
    }
    if (path === 'core.exit') {
      cmi.core.exit = value as CMI12['core']['exit'];
      return;
    }
    if (path === 'core.session_time') {
      cmi.core.session_time = value;
      return;
    }

    // Read-only core elements
    if (path.startsWith('core.student_')) throw { code: '403_12' };
    if (path === 'core.credit') throw { code: '403_12' };
    if (path === 'core.entry') throw { code: '403_12' };
    if (path === 'core.total_time') throw { code: '403_12' };
    if (path === 'core.lesson_mode') throw { code: '403_12' };

    // Other elements
    if (path === 'suspend_data') {
      cmi.suspend_data = value;
      return;
    }
    if (path === 'comments') {
      cmi.comments = value;
      return;
    }

    // Objectives
    if (path.startsWith('objectives.')) {
      this.setObjective12Value(cmi, path.substring(11), value);
      return;
    }

    // Interactions
    if (path.startsWith('interactions.')) {
      this.setInteraction12Value(cmi, path.substring(13), value);
      return;
    }

    throw { code: '401' };
  }

  /**
   * Set CMI 2004 value
   */
  private setCMI2004Value(cmi: CMI2004, parts: string[], value: string): void {
    if (parts[0] !== 'cmi') {
      throw { code: '401' };
    }

    const path = parts.slice(1).join('.');

    // Writeable elements
    if (path === 'completion_status') {
      if (!this.isValidCompletionStatus2004(value)) throw { code: '406' };
      cmi.completion_status = value as CMI2004['completion_status'];
      return;
    }
    if (path === 'exit') {
      cmi.exit = value as CMI2004['exit'];
      return;
    }
    if (path === 'location') {
      cmi.location = value;
      return;
    }
    if (path === 'progress_measure') {
      cmi.progress_measure = value;
      return;
    }
    if (path === 'session_time') {
      cmi.session_time = value;
      return;
    }
    if (path === 'success_status') {
      if (!this.isValidSuccessStatus2004(value)) throw { code: '406' };
      cmi.success_status = value as CMI2004['success_status'];
      return;
    }
    if (path === 'suspend_data') {
      cmi.suspend_data = value;
      return;
    }

    // Score
    if (path === 'score.scaled') {
      if (!cmi.score) cmi.score = { scaled: '', raw: '', min: '', max: '' };
      cmi.score.scaled = value;
      return;
    }
    if (path === 'score.raw') {
      if (!cmi.score) cmi.score = { scaled: '', raw: '', min: '', max: '' };
      cmi.score.raw = value;
      return;
    }
    if (path === 'score.min') {
      if (!cmi.score) cmi.score = { scaled: '', raw: '', min: '', max: '' };
      cmi.score.min = value;
      return;
    }
    if (path === 'score.max') {
      if (!cmi.score) cmi.score = { scaled: '', raw: '', min: '', max: '' };
      cmi.score.max = value;
      return;
    }

    // Learner preference
    if (path.startsWith('learner_preference.')) {
      if (!cmi.learner_preference) {
        cmi.learner_preference = {
          audio_level: '1',
          language: '',
          delivery_speed: '1',
          audio_captioning: '0',
        };
      }
      const prefPath = path.substring(19);
      if (prefPath === 'audio_level') {
        cmi.learner_preference.audio_level = value;
        return;
      }
      if (prefPath === 'language') {
        cmi.learner_preference.language = value;
        return;
      }
      if (prefPath === 'delivery_speed') {
        cmi.learner_preference.delivery_speed = value;
        return;
      }
      if (prefPath === 'audio_captioning') {
        cmi.learner_preference.audio_captioning = value;
        return;
      }
    }

    // Objectives
    if (path.startsWith('objectives.')) {
      this.setObjective2004Value(cmi, path.substring(11), value);
      return;
    }

    // Interactions
    if (path.startsWith('interactions.')) {
      this.setInteraction2004Value(cmi, path.substring(13), value);
      return;
    }

    // Comments from learner
    if (path.startsWith('comments_from_learner.')) {
      this.setComment2004Value(cmi, 'learner', path.substring(22), value);
      return;
    }

    // Read-only elements
    if (
      path === 'completion_threshold' ||
      path === 'credit' ||
      path === 'entry' ||
      path === 'launch_data' ||
      path === 'learner_id' ||
      path === 'learner_name' ||
      path === 'max_time_allowed' ||
      path === 'mode' ||
      path === 'scaled_passing_score' ||
      path === 'time_limit_action' ||
      path === 'total_time' ||
      path.startsWith('comments_from_lms.')
    ) {
      throw { code: '404' };
    }

    throw { code: '401' };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getSession(sessionId: string): Promise<RuntimeSession | null> {
    const data = await this.redis.get(sessionId);
    if (!data) return null;
    return JSON.parse(data) as RuntimeSession;
  }

  private async saveSession(session: RuntimeSession): Promise<void> {
    await this.redis.setex(
      session.id,
      this.sessionTTL,
      JSON.stringify(session)
    );
  }

  private updateTotalTime(session: RuntimeSession): void {
    const sessionDuration = Date.now() - new Date(session.startTime).getTime();

    if (session.version === '1.2') {
      const cmi = session.cmi as CMI12;
      const existingTotal = this.parseTime12(cmi.core.total_time);
      const sessionTime = this.parseTime12(cmi.core.session_time);
      const newTotal = existingTotal + sessionTime;
      cmi.core.total_time = this.formatTime12(newTotal);
    } else {
      const cmi = session.cmi as CMI2004;
      const existingTotal = this.parseISO8601Duration(cmi.total_time);
      const sessionTime = this.parseISO8601Duration(cmi.session_time);
      const newTotal = existingTotal + sessionTime;
      cmi.total_time = this.formatISO8601Duration(newTotal);
    }
  }

  private async persistSessionData(session: RuntimeSession): Promise<void> {
    // Determine completion and success
    let completionStatus: string;
    let successStatus: string;
    let score: number | null = null;

    if (session.version === '1.2') {
      const cmi = session.cmi as CMI12;
      const status = cmi.core.lesson_status;
      completionStatus =
        status === 'completed' || status === 'passed' || status === 'failed'
          ? 'completed'
          : 'incomplete';
      successStatus =
        status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'unknown';
      score = cmi.core.score.raw ? Number.parseFloat(cmi.core.score.raw) : null;
    } else {
      const cmi = session.cmi as CMI2004;
      completionStatus = cmi.completion_status;
      successStatus = cmi.success_status;
      score = cmi.score?.scaled ? Number.parseFloat(cmi.score.scaled) * 100 : null;
    }

    // Upsert attempt record
    await this.prisma.scormAttempt.upsert({
      where: {
        learnerId_scoId_tenantId: {
          learnerId: session.learnerId,
          scoId: session.scoId,
          tenantId: session.tenantId,
        },
      },
      create: {
        id: uuidv4(),
        learnerId: session.learnerId,
        scoId: session.scoId,
        tenantId: session.tenantId,
        packageId: session.packageId,
        completionStatus,
        successStatus,
        score,
        cmiData: session.cmi as unknown as Record<string, unknown>,
        attemptCount: 1,
        totalTime: session.version === '1.2'
          ? (session.cmi as CMI12).core.total_time
          : (session.cmi as CMI2004).total_time,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        completionStatus,
        successStatus,
        score,
        cmiData: session.cmi as unknown as Record<string, unknown>,
        totalTime: session.version === '1.2'
          ? (session.cmi as CMI12).core.total_time
          : (session.cmi as CMI2004).total_time,
        attemptCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    this.logger.log(`SCORM session data persisted: session=${session.id}, learner=${session.learnerId}, sco=${session.scoId}`);
  }

  // Time parsing/formatting helpers
  private parseTime12(time: string): number {
    const match = time.match(/^(\d{2,4}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
    if (!match) return 0;
    const hours = Number.parseInt(String(match[1] ?? '0'), 10);
    const minutes = Number.parseInt(String(match[2] ?? '0'), 10);
    const seconds = Number.parseInt(String(match[3] ?? '0'), 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private formatTime12(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(4, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private parseISO8601Duration(duration: string): number {
    const match = duration.match(
      /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
    );
    if (!match) return 0;
    const hours = Number.parseInt(match[4] ?? '0', 10);
    const minutes = Number.parseInt(match[5] ?? '0', 10);
    const seconds = Number.parseFloat(match[6] ?? '0');
    return hours * 3600 + minutes * 60 + seconds;
  }

  private formatISO8601Duration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let duration = 'PT';
    if (h > 0) duration += `${h}H`;
    if (m > 0) duration += `${m}M`;
    duration += `${s}S`;
    return duration;
  }

  // Validation helpers
  private isValidLessonStatus12(value: string): boolean {
    return [
      'passed',
      'completed',
      'failed',
      'incomplete',
      'browsed',
      'not attempted',
    ].includes(value);
  }

  private isValidCompletionStatus2004(value: string): boolean {
    return ['completed', 'incomplete', 'not attempted', 'unknown'].includes(
      value
    );
  }

  private isValidSuccessStatus2004(value: string): boolean {
    return ['passed', 'failed', 'unknown'].includes(value);
  }

  // Objective/Interaction accessors (simplified)
  private getObjective12Value(objectives: CMI12Objective[], path: string): string {
    if (path === '_count') return String(objectives.length);
    // Parse n.field pattern
    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];
    if (index >= objectives.length) throw { code: '403' };
    const obj = objectives[index];
    if (obj === undefined) throw { code: '401' };
    if (field === 'id') return obj.id;
    if (field === 'status') return obj.status;
    if (field === 'score.raw') return obj.score.raw;
    if (field === 'score.min') return obj.score.min;
    if (field === 'score.max') return obj.score.max;
    throw { code: '401' };
  }

  private getInteraction12Value(interactions: CMI12Interaction[], path: string): string {
    if (path === '_count') return String(interactions.length);
    // Similar pattern matching
    throw { code: '401' };
  }

  private getObjective2004Value(objectives: CMI2004Objective[], path: string): string {
    if (path === '_count') return String(objectives.length);
    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];
    if (index >= objectives.length) throw { code: '403' };
    const obj = objectives[index];
    if (obj === undefined) throw { code: '401' };
    if (field === 'id') return obj.id;
    if (field === 'success_status') return obj.success_status;
    if (field === 'completion_status') return obj.completion_status;
    if (field === 'progress_measure') return obj.progress_measure ?? '';
    if (field === 'description') return obj.description ?? '';
    if (field.startsWith('score.') && obj.score) {
      const scoreField = field.substring(6);
      return obj.score[scoreField as keyof typeof obj.score] ?? '';
    }
    throw { code: '401' };
  }

  private getInteraction2004Value(interactions: CMI2004Interaction[], path: string): string {
    if (path === '_count') return String(interactions.length);
    throw { code: '401' };
  }

  private getComment2004Value(comments: CMI2004Comment[], path: string): string {
    if (path === '_count') return String(comments.length);
    throw { code: '401' };
  }

  private setObjective12Value(cmi: CMI12, path: string, value: string): void {
    if (!cmi.objectives) cmi.objectives = [];
    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];

    // Ensure objective exists
    while (cmi.objectives.length <= index) {
      cmi.objectives.push({
        id: '',
        score: { raw: '', min: '', max: '' },
        status: '',
      });
    }

    const obj = cmi.objectives[index];
    if (!obj) throw { code: '401' };
    if (field === 'id') obj.id = value;
    else if (field === 'status') obj.status = value;
    else if (field === 'score.raw') obj.score.raw = value;
    else if (field === 'score.min') obj.score.min = value;
    else if (field === 'score.max') obj.score.max = value;
    else throw { code: '401' };
  }

  private setInteraction12Value(cmi: CMI12, path: string, value: string): void {
    if (!cmi.interactions) cmi.interactions = [];
    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];

    while (cmi.interactions.length <= index) {
      cmi.interactions.push({
        id: '',
        time: '',
        type: '',
        weighting: '',
        student_response: '',
        result: '',
        latency: '',
      });
    }

    const int = cmi.interactions[index];
    if (!int) throw { code: '401' };
    if (field === 'id') int.id = value;
    else if (field === 'time') int.time = value;
    else if (field === 'type') int.type = value;
    else if (field === 'weighting') int.weighting = value;
    else if (field === 'student_response') int.student_response = value;
    else if (field === 'result') int.result = value;
    else if (field === 'latency') int.latency = value;
    else throw { code: '401' };
  }

  private setObjective2004Value(cmi: CMI2004, path: string, value: string): void {
    if (!cmi.objectives) cmi.objectives = [];
    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];

    while (cmi.objectives.length <= index) {
      cmi.objectives.push({
        id: '',
        success_status: 'unknown',
        completion_status: 'unknown',
      });
    }

    const obj = cmi.objectives[index];
    if (!obj) throw { code: '401' };
    if (field === 'id') obj.id = value;
    else if (field === 'success_status')
      obj.success_status = value as CMI2004Objective['success_status'];
    else if (field === 'completion_status')
      obj.completion_status = value as CMI2004Objective['completion_status'];
    else if (field === 'progress_measure') obj.progress_measure = value;
    else if (field === 'description') obj.description = value;
    else if (field.startsWith('score.')) {
      if (!obj.score) obj.score = { scaled: '', raw: '', min: '', max: '' };
      const scoreField = field.substring(6) as keyof typeof obj.score;
      obj.score[scoreField] = value;
    } else throw { code: '401' };
  }

  private setInteraction2004Value(cmi: CMI2004, path: string, value: string): void {
    if (!cmi.interactions) cmi.interactions = [];
    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];

    while (cmi.interactions.length <= index) {
      cmi.interactions.push({
        id: '',
        type: '',
        timestamp: '',
        weighting: '',
        learner_response: '',
        result: '',
        latency: '',
      });
    }

    const int = cmi.interactions[index];
    if (!int) throw { code: '401' };
    if (field === 'id') int.id = value;
    else if (field === 'type') int.type = value;
    else if (field === 'timestamp') int.timestamp = value;
    else if (field === 'weighting') int.weighting = value;
    else if (field === 'learner_response') int.learner_response = value;
    else if (field === 'result') int.result = value;
    else if (field === 'latency') int.latency = value;
    else if (field === 'description') int.description = value;
    else throw { code: '401' };
  }

  private setComment2004Value(
    cmi: CMI2004,
    type: 'learner' | 'lms',
    path: string,
    value: string
  ): void {
    if (type !== 'learner') throw { code: '404' }; // LMS comments are read-only

    if (!cmi.comments_from_learner) cmi.comments_from_learner = [];

    const match = path.match(/^(\d+)\.(.+)$/);
    if (!match || match[1] === undefined || match[2] === undefined) throw { code: '401' };
    const index = Number.parseInt(match[1], 10);
    const field = match[2];

    while (cmi.comments_from_learner.length <= index) {
      cmi.comments_from_learner.push({ comment: '' });
    }

    const comment = cmi.comments_from_learner[index];
    if (!comment) throw { code: '401' };
    if (field === 'comment') comment.comment = value;
    else if (field === 'location') comment.location = value;
    else if (field === 'timestamp') comment.timestamp = value;
    else throw { code: '401' };
  }
}
