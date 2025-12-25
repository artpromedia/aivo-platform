/**
 * Google Classroom Scheduled Sync Job
 *
 * Handles periodic roster synchronization for all connected courses.
 * Runs on a configurable schedule (default: every 6 hours).
 *
 * Features:
 * - Incremental sync to minimize API usage
 * - Exponential backoff for failing courses
 * - Webhook registration renewal
 * - Grade passback for completed lessons
 *
 * @module google-classroom/scheduled-sync
 */

import type { PrismaClient } from '@prisma/client';

import type { AssignmentSyncService } from './assignment-sync.service.js';
import type { GoogleClassroomService } from './google-classroom.service.js';
import type { SyncResult } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ScheduledSyncConfig {
  /** Interval between sync runs in milliseconds (default: 6 hours) */
  syncIntervalMs: number;
  /** Maximum courses to sync per run */
  maxCoursesPerRun: number;
  /** Delay between individual course syncs in milliseconds */
  delayBetweenCoursesMs: number;
  /** Maximum consecutive failures before disabling auto-sync */
  maxConsecutiveFailures: number;
  /** Hours before webhook expiration to renew */
  webhookRenewalHoursBeforeExpiry: number;
  /** Enable grade passback during sync */
  enableGradePassback: boolean;
}

const DEFAULT_CONFIG: ScheduledSyncConfig = {
  syncIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
  maxCoursesPerRun: 100,
  delayBetweenCoursesMs: 500,
  maxConsecutiveFailures: 5,
  webhookRenewalHoursBeforeExpiry: 24,
  enableGradePassback: true,
};

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULED SYNC JOB
// ══════════════════════════════════════════════════════════════════════════════

export class ScheduledSyncJob {
  private intervalId: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private readonly config: ScheduledSyncConfig;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly googleClassroomService: GoogleClassroomService,
    private readonly assignmentSyncService: AssignmentSyncService,
    config: Partial<ScheduledSyncConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the scheduled sync job
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Scheduled sync job already running');
      return;
    }

    console.log('Starting scheduled Google Classroom sync job', {
      intervalMs: this.config.syncIntervalMs,
      maxCoursesPerRun: this.config.maxCoursesPerRun,
    });

    // Run immediately on start
    this.runSync().catch(console.error);

    // Schedule recurring runs
    this.intervalId = setInterval(() => {
      this.runSync().catch(console.error);
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop the scheduled sync job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped scheduled Google Classroom sync job');
    }
  }

  /**
   * Run a sync cycle
   */
  async runSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('Starting scheduled sync cycle');

    try {
      // Step 1: Renew expiring webhook registrations
      await this.renewExpiringWebhooks();

      // Step 2: Sync courses due for sync
      const syncResults = await this.syncDueCourses();

      // Step 3: Sync pending grades if enabled
      if (this.config.enableGradePassback) {
        await this.syncPendingGrades();
      }

      // Step 4: Clean up old sync logs
      await this.cleanupOldLogs();

      const duration = Date.now() - startTime;
      console.log('Completed scheduled sync cycle', {
        durationMs: duration,
        coursesSynced: syncResults.length,
        successful: syncResults.filter((r) => r.success).length,
        failed: syncResults.filter((r) => !r.success).length,
      });
    } catch (error) {
      console.error('Error during scheduled sync:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Renew webhook registrations that are about to expire
   */
  private async renewExpiringWebhooks(): Promise<void> {
    const expirationThreshold = new Date(
      Date.now() + this.config.webhookRenewalHoursBeforeExpiry * 60 * 60 * 1000
    );

    const expiringRegistrations = await this.prisma.googleClassroomWebhookRegistration.findMany({
      where: {
        active: true,
        expiresAt: { lte: expirationThreshold },
      },
    });

    console.log(`Found ${expiringRegistrations.length} webhook registrations to renew`);

    for (const registration of expiringRegistrations) {
      try {
        // Find a teacher credential for this course
        const credential = await this.findCredentialForCourse(registration.courseId);
        if (!credential) {
          console.warn(
            `No credential found for course ${registration.courseId}, deactivating webhook`
          );
          await this.prisma.googleClassroomWebhookRegistration.update({
            where: { id: registration.id },
            data: { active: false },
          });
          continue;
        }

        // Register new webhook
        const newRegistration = await this.googleClassroomService.registerPushNotifications(
          credential.userId,
          registration.courseId,
          registration.feedType as any
        );

        // Deactivate old registration
        await this.prisma.googleClassroomWebhookRegistration.update({
          where: { id: registration.id },
          data: { active: false },
        });

        console.log(`Renewed webhook for course ${registration.courseId}`);
      } catch (error) {
        console.error(`Failed to renew webhook for course ${registration.courseId}:`, error);
      }
    }
  }

  /**
   * Sync courses that are due for synchronization
   */
  private async syncDueCourses(): Promise<SyncResult[]> {
    // Find courses that need syncing
    // - Auto-sync enabled
    // - Not currently syncing
    // - Not exceeded failure threshold
    // - Either never synced or last sync > 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const coursesToSync = await this.prisma.googleClassroomSync.findMany({
      where: {
        autoSyncEnabled: true,
        syncInProgress: false,
        consecutiveFailures: { lt: this.config.maxConsecutiveFailures },
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: oneHourAgo } }],
      },
      include: {
        class: true,
      },
      take: this.config.maxCoursesPerRun,
      orderBy: [
        { lastSyncAt: 'asc' }, // Prioritize courses that haven't synced recently
        { consecutiveFailures: 'asc' }, // Prioritize courses with fewer failures
      ],
    });

    console.log(`Found ${coursesToSync.length} courses to sync`);

    const results: SyncResult[] = [];

    for (const syncRecord of coursesToSync) {
      try {
        // Find a valid credential for this course
        const credential = await this.findCredentialForCourse(syncRecord.googleCourseId);
        if (!credential) {
          console.warn(`No credential found for course ${syncRecord.googleCourseId}`);
          continue;
        }

        const result = await this.googleClassroomService.syncCourseRoster(
          credential.userId,
          credential.tenantId,
          syncRecord.googleCourseId,
          { syncGuardians: syncRecord.syncGuardians }
        );

        results.push(result);

        // Log the sync operation
        await this.logSyncOperation(syncRecord, result, 'scheduled');

        // Delay between courses
        await this.delay(this.config.delayBetweenCoursesMs);
      } catch (error: any) {
        console.error(`Failed to sync course ${syncRecord.googleCourseId}:`, error);

        // Log failure
        await this.logSyncOperation(
          syncRecord,
          {
            courseId: syncRecord.googleCourseId,
            success: false,
            studentsAdded: 0,
            studentsRemoved: 0,
            studentsUpdated: 0,
            teachersAdded: 0,
            teachersRemoved: 0,
            guardiansAdded: 0,
            errors: [error.message],
            duration: 0,
          },
          'scheduled'
        );
      }
    }

    return results;
  }

  /**
   * Sync pending grades to Google Classroom
   */
  private async syncPendingGrades(): Promise<void> {
    console.log('Syncing pending grades');

    // Find all linked assignments with pending grades
    const assignmentsWithPendingGrades = await this.prisma.googleClassroomAssignment.findMany({
      where: {
        status: 'active',
        lesson: {
          attempts: {
            some: {
              status: 'COMPLETED',
              gradeSyncedAt: null,
            },
          },
        },
      },
      include: {
        lesson: {
          include: {
            attempts: {
              where: {
                status: 'COMPLETED',
                gradeSyncedAt: null,
              },
              take: 1,
            },
          },
        },
      },
    });

    console.log(`Found ${assignmentsWithPendingGrades.length} assignments with pending grades`);

    for (const assignment of assignmentsWithPendingGrades) {
      try {
        // Find a credential for this course
        const credential = await this.findCredentialForCourse(assignment.googleCourseId);
        if (!credential) continue;

        await this.assignmentSyncService.syncPendingGrades(
          credential.userId,
          assignment.googleCourseId
        );
      } catch (error) {
        console.error(`Failed to sync grades for assignment ${assignment.id}:`, error);
      }
    }
  }

  /**
   * Clean up old sync logs (keep last 30 days)
   */
  private async cleanupOldLogs(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleted = await this.prisma.googleClassroomSyncLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    if (deleted.count > 0) {
      console.log(`Cleaned up ${deleted.count} old sync logs`);
    }
  }

  /**
   * Find a valid credential for a course
   */
  private async findCredentialForCourse(googleCourseId: string): Promise<{
    userId: string;
    tenantId: string;
  } | null> {
    // Find an enrollment with a teacher who has valid credentials
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        class: { googleCourseId },
        role: 'TEACHER',
        status: 'ACTIVE',
        user: {
          googleClassroomCredential: { isNot: null },
        },
      },
      include: {
        user: {
          include: {
            googleClassroomCredential: true,
          },
        },
      },
    });

    if (!enrollment?.user?.googleClassroomCredential) {
      return null;
    }

    return {
      userId: enrollment.user.id,
      tenantId: enrollment.user.googleClassroomCredential.tenantId,
    };
  }

  /**
   * Log a sync operation to the database
   */
  private async logSyncOperation(
    syncRecord: any,
    result: SyncResult,
    triggeredBy: string
  ): Promise<void> {
    await this.prisma.googleClassroomSyncLog.create({
      data: {
        googleCourseId: syncRecord.googleCourseId,
        classId: syncRecord.classId,
        syncType: 'incremental',
        triggeredBy,
        success: result.success,
        studentsAdded: result.studentsAdded,
        studentsRemoved: result.studentsRemoved,
        studentsUpdated: result.studentsUpdated,
        teachersAdded: result.teachersAdded,
        teachersRemoved: result.teachersRemoved,
        guardiansAdded: result.guardiansAdded,
        errors: result.errors,
        warnings: result.warnings || [],
        startedAt: new Date(Date.now() - result.duration),
        completedAt: new Date(),
        durationMs: result.duration,
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE SYNC JOB (more frequent)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Separate job for syncing grades more frequently
 * Runs every 15 minutes by default
 */
export class GradeSyncJob {
  private intervalId: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly assignmentSyncService: AssignmentSyncService,
    private readonly intervalMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  start(): void {
    if (this.intervalId) return;

    console.log('Starting grade sync job', { intervalMs: this.intervalMs });

    this.intervalId = setInterval(() => {
      this.runSync().catch(console.error);
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runSync(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      // Find courses with auto-sync enabled and pending grades
      const coursesWithPendingGrades = await this.prisma.googleClassroomSync.findMany({
        where: {
          autoSyncEnabled: true,
          class: {
            googleClassroomAssignments: {
              some: {
                status: 'active',
              },
            },
          },
        },
        select: {
          googleCourseId: true,
          classId: true,
        },
      });

      for (const course of coursesWithPendingGrades) {
        try {
          // Find credential
          const credential = await this.findCredentialForCourse(course.googleCourseId);
          if (!credential) continue;

          const result = await this.assignmentSyncService.syncPendingGrades(
            credential.userId,
            course.googleCourseId
          );

          if (result.synced > 0 || result.failed > 0) {
            console.log('Grade sync result', {
              courseId: course.googleCourseId,
              synced: result.synced,
              failed: result.failed,
            });
          }
        } catch (error) {
          console.error(`Grade sync failed for course ${course.googleCourseId}:`, error);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async findCredentialForCourse(googleCourseId: string): Promise<{
    userId: string;
  } | null> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        class: { googleCourseId },
        role: 'TEACHER',
        status: 'ACTIVE',
        user: {
          googleClassroomCredential: { isNot: null },
        },
      },
      select: {
        userId: true,
      },
    });

    return enrollment ? { userId: enrollment.userId! } : null;
  }
}
