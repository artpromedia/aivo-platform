/**
 * SIS Sync Engine
 * 
 * Core ETL pipeline for syncing SIS data to Aivo entities.
 * Handles extraction from providers, transformation to Aivo format,
 * and loading via upserts with soft deletes.
 */

import { PrismaClient, SisProviderType, SyncStatus, SisEntityType } from '@prisma/client';
import {
  ISisProvider,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncStats,
  createEmptySyncStats,
} from '../providers/types';
import { createAndInitializeProvider } from '../providers';

export interface SyncEngineConfig {
  /** Batch size for database operations */
  batchSize: number;
  /** Maximum retries for failed operations */
  maxRetries: number;
  /** Whether to continue on individual entity errors */
  continueOnError: boolean;
}

const DEFAULT_CONFIG: SyncEngineConfig = {
  batchSize: 100,
  maxRetries: 3,
  continueOnError: true,
};

export interface SyncRunContext {
  tenantId: string;
  providerId: string;
  syncRunId: string;
  config: SyncEngineConfig;
}

export class SyncEngine {
  private prisma: PrismaClient;
  private provider: ISisProvider | null = null;
  private context: SyncRunContext | null = null;
  private stats: SyncStats = createEmptySyncStats();
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute a full sync for a provider
   */
  async executeSync(
    tenantId: string,
    providerId: string,
    triggeredBy?: string,
    isManual = false,
    config: Partial<SyncEngineConfig> = {}
  ): Promise<{ success: boolean; stats: SyncStats; errors: string[] }> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Create sync run record
    const syncRun = await this.prisma.sisSyncRun.create({
      data: {
        tenantId,
        providerId,
        status: SyncStatus.IN_PROGRESS,
        triggeredBy,
        isManual,
      },
    });

    this.context = {
      tenantId,
      providerId,
      syncRunId: syncRun.id,
      config: finalConfig,
    };

    this.stats = createEmptySyncStats();
    this.warnings = [];
    this.errors = [];

    try {
      // Initialize provider
      const providerRecord = await this.prisma.sisProvider.findUnique({
        where: { id: providerId },
      });

      if (!providerRecord) {
        throw new Error(`Provider ${providerId} not found`);
      }

      if (!providerRecord.enabled) {
        throw new Error(`Provider ${providerId} is disabled`);
      }

      this.provider = await createAndInitializeProvider(
        providerRecord.providerType,
        providerRecord.configJson
      );

      // Execute sync phases in order
      await this.syncSchools();
      await this.syncClasses();
      await this.syncUsers();
      await this.syncEnrollments();

      // Mark records not seen in this sync as inactive
      await this.deactivateStaleRecords();

      // Update sync run with success
      const status = this.errors.length > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS;
      await this.prisma.sisSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status,
          completedAt: new Date(),
          statsJson: JSON.stringify(this.stats),
          errorMessage: this.errors.length > 0 ? this.errors.slice(0, 10).join('\n') : null,
          errorLog: this.errors.length > 0 ? this.errors.join('\n') : null,
        },
      });

      // Update provider last sync time
      await this.prisma.sisProvider.update({
        where: { id: providerId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: this.errors.length === 0,
        stats: this.stats,
        errors: this.errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push(errorMessage);

      await this.prisma.sisSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: SyncStatus.FAILURE,
          completedAt: new Date(),
          statsJson: JSON.stringify(this.stats),
          errorMessage,
          errorLog: this.errors.join('\n'),
        },
      });

      return {
        success: false,
        stats: this.stats,
        errors: this.errors,
      };
    } finally {
      if (this.provider) {
        await this.provider.cleanup();
        this.provider = null;
      }
      this.context = null;
    }
  }

  /**
   * Sync schools from provider to staging table
   */
  private async syncSchools(): Promise<void> {
    if (!this.provider || !this.context) return;

    let cursor: string | undefined;
    let hasMore = true;

    // Reset processed flag for all existing schools
    await this.prisma.sisRawSchool.updateMany({
      where: { providerId: this.context.providerId },
      data: { processed: false },
    });

    while (hasMore) {
      const result = await this.provider.fetchSchools(cursor);
      this.stats.schools.fetched += result.count;
      this.warnings.push(...result.warnings);

      // Process in batches
      for (let i = 0; i < result.entities.length; i += this.context.config.batchSize) {
        const batch = result.entities.slice(i, i + this.context.config.batchSize);
        await this.upsertSchoolsBatch(batch);
      }

      hasMore = result.hasMore;
      cursor = result.nextCursor;
    }
  }

  private async upsertSchoolsBatch(schools: SisSchool[]): Promise<void> {
    if (!this.context) return;

    for (const school of schools) {
      try {
        const existing = await this.prisma.sisRawSchool.findUnique({
          where: {
            providerId_externalId: {
              providerId: this.context.providerId,
              externalId: school.externalId,
            },
          },
        });

        if (existing) {
          await this.prisma.sisRawSchool.update({
            where: { id: existing.id },
            data: {
              rawJson: JSON.stringify(school.rawData),
              name: school.name,
              schoolNumber: school.schoolNumber,
              processed: true,
              lastSyncRunId: this.context.syncRunId,
              updatedAt: new Date(),
            },
          });
          this.stats.schools.updated++;
        } else {
          await this.prisma.sisRawSchool.create({
            data: {
              tenantId: this.context.tenantId,
              providerId: this.context.providerId,
              externalId: school.externalId,
              rawJson: JSON.stringify(school.rawData),
              name: school.name,
              schoolNumber: school.schoolNumber,
              processed: true,
              lastSyncRunId: this.context.syncRunId,
            },
          });
          this.stats.schools.created++;
        }
      } catch (error) {
        this.stats.schools.errors++;
        if (!this.context.config.continueOnError) throw error;
        this.errors.push(`School ${school.externalId}: ${error}`);
      }
    }
  }

  /**
   * Sync classes from provider to staging table
   */
  private async syncClasses(): Promise<void> {
    if (!this.provider || !this.context) return;

    let cursor: string | undefined;
    let hasMore = true;

    await this.prisma.sisRawClass.updateMany({
      where: { providerId: this.context.providerId },
      data: { processed: false },
    });

    while (hasMore) {
      const result = await this.provider.fetchClasses(cursor);
      this.stats.classes.fetched += result.count;
      this.warnings.push(...result.warnings);

      for (let i = 0; i < result.entities.length; i += this.context.config.batchSize) {
        const batch = result.entities.slice(i, i + this.context.config.batchSize);
        await this.upsertClassesBatch(batch);
      }

      hasMore = result.hasMore;
      cursor = result.nextCursor;
    }
  }

  private async upsertClassesBatch(classes: SisClass[]): Promise<void> {
    if (!this.context) return;

    for (const cls of classes) {
      try {
        const existing = await this.prisma.sisRawClass.findUnique({
          where: {
            providerId_externalId: {
              providerId: this.context.providerId,
              externalId: cls.externalId,
            },
          },
        });

        const data = {
          rawJson: JSON.stringify(cls.rawData),
          schoolExternalId: cls.schoolExternalId,
          name: cls.name,
          courseCode: cls.courseCode,
          grade: cls.grade,
          subject: cls.subject,
          termStart: cls.term?.startDate,
          termEnd: cls.term?.endDate,
          processed: true,
          lastSyncRunId: this.context.syncRunId,
        };

        if (existing) {
          await this.prisma.sisRawClass.update({
            where: { id: existing.id },
            data: { ...data, updatedAt: new Date() },
          });
          this.stats.classes.updated++;
        } else {
          await this.prisma.sisRawClass.create({
            data: {
              tenantId: this.context.tenantId,
              providerId: this.context.providerId,
              externalId: cls.externalId,
              ...data,
            },
          });
          this.stats.classes.created++;
        }
      } catch (error) {
        this.stats.classes.errors++;
        if (!this.context.config.continueOnError) throw error;
        this.errors.push(`Class ${cls.externalId}: ${error}`);
      }
    }
  }

  /**
   * Sync users from provider to staging table
   */
  private async syncUsers(): Promise<void> {
    if (!this.provider || !this.context) return;

    let cursor: string | undefined;
    let hasMore = true;

    await this.prisma.sisRawUser.updateMany({
      where: { providerId: this.context.providerId },
      data: { processed: false },
    });

    while (hasMore) {
      const result = await this.provider.fetchUsers(cursor);
      this.stats.users.fetched += result.count;
      this.warnings.push(...result.warnings);

      for (let i = 0; i < result.entities.length; i += this.context.config.batchSize) {
        const batch = result.entities.slice(i, i + this.context.config.batchSize);
        await this.upsertUsersBatch(batch);
      }

      hasMore = result.hasMore;
      cursor = result.nextCursor;
    }
  }

  private async upsertUsersBatch(users: SisUser[]): Promise<void> {
    if (!this.context) return;

    for (const user of users) {
      try {
        const existing = await this.prisma.sisRawUser.findUnique({
          where: {
            providerId_externalId: {
              providerId: this.context.providerId,
              externalId: user.externalId,
            },
          },
        });

        const data = {
          rawJson: JSON.stringify(user.rawData),
          sisRole: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          studentNumber: user.studentNumber,
          grade: user.grade,
          processed: true,
          lastSyncRunId: this.context.syncRunId,
        };

        if (existing) {
          await this.prisma.sisRawUser.update({
            where: { id: existing.id },
            data: { ...data, updatedAt: new Date() },
          });
          this.stats.users.updated++;
        } else {
          await this.prisma.sisRawUser.create({
            data: {
              tenantId: this.context.tenantId,
              providerId: this.context.providerId,
              externalId: user.externalId,
              ...data,
            },
          });
          this.stats.users.created++;
        }
      } catch (error) {
        this.stats.users.errors++;
        if (!this.context.config.continueOnError) throw error;
        this.errors.push(`User ${user.externalId}: ${error}`);
      }
    }
  }

  /**
   * Sync enrollments from provider to staging table
   */
  private async syncEnrollments(): Promise<void> {
    if (!this.provider || !this.context) return;

    let cursor: string | undefined;
    let hasMore = true;

    await this.prisma.sisRawEnrollment.updateMany({
      where: { providerId: this.context.providerId },
      data: { processed: false },
    });

    while (hasMore) {
      const result = await this.provider.fetchEnrollments(cursor);
      this.stats.enrollments.fetched += result.count;
      this.warnings.push(...result.warnings);

      for (let i = 0; i < result.entities.length; i += this.context.config.batchSize) {
        const batch = result.entities.slice(i, i + this.context.config.batchSize);
        await this.upsertEnrollmentsBatch(batch);
      }

      hasMore = result.hasMore;
      cursor = result.nextCursor;
    }
  }

  private async upsertEnrollmentsBatch(enrollments: SisEnrollment[]): Promise<void> {
    if (!this.context) return;

    for (const enrollment of enrollments) {
      try {
        const existing = await this.prisma.sisRawEnrollment.findUnique({
          where: {
            providerId_userExternalId_classExternalId: {
              providerId: this.context.providerId,
              userExternalId: enrollment.userExternalId,
              classExternalId: enrollment.classExternalId,
            },
          },
        });

        const data = {
          externalId: enrollment.externalId,
          rawJson: JSON.stringify(enrollment.rawData),
          role: enrollment.role,
          isPrimary: enrollment.isPrimary,
          startDate: enrollment.startDate,
          endDate: enrollment.endDate,
          processed: true,
          lastSyncRunId: this.context.syncRunId,
        };

        if (existing) {
          await this.prisma.sisRawEnrollment.update({
            where: { id: existing.id },
            data: { ...data, updatedAt: new Date() },
          });
          this.stats.enrollments.updated++;
        } else {
          await this.prisma.sisRawEnrollment.create({
            data: {
              tenantId: this.context.tenantId,
              providerId: this.context.providerId,
              userExternalId: enrollment.userExternalId,
              classExternalId: enrollment.classExternalId,
              ...data,
            },
          });
          this.stats.enrollments.created++;
        }
      } catch (error) {
        this.stats.enrollments.errors++;
        if (!this.context.config.continueOnError) throw error;
        this.errors.push(`Enrollment ${enrollment.userExternalId}/${enrollment.classExternalId}: ${error}`);
      }
    }
  }

  /**
   * Mark records not seen in this sync as inactive (soft delete)
   */
  private async deactivateStaleRecords(): Promise<void> {
    if (!this.context) return;

    // Count stale records for stats
    const staleSchools = await this.prisma.sisRawSchool.count({
      where: { providerId: this.context.providerId, processed: false },
    });
    const staleClasses = await this.prisma.sisRawClass.count({
      where: { providerId: this.context.providerId, processed: false },
    });
    const staleUsers = await this.prisma.sisRawUser.count({
      where: { providerId: this.context.providerId, processed: false },
    });
    const staleEnrollments = await this.prisma.sisRawEnrollment.count({
      where: { providerId: this.context.providerId, processed: false },
    });

    this.stats.schools.deactivated = staleSchools;
    this.stats.classes.deactivated = staleClasses;
    this.stats.users.deactivated = staleUsers;
    this.stats.enrollments.deactivated = staleEnrollments;

    // Note: We don't delete the raw records - the transform phase will
    // handle deactivating the corresponding Aivo entities
  }
}
