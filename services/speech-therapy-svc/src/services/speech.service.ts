/**
 * Speech Therapy Service - Core business logic
 * Provides comprehensive speech therapy session management, goal tracking,
 * recording analysis, and home practice features.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import { logger } from '../logger.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SessionType = 'ARTICULATION' | 'FLUENCY' | 'LANGUAGE' | 'VOICE' | 'PRAGMATICS' | 'PHONOLOGY';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED' | 'DISCONTINUED';
export type TherapySessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ActivityType = 'WORD_REPETITION' | 'SENTENCE_PRACTICE' | 'CONVERSATION' | 'PICTURE_NAMING' | 'STORY_RETELL' | 'READING_ALOUD' | 'GAME_BASED' | 'BREATHING_EXERCISE' | 'PACING_PRACTICE';

export interface CreateGoalRequest {
  learnerId: string;
  therapistId?: string;
  description: string;
  sessionType: SessionType;
  targetSounds: string[];
  masteryThreshold?: number;
  iepGoalId?: string;
  targetDate?: Date;
}

export interface CreateSessionRequest {
  learnerId: string;
  therapistId?: string;
  sessionType: SessionType;
  goalId?: string;
  scheduledAt?: Date;
  notes?: string;
}

export interface CreateActivityRequest {
  sessionId: string;
  activityType: ActivityType;
  name: string;
  targetSounds: string[];
  stimuliList: string[];
  orderIndex: number;
}

export interface RecordingAnalysis {
  accuracy: number;
  phonemeBreakdown: PhonemeResult[];
  fluencyScore?: number;
  suggestions: string[];
}

export interface PhonemeResult {
  phoneme: string;
  expected: string;
  actual: string;
  isCorrect: boolean;
  position: 'initial' | 'medial' | 'final';
}

export interface CreateHomePracticeRequest {
  learnerId: string;
  therapistId: string;
  title: string;
  instructions: string;
  targetSounds: string[];
  practiceItems: string[];
  dailyMinutes?: number;
  dueDate: Date;
}

export interface PracticeLogEntry {
  date: string;
  minutesPracticed: number;
  itemsCompleted: string[];
  parentNotes?: string;
  rating?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPEECH THERAPY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class SpeechTherapyService {
  constructor(private prisma: PrismaClient) {}

  // ════════════════════════════════════════════════════════════════════════════
  // GOALS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new speech therapy goal
   */
  async createGoal(tenantId: string, request: CreateGoalRequest) {
    return this.prisma.speechGoal.create({
      data: {
        tenantId,
        learnerId: request.learnerId,
        therapistId: request.therapistId,
        description: request.description,
        sessionType: request.sessionType,
        targetSounds: request.targetSounds,
        masteryThreshold: request.masteryThreshold ?? 0.8,
        iepGoalId: request.iepGoalId,
        targetDate: request.targetDate,
        status: 'NOT_STARTED',
      },
    });
  }

  /**
   * Get all goals for a learner
   */
  async getGoals(tenantId: string, learnerId: string) {
    return this.prisma.speechGoal.findMany({
      where: { tenantId, learnerId },
      include: {
        progressRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        sessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single goal with full details
   */
  async getGoal(tenantId: string, goalId: string) {
    return this.prisma.speechGoal.findFirst({
      where: { id: goalId, tenantId },
      include: {
        progressRecords: {
          orderBy: { recordedAt: 'desc' },
        },
        sessions: {
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });
  }

  /**
   * Update goal status and accuracy
   */
  async updateGoal(
    tenantId: string,
    goalId: string,
    updates: { status?: GoalStatus; currentAccuracy?: number }
  ) {
    const goal = await this.prisma.speechGoal.findFirst({
      where: { id: goalId, tenantId },
    });

    if (!goal) throw new Error('Goal not found');

    // Check if goal should be marked as mastered
    let newStatus = updates.status ?? goal.status;
    if (updates.currentAccuracy && updates.currentAccuracy >= goal.masteryThreshold) {
      newStatus = 'MASTERED';
    }

    return this.prisma.speechGoal.update({
      where: { id: goalId },
      data: {
        status: newStatus,
        currentAccuracy: updates.currentAccuracy ?? goal.currentAccuracy,
      },
    });
  }

  /**
   * Record progress on a goal
   */
  async recordProgress(
    tenantId: string,
    goalId: string,
    data: { accuracy: number; trials: number; notes?: string; sessionId?: string; recordedBy?: string }
  ) {
    const goal = await this.prisma.speechGoal.findFirst({
      where: { id: goalId, tenantId },
    });

    if (!goal) throw new Error('Goal not found');

    // Create progress record
    const progress = await this.prisma.goalProgress.create({
      data: {
        goalId,
        sessionId: data.sessionId,
        accuracy: data.accuracy,
        trials: data.trials,
        notes: data.notes,
        recordedBy: data.recordedBy,
      },
    });

    // Update goal with latest accuracy
    await this.updateGoal(tenantId, goalId, { currentAccuracy: data.accuracy });

    return progress;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new therapy session
   */
  async createSession(tenantId: string, request: CreateSessionRequest) {
    return this.prisma.therapySession.create({
      data: {
        tenantId,
        learnerId: request.learnerId,
        therapistId: request.therapistId,
        sessionType: request.sessionType,
        goalId: request.goalId,
        scheduledAt: request.scheduledAt,
        notes: request.notes,
        status: request.scheduledAt ? 'SCHEDULED' : 'IN_PROGRESS',
      },
    });
  }

  /**
   * Get sessions for a learner
   */
  async getSessions(tenantId: string, learnerId: string, options?: { status?: TherapySessionStatus; limit?: number }) {
    return this.prisma.therapySession.findMany({
      where: {
        tenantId,
        learnerId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        goal: true,
        activities: {
          orderBy: { orderIndex: 'asc' },
        },
        recordings: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: options?.limit ?? 20,
    });
  }

  /**
   * Get a single session with full details
   */
  async getSession(tenantId: string, sessionId: string) {
    return this.prisma.therapySession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        goal: true,
        activities: {
          orderBy: { orderIndex: 'asc' },
          include: {
            recordings: true,
          },
        },
        recordings: true,
      },
    });
  }

  /**
   * Start a therapy session
   */
  async startSession(tenantId: string, sessionId: string) {
    return this.prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  /**
   * End a therapy session
   */
  async endSession(tenantId: string, sessionId: string, data: { notes?: string; parentSummary?: string }) {
    const session = await this.prisma.therapySession.findFirst({
      where: { id: sessionId, tenantId },
      include: { activities: true },
    });

    if (!session) throw new Error('Session not found');

    const endedAt = new Date();
    const durationMin = session.startedAt
      ? Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000)
      : null;

    // Calculate overall session accuracy from activities
    const activitiesWithAccuracy = session.activities.filter((a) => a.accuracy !== null);
    const avgAccuracy = activitiesWithAccuracy.length > 0
      ? activitiesWithAccuracy.reduce((sum, a) => sum + (a.accuracy ?? 0), 0) / activitiesWithAccuracy.length
      : null;

    // Update goal progress if linked
    if (session.goalId && avgAccuracy !== null) {
      const totalTrials = session.activities.reduce(
        (sum, a) => sum + ((a.results as any[])?.length ?? 0),
        0
      );
      await this.recordProgress(tenantId, session.goalId, {
        accuracy: avgAccuracy,
        trials: totalTrials,
        sessionId,
        notes: data.notes,
      });
    }

    return this.prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt,
        durationMin,
        notes: data.notes ?? session.notes,
        parentSummary: data.parentSummary ?? this.generateParentSummary(session, avgAccuracy),
      },
    });
  }

  /**
   * Cancel a session
   */
  async cancelSession(tenantId: string, sessionId: string, reason?: string) {
    return this.prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        notes: reason,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add an activity to a session
   */
  async createActivity(tenantId: string, request: CreateActivityRequest) {
    // Verify session exists and belongs to tenant
    const session = await this.prisma.therapySession.findFirst({
      where: { id: request.sessionId, tenantId },
    });

    if (!session) throw new Error('Session not found');

    return this.prisma.therapyActivity.create({
      data: {
        sessionId: request.sessionId,
        activityType: request.activityType,
        name: request.name,
        targetSounds: request.targetSounds,
        stimuliList: request.stimuliList,
        orderIndex: request.orderIndex,
        results: [],
      },
    });
  }

  /**
   * Record result for a stimulus in an activity
   */
  async recordActivityResult(
    activityId: string,
    stimulusIndex: number,
    result: { isCorrect: boolean; attempts: number; notes?: string }
  ) {
    const activity = await this.prisma.therapyActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) throw new Error('Activity not found');

    const results = (activity.results as any[]) || [];
    results[stimulusIndex] = {
      stimulus: activity.stimuliList[stimulusIndex],
      ...result,
      recordedAt: new Date().toISOString(),
    };

    // Calculate accuracy
    const completedResults = results.filter((r) => r !== undefined && r !== null);
    const correctCount = completedResults.filter((r) => r.isCorrect).length;
    const accuracy = completedResults.length > 0 ? correctCount / completedResults.length : null;

    return this.prisma.therapyActivity.update({
      where: { id: activityId },
      data: {
        results,
        accuracy,
        completedAt: completedResults.length === activity.stimuliList.length ? new Date() : null,
      },
    });
  }

  /**
   * Complete an activity
   */
  async completeActivity(activityId: string, durationSec: number) {
    const activity = await this.prisma.therapyActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) throw new Error('Activity not found');

    const results = (activity.results as any[]) || [];
    const correctCount = results.filter((r) => r?.isCorrect).length;
    const accuracy = results.length > 0 ? correctCount / results.length : 0;

    return this.prisma.therapyActivity.update({
      where: { id: activityId },
      data: {
        accuracy,
        durationSec,
        completedAt: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RECORDINGS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Save a speech recording
   */
  async saveRecording(
    tenantId: string,
    data: {
      sessionId: string;
      activityId?: string;
      audioUrl: string;
      durationSec: number;
      targetPhrase?: string;
    }
  ) {
    return this.prisma.speechRecording.create({
      data: {
        tenantId,
        sessionId: data.sessionId,
        activityId: data.activityId,
        audioUrl: data.audioUrl,
        durationSec: data.durationSec,
        targetPhrase: data.targetPhrase,
      },
    });
  }

  /**
   * Update recording with analysis results
   */
  async updateRecordingAnalysis(
    recordingId: string,
    analysis: RecordingAnalysis,
    transcript?: string
  ) {
    return this.prisma.speechRecording.update({
      where: { id: recordingId },
      data: {
        transcript,
        analysis: analysis as any,
        accuracyScore: analysis.accuracy,
        phonemeAnalysis: analysis.phonemeBreakdown as any,
      },
    });
  }

  /**
   * Analyze speech recording using Azure Cognitive Speech Services
   * Provides pronunciation assessment with phoneme-level feedback
   */
  async analyzeRecording(recordingId: string, targetPhrase: string): Promise<RecordingAnalysis> {
    const recording = await this.prisma.speechRecording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) throw new Error('Recording not found');

    // Check if Azure Speech credentials are configured
    const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
    const azureSpeechRegion = process.env.AZURE_SPEECH_REGION;

    if (!azureSpeechKey || !azureSpeechRegion) {
      // Azure Speech is required for production speech analysis - fail explicitly
      const missingVars = [];
      if (!azureSpeechKey) missingVars.push('AZURE_SPEECH_KEY');
      if (!azureSpeechRegion) missingVars.push('AZURE_SPEECH_REGION');

      const errorMessage = `Azure Speech Service is not configured. Missing: ${missingVars.join(', ')}. ` +
        'Speech therapy analysis requires Azure Cognitive Services. ' +
        'Please configure the required environment variables.';

      logger.error({ missingVars }, '[SpeechTherapy] Azure Speech not configured');

      throw new Error(errorMessage);
    }

    try {
      // Fetch audio from storage
      const audioResponse = await fetch(recording.audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

      // Call Azure Speech API for pronunciation assessment
      const analysis = await this.performAzureSpeechAnalysis(
        audioBuffer,
        targetPhrase,
        azureSpeechKey,
        azureSpeechRegion
      );

      // Save the analysis
      await this.updateRecordingAnalysis(recordingId, analysis, analysis.transcript || targetPhrase);

      return analysis;
    } catch (error) {
      logger.error({ err: error }, '[SpeechTherapy] Speech analysis failed');

      // Return error analysis
      const errorAnalysis: RecordingAnalysis = {
        accuracy: 0,
        phonemeBreakdown: [],
        fluencyScore: 0,
        suggestions: ['Speech analysis failed. Please try recording again.'],
      };
      await this.updateRecordingAnalysis(recordingId, errorAnalysis, targetPhrase);
      return errorAnalysis;
    }
  }

  /**
   * Perform speech analysis using Azure Cognitive Services REST API
   */
  private async performAzureSpeechAnalysis(
    audioBuffer: Buffer,
    targetPhrase: string,
    apiKey: string,
    region: string,
    language: string = 'en-US'
  ): Promise<RecordingAnalysis & { transcript?: string }> {
    // Azure Speech pronunciation assessment REST endpoint
    const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;

    // Build pronunciation assessment config
    const pronunciationAssessmentConfig = {
      referenceText: targetPhrase,
      gradingSystem: 'HundredMark',
      granularity: 'Phoneme',
      enableMiscue: true,
    };

    const response = await fetch(`${endpoint}?language=${language}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': Buffer.from(JSON.stringify(pronunciationAssessmentConfig)).toString('base64'),
        'Accept': 'application/json',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Speech API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Parse Azure response
    const nBest = result.NBest?.[0];
    if (!nBest) {
      return {
        accuracy: 0,
        phonemeBreakdown: [],
        fluencyScore: 0,
        suggestions: ['Could not recognize speech. Please speak more clearly.'],
        transcript: '',
      };
    }

    const pronunciationAssessment = nBest.PronunciationAssessment || {};
    const words = nBest.Words || [];

    // Extract phoneme-level analysis
    const phonemeBreakdown: PhonemeResult[] = [];
    for (const word of words) {
      const phonemes = word.Phonemes || [];
      for (const phoneme of phonemes) {
        phonemeBreakdown.push({
          phoneme: phoneme.Phoneme || '',
          expected: phoneme.Phoneme || '',
          actual: phoneme.Phoneme || '',
          isCorrect: (phoneme.PronunciationAssessment?.AccuracyScore || 0) >= 70,
          position: this.determinePhonemePosition(phoneme, word, phonemes),
        });
      }
    }

    // Generate pedagogical suggestions
    const suggestions = this.generatePronunciationSuggestions(
      pronunciationAssessment,
      words,
      phonemeBreakdown
    );

    return {
      accuracy: (pronunciationAssessment.AccuracyScore || 0) / 100,
      phonemeBreakdown,
      fluencyScore: (pronunciationAssessment.FluencyScore || 0) / 100,
      suggestions,
      transcript: nBest.Display || nBest.Lexical || '',
    };
  }

  /**
   * Determine phoneme position within word
   */
  private determinePhonemePosition(
    phoneme: unknown,
    word: unknown,
    allPhonemes: unknown[]
  ): 'initial' | 'medial' | 'final' {
    const index = allPhonemes.indexOf(phoneme);
    if (index === 0) return 'initial';
    if (index === allPhonemes.length - 1) return 'final';
    return 'medial';
  }

  /**
   * Generate pedagogical suggestions based on pronunciation analysis
   */
  private generatePronunciationSuggestions(
    assessment: { AccuracyScore?: number; FluencyScore?: number; CompletenessScore?: number },
    words: { Word?: string; PronunciationAssessment?: { AccuracyScore?: number } }[],
    phonemes: PhonemeResult[]
  ): string[] {
    const suggestions: string[] = [];
    const accuracyScore = assessment.AccuracyScore || 0;
    const fluencyScore = assessment.FluencyScore || 0;
    const completenessScore = assessment.CompletenessScore || 0;

    // Accuracy feedback
    if (accuracyScore >= 90) {
      suggestions.push('Excellent pronunciation! Keep up the great work.');
    } else if (accuracyScore >= 70) {
      suggestions.push('Good job! A few sounds need practice.');
    } else if (accuracyScore >= 50) {
      suggestions.push('Nice effort! Let\'s focus on clearer pronunciation.');
    } else {
      suggestions.push('Let\'s practice this phrase together.');
    }

    // Find problem words
    const problemWords = words.filter(
      (w) => (w.PronunciationAssessment?.AccuracyScore || 0) < 70
    );
    if (problemWords.length > 0 && problemWords.length <= 3) {
      const wordList = problemWords.map((w) => `"${w.Word}"`).join(', ');
      suggestions.push(`Try focusing on: ${wordList}`);
    }

    // Find problem phonemes
    const problemPhonemes = phonemes.filter((p) => !p.isCorrect);
    if (problemPhonemes.length > 0 && problemPhonemes.length <= 3) {
      const uniquePhonemes = [...new Set(problemPhonemes.map((p) => p.phoneme))];
      suggestions.push(`Practice the /${uniquePhonemes.join('/, /')}/ sound${uniquePhonemes.length > 1 ? 's' : ''}.`);
    }

    // Fluency feedback
    if (fluencyScore < 70) {
      suggestions.push('Try speaking a bit more smoothly, without long pauses.');
    }

    // Completeness feedback
    if (completenessScore < 80) {
      suggestions.push('Make sure to say all the words in the phrase.');
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Get recordings for a session
   */
  async getSessionRecordings(tenantId: string, sessionId: string) {
    return this.prisma.speechRecording.findMany({
      where: { tenantId, sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HOME PRACTICE
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a home practice assignment
   */
  async createHomePractice(tenantId: string, request: CreateHomePracticeRequest) {
    return this.prisma.homePractice.create({
      data: {
        tenantId,
        learnerId: request.learnerId,
        therapistId: request.therapistId,
        title: request.title,
        instructions: request.instructions,
        targetSounds: request.targetSounds,
        practiceItems: request.practiceItems,
        dailyMinutes: request.dailyMinutes ?? 10,
        dueDate: request.dueDate,
        practiceLogs: [],
      },
    });
  }

  /**
   * Get home practice assignments for a learner
   */
  async getHomePractice(tenantId: string, learnerId: string, includeCompleted = false) {
    return this.prisma.homePractice.findMany({
      where: {
        tenantId,
        learnerId,
        ...(!includeCompleted && { isCompleted: false }),
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Log practice session for home practice
   */
  async logPractice(practiceId: string, entry: PracticeLogEntry) {
    const practice = await this.prisma.homePractice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) throw new Error('Home practice not found');

    const logs = (practice.practiceLogs as PracticeLogEntry[]) || [];
    logs.push(entry);

    // Check if completed (practiced on at least 3 different days)
    const uniqueDays = new Set(logs.map((l) => l.date)).size;
    const isCompleted = uniqueDays >= 3 && new Date() >= practice.dueDate;

    return this.prisma.homePractice.update({
      where: { id: practiceId },
      data: {
        practiceLogs: logs as any,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }

  /**
   * Mark home practice as completed
   */
  async completeHomePractice(practiceId: string) {
    return this.prisma.homePractice.update({
      where: { id: practiceId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STIMULI LIBRARY
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get stimuli for a target sound
   */
  async getStimuli(targetSound: string, options?: { difficulty?: number; position?: string; limit?: number }) {
    return this.prisma.speechStimulus.findMany({
      where: {
        targetSounds: { has: targetSound },
        isActive: true,
        ...(options?.difficulty && { difficulty: options.difficulty }),
        ...(options?.position && { soundPosition: options.position }),
      },
      orderBy: { difficulty: 'asc' },
      take: options?.limit ?? 20,
    });
  }

  /**
   * Generate a practice word list for target sounds
   */
  async generateWordList(targetSounds: string[], difficulty: number, count = 10): Promise<string[]> {
    const stimuli = await this.prisma.speechStimulus.findMany({
      where: {
        targetSounds: { hasSome: targetSounds },
        difficulty: { lte: difficulty },
        isActive: true,
      },
      orderBy: { difficulty: 'asc' },
      take: count * 2, // Get more than needed for variety
    });

    // Shuffle and take requested count
    const shuffled = stimuli.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((s) => s.text);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Generate progress report for a learner
   */
  async generateProgressReport(tenantId: string, learnerId: string, startDate: Date, endDate: Date) {
    const goals = await this.prisma.speechGoal.findMany({
      where: { tenantId, learnerId },
      include: {
        progressRecords: {
          where: {
            recordedAt: { gte: startDate, lte: endDate },
          },
          orderBy: { recordedAt: 'asc' },
        },
      },
    });

    const sessions = await this.prisma.therapySession.findMany({
      where: {
        tenantId,
        learnerId,
        startedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        activities: true,
      },
    });

    const homePractice = await this.prisma.homePractice.findMany({
      where: {
        tenantId,
        learnerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
    const avgSessionAccuracy = this.calculateAvgSessionAccuracy(sessions);
    const homePracticeCompliance = this.calculatePracticeCompliance(homePractice);

    return {
      period: { startDate, endDate },
      summary: {
        totalSessions,
        totalMinutes,
        avgSessionAccuracy,
        homePracticeCompliance,
      },
      goals: goals.map((g) => ({
        id: g.id,
        description: g.description,
        targetSounds: g.targetSounds,
        status: g.status,
        startAccuracy: g.progressRecords[0]?.accuracy ?? null,
        endAccuracy: g.progressRecords[g.progressRecords.length - 1]?.accuracy ?? g.currentAccuracy,
        progressTrend: this.calculateProgressTrend(g.progressRecords),
      })),
      sessionBreakdown: this.groupSessionsByType(sessions),
      recommendations: this.generateRecommendations(goals, avgSessionAccuracy, homePracticeCompliance),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private generateParentSummary(session: any, accuracy: number | null): string {
    const accuracyText = accuracy !== null
      ? `achieved ${Math.round(accuracy * 100)}% accuracy`
      : 'completed practice activities';

    return `Your child participated in a ${session.sessionType.toLowerCase()} therapy session and ${accuracyText}. ${
      session.activities?.length || 0
    } activities were completed. Continue practicing at home for best results!`;
  }

  private analyzePhonemesPlaceholder(phrase: string): PhonemeResult[] {
    // Placeholder - in production, use actual phoneme analysis
    const words = phrase.split(' ');
    return words.map((word, i) => ({
      phoneme: word[0]?.toLowerCase() || '',
      expected: word,
      actual: word,
      isCorrect: Math.random() > 0.2,
      position: i === 0 ? 'initial' : i === words.length - 1 ? 'final' : 'medial',
    }));
  }

  private calculateAvgSessionAccuracy(sessions: any[]): number {
    const sessionsWithActivities = sessions.filter(
      (s) => s.activities?.some((a: any) => a.accuracy !== null)
    );

    if (sessionsWithActivities.length === 0) return 0;

    const totalAccuracy = sessionsWithActivities.reduce((sum, s) => {
      const activities = s.activities.filter((a: any) => a.accuracy !== null);
      const sessionAvg = activities.reduce((aSum: number, a: any) => aSum + a.accuracy, 0) / activities.length;
      return sum + sessionAvg;
    }, 0);

    return totalAccuracy / sessionsWithActivities.length;
  }

  private calculatePracticeCompliance(practices: any[]): number {
    if (practices.length === 0) return 1;

    const completed = practices.filter((p) => p.isCompleted).length;
    const overdue = practices.filter((p) => !p.isCompleted && new Date(p.dueDate) < new Date()).length;

    return (completed / (completed + overdue)) || 0;
  }

  private calculateProgressTrend(progressRecords: any[]): 'improving' | 'stable' | 'declining' {
    if (progressRecords.length < 2) return 'stable';

    const first = progressRecords.slice(0, Math.ceil(progressRecords.length / 2));
    const second = progressRecords.slice(Math.ceil(progressRecords.length / 2));

    const firstAvg = first.reduce((sum, r) => sum + r.accuracy, 0) / first.length;
    const secondAvg = second.reduce((sum, r) => sum + r.accuracy, 0) / second.length;

    const diff = secondAvg - firstAvg;
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  private groupSessionsByType(sessions: any[]): Record<string, { count: number; avgAccuracy: number }> {
    const groups: Record<string, { count: number; totalAccuracy: number }> = {};

    for (const session of sessions) {
      const type = session.sessionType;
      if (!groups[type]) {
        groups[type] = { count: 0, totalAccuracy: 0 };
      }
      groups[type].count++;

      const activities = session.activities?.filter((a: any) => a.accuracy !== null) || [];
      if (activities.length > 0) {
        const sessionAccuracy = activities.reduce((sum: number, a: any) => sum + a.accuracy, 0) / activities.length;
        groups[type].totalAccuracy += sessionAccuracy;
      }
    }

    return Object.fromEntries(
      Object.entries(groups).map(([type, data]) => [
        type,
        {
          count: data.count,
          avgAccuracy: data.count > 0 ? data.totalAccuracy / data.count : 0,
        },
      ])
    );
  }

  private generateRecommendations(
    goals: any[],
    avgAccuracy: number,
    practiceCompliance: number
  ): string[] {
    const recommendations: string[] = [];

    // Check for struggling goals
    const strugglingGoals = goals.filter(
      (g) => g.status === 'IN_PROGRESS' && (g.currentAccuracy ?? 0) < 0.5
    );
    if (strugglingGoals.length > 0) {
      recommendations.push(
        `Focus additional practice on ${strugglingGoals.map((g) => g.targetSounds.join(', ')).join('; ')}`
      );
    }

    // Check mastered goals
    const masteredGoals = goals.filter((g) => g.status === 'MASTERED');
    if (masteredGoals.length > 0) {
      recommendations.push(
        `Celebrate mastery of ${masteredGoals.length} goal(s)! Consider advancing to more complex targets.`
      );
    }

    // Practice compliance
    if (practiceCompliance < 0.7) {
      recommendations.push('Increase home practice frequency for faster progress');
    }

    // Overall accuracy
    if (avgAccuracy < 0.6) {
      recommendations.push('Consider breaking down targets into smaller steps');
    } else if (avgAccuracy > 0.85) {
      recommendations.push('Excellent progress! Ready to advance to more challenging targets');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current therapy plan - progress is on track');
    }

    return recommendations;
  }
}
