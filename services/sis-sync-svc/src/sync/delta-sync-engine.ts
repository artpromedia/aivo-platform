/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
/**
 * Delta Sync Engine
 *
 * Production-ready delta sync implementation for SIS data.
 * Key features:
 * - Only syncs changes since last sync (delta sync)
 * - Scales to 1M+ students across districts
 * - Hash-based change detection
 * - Conflict resolution strategies
 * - Full audit trail for FERPA compliance
 *
 * @author AIVO Platform Team
 */

import { PrismaClient, SyncStatus } from '@prisma/client';
import { createHash } from 'crypto';
import type { ISisProvider } from '../providers/types.js';

/**
 * Entity types that can be synced
 */
export type SyncEntityType =
  | 'org' // Schools, districts
  | 'user' // All user types
  | 'student' // Enrolled students
  | 'teacher' // Teachers/staff
  | 'parent' // Parents/guardians
  | 'class' // Courses/sections
  | 'enrollment' // Class enrollments
  | 'relationship' // Parent-student relationships
  | 'term' // Academic terms/grading periods
  | 'demographic'; // Student demographics

/**
 * Sync operation types
 */
export type SyncOperation = 'create' | 'update' | 'delete' | 'link' | 'unlink';

/**
 * Delta record representing a single change
 */
export interface DeltaRecord {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  sourceData: Record<string, any>;
  previousHash?: string;
  currentHash: string;
  sourceSystem: string;
  sourceId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Sync state tracking
 */
export interface SyncState {
  id: string;
  tenantId: string;
  providerId: string;
  providerType: string;
  lastSyncTime: Date;
  lastDeltaToken?: string;
  lastFullSyncTime?: Date;
  entityCursors: Record<SyncEntityType, string>;
  status: 'idle' | 'syncing' | 'error' | 'paused';
  errorMessage?: string;
  stats: SyncStats;
}

export interface SyncStats {
  totalRecordsProcessed: number;
  creates: number;
  updates: number;
  deletes: number;
  errors: number;
  conflicts: number;
  duration: number;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  tenantId: string;
  providerId: string;
  provider: ISisProvider;
  batchSize: number;
  maxRetries: number;
  conflictResolution: 'source_wins' | 'target_wins' | 'manual' | 'newest_wins';
  enabledEntityTypes: SyncEntityType[];
  fieldMappings: Record<SyncEntityType, FieldMapping[]>;
  filters?: SyncFilters;
  webhookEnabled: boolean;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
  required?: boolean;
  defaultValue?: any;
}

export interface SyncFilters {
  schoolIds?: string[];
  gradeLevels?: string[];
  activeOnly?: boolean;
  roles?: string[];
}

/**
 * Conflict record
 */
export interface SyncConflict {
  id: string;
  tenantId: string;
  entityType: SyncEntityType;
  entityId: string;
  sourceValue: any;
  targetValue: any;
  field: string;
  resolution?: 'source' | 'target' | 'manual';
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

/**
 * Delta fetch options for providers
 */
export interface DeltaFetchOptions {
  since?: Date;
  cursor?: string;
  limit: number;
  deltaToken?: string;
  filters?: SyncFilters;
}

/**
 * Delta response from providers
 */
export interface DeltaResponse {
  records: DeltaRecord[];
  hasMore: boolean;
  nextCursor?: string;
  deltaToken?: string;
}

/**
 * Create empty sync stats
 */
export function createEmptySyncStats(): SyncStats {
  return {
    totalRecordsProcessed: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
    errors: 0,
    conflicts: 0,
    duration: 0,
  };
}

/**
 * Delta Sync Engine
 *
 * Implements efficient delta synchronization for SIS data at scale.
 */
export class DeltaSyncEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute delta sync for a tenant
   */
  async executeDeltaSync(config: SyncConfig): Promise<SyncStats> {
    const startTime = Date.now();
    const stats: SyncStats = createEmptySyncStats();

    console.log('[DeltaSync] Starting delta sync', {
      tenantId: config.tenantId,
      providerId: config.providerId,
    });

    // Get or create sync state
    let syncState = await this.getSyncState(config.tenantId, config.providerId);

    if (!syncState) {
      syncState = await this.createSyncState(config);
    }

    // Update status to syncing
    await this.updateSyncStatus(syncState.id, 'syncing');

    try {
      // Process each entity type in dependency order
      const entityOrder: SyncEntityType[] = [
        'org',
        'term',
        'teacher',
        'student',
        'parent',
        'class',
        'enrollment',
        'relationship',
        'demographic',
      ];

      for (const entityType of entityOrder) {
        if (!config.enabledEntityTypes.includes(entityType)) {
          continue;
        }

        const entityStats = await this.syncEntityType(config, syncState, entityType);

        stats.totalRecordsProcessed += entityStats.totalRecordsProcessed;
        stats.creates += entityStats.creates;
        stats.updates += entityStats.updates;
        stats.deletes += entityStats.deletes;
        stats.errors += entityStats.errors;
        stats.conflicts += entityStats.conflicts;
      }

      // Detect and process deletions
      if (config.provider.supportsDeletionDetection) {
        const deletionStats = await this.processDeletedEntities(config, syncState);
        stats.deletes += deletionStats.deletes;
      }

      // Update sync state
      stats.duration = Date.now() - startTime;
      await this.completeSyncState(syncState.id, stats);

      console.log('[DeltaSync] Delta sync completed', {
        tenantId: config.tenantId,
        providerId: config.providerId,
        stats,
      });

      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncStatus(syncState.id, 'error', message);

      console.error('[DeltaSync] Delta sync failed', {
        tenantId: config.tenantId,
        providerId: config.providerId,
        error: message,
      });

      throw error;
    }
  }

  /**
   * Sync a specific entity type
   */
  private async syncEntityType(
    config: SyncConfig,
    syncState: SyncState,
    entityType: SyncEntityType
  ): Promise<SyncStats> {
    const stats: SyncStats = createEmptySyncStats();
    const cursor = syncState.entityCursors[entityType];
    let hasMore = true;
    let currentCursor = cursor;

    while (hasMore) {
      // Fetch delta from provider
      const deltaResponse = await config.provider.fetchDelta(entityType, {
        since: syncState.lastSyncTime,
        cursor: currentCursor,
        limit: config.batchSize,
        deltaToken: syncState.lastDeltaToken,
        filters: config.filters,
      });

      // Process each delta record
      for (const record of deltaResponse.records) {
        try {
          const result = await this.processDeltaRecord(config, record, entityType);

          stats.totalRecordsProcessed++;

          switch (result.operation) {
            case 'create':
              stats.creates++;
              break;
            case 'update':
              stats.updates++;
              break;
            case 'delete':
              stats.deletes++;
              break;
          }

          if (result.conflict) {
            stats.conflicts++;
          }
        } catch (error) {
          stats.errors++;
          const message = error instanceof Error ? error.message : 'Unknown error';
          await this.logSyncError(config.tenantId, entityType, record.sourceId, message);
        }
      }

      // Update cursor
      currentCursor = deltaResponse.nextCursor || currentCursor;
      hasMore = deltaResponse.hasMore;

      // Update entity cursor in sync state
      if (currentCursor) {
        await this.updateEntityCursor(syncState.id, entityType, currentCursor);
      }

      // Rate limiting
      if (hasMore && config.provider.rateLimitDelay) {
        await this.delay(config.provider.rateLimitDelay);
      }
    }

    return stats;
  }

  /**
   * Process a single delta record
   */
  async processDeltaRecord(
    config: SyncConfig,
    record: DeltaRecord,
    entityType: SyncEntityType
  ): Promise<{ operation: SyncOperation; conflict?: SyncConflict }> {
    // Calculate hash of incoming data
    const currentHash = this.calculateHash(record.sourceData);

    // Look up existing entity
    const existing = await this.findExistingEntity(
      config.tenantId,
      entityType,
      record.sourceId,
      config.providerId
    );

    // Determine operation
    let operation: SyncOperation;
    let conflict: SyncConflict | undefined;

    if (record.operation === 'delete') {
      if (existing) {
        await this.deleteEntity(config.tenantId, entityType, existing.id);
        operation = 'delete';
      } else {
        operation = 'delete'; // Already deleted
      }
    } else if (!existing) {
      // Create new entity
      await this.createEntity(config, entityType, record);
      operation = 'create';
    } else if (existing.sourceHash !== currentHash) {
      // Check for conflicts
      if (existing.locallyModified && config.conflictResolution !== 'source_wins') {
        conflict = await this.createConflict(config, entityType, existing, record);

        if (config.conflictResolution === 'manual') {
          // Don't update, wait for manual resolution
          return { operation: 'update', conflict };
        }
      }

      // Update existing entity
      await this.updateEntity(config, entityType, existing, record, currentHash);
      operation = 'update';
    } else {
      // No change
      operation = 'update';
    }

    // Track sync history
    await this.trackSyncHistory(config.tenantId, entityType, record, operation);

    return { operation, conflict };
  }

  /**
   * Process deleted entities (entities in our system but removed from source)
   */
  private async processDeletedEntities(
    config: SyncConfig,
    _syncState: SyncState
  ): Promise<{ deletes: number }> {
    let deletes = 0;

    for (const entityType of config.enabledEntityTypes) {
      // Get all source IDs from provider
      const sourceIds = await config.provider.getAllSourceIds(entityType, {
        filters: config.filters,
      });

      const sourceIdSet = new Set(sourceIds);

      // Find entities in our system that are not in source
      const localEntities = await this.getLocalEntities(
        config.tenantId,
        entityType,
        config.providerId
      );

      for (const localEntity of localEntities) {
        if (!sourceIdSet.has(localEntity.sourceId)) {
          // Entity was deleted from source
          await this.softDeleteEntity(
            config.tenantId,
            entityType,
            localEntity.id,
            'removed_from_source'
          );
          deletes++;
        }
      }
    }

    return { deletes };
  }

  /**
   * Create a new entity from source data
   */
  private async createEntity(
    config: SyncConfig,
    entityType: SyncEntityType,
    record: DeltaRecord
  ): Promise<void> {
    const mappings = config.fieldMappings[entityType] || [];
    const mappedData = this.applyFieldMappings(record.sourceData, mappings);

    // Add common fields
    const entityData = {
      ...mappedData,
      tenantId: config.tenantId,
      sourceSystem: config.provider.type,
      sourceId: record.sourceId,
      sourceHash: record.currentHash,
      syncedAt: new Date(),
    };

    // Create based on entity type
    switch (entityType) {
      case 'org':
        await this.prisma.sisRawSchool.create({
          data: {
            tenantId: config.tenantId,
            providerId: config.providerId,
            externalId: record.sourceId,
            rawJson: JSON.stringify(record.sourceData),
            name: entityData.name,
            schoolNumber: entityData.schoolNumber,
            processed: true,
          },
        });
        break;
      case 'student':
        await this.createStudent(config.tenantId, config.providerId, entityData);
        break;
      case 'teacher':
        await this.createTeacher(config.tenantId, config.providerId, entityData);
        break;
      case 'parent':
        await this.createParent(config.tenantId, config.providerId, entityData);
        break;
      case 'class':
        await this.prisma.sisRawClass.create({
          data: {
            tenantId: config.tenantId,
            providerId: config.providerId,
            externalId: record.sourceId,
            rawJson: JSON.stringify(record.sourceData),
            name: entityData.name,
            courseCode: entityData.courseCode,
            subject: entityData.subject,
            grade: entityData.grade,
            processed: true,
          },
        });
        break;
      case 'enrollment':
        await this.createEnrollment(config.tenantId, config.providerId, entityData);
        break;
      case 'relationship':
        await this.createRelationship(config.tenantId, entityData);
        break;
      case 'term':
        await this.prisma.academicTerm.create({
          data: {
            tenantId: config.tenantId,
            name: entityData.name,
            type: entityData.type || 'semester',
            schoolYear: entityData.schoolYear || new Date().getFullYear(),
            beginDate: entityData.beginDate || new Date(),
            endDate: entityData.endDate || new Date(),
            sourceSystem: entityData.sourceSystem,
            sourceId: entityData.sourceId,
            sourceHash: entityData.sourceHash,
            syncedAt: entityData.syncedAt,
          },
        });
        break;
      case 'demographic':
        await this.updateStudentDemographics(config.tenantId, entityData);
        break;
    }
  }

  /**
   * Update an existing entity
   */
  private async updateEntity(
    config: SyncConfig,
    entityType: SyncEntityType,
    existing: any,
    record: DeltaRecord,
    newHash: string
  ): Promise<void> {
    const mappings = config.fieldMappings[entityType] || [];
    const mappedData = this.applyFieldMappings(record.sourceData, mappings);

    const updateData = {
      ...mappedData,
      sourceHash: newHash,
      syncedAt: new Date(),
      processed: true,
    };

    // Update based on entity type
    switch (entityType) {
      case 'org':
        await this.prisma.sisRawSchool.update({
          where: { id: existing.id },
          data: {
            rawJson: JSON.stringify(record.sourceData),
            name: updateData.name,
            schoolNumber: updateData.schoolNumber,
            processed: true,
          },
        });
        break;
      case 'student':
      case 'teacher':
      case 'parent':
        await this.prisma.sisRawUser.update({
          where: { id: existing.id },
          data: {
            rawJson: JSON.stringify(record.sourceData),
            firstName: updateData.givenName,
            lastName: updateData.familyName,
            email: updateData.email,
            processed: true,
          },
        });
        break;
      case 'class':
        await this.prisma.sisRawClass.update({
          where: { id: existing.id },
          data: {
            rawJson: JSON.stringify(record.sourceData),
            name: updateData.name,
            courseCode: updateData.courseCode,
            subject: updateData.subject,
            grade: updateData.grade,
            processed: true,
          },
        });
        break;
      case 'enrollment':
        await this.prisma.sisRawEnrollment.update({
          where: { id: existing.id },
          data: {
            rawJson: JSON.stringify(record.sourceData),
            role: updateData.role,
            processed: true,
          },
        });
        break;
      case 'relationship':
        await this.updateRelationship(existing.id, updateData);
        break;
      case 'term':
        await this.prisma.academicTerm.update({
          where: { id: existing.id },
          data: {
            name: updateData.name,
            type: updateData.type,
            schoolYear: updateData.schoolYear,
            beginDate: updateData.beginDate,
            endDate: updateData.endDate,
            sourceHash: updateData.sourceHash,
            syncedAt: updateData.syncedAt,
          },
        });
        break;
      case 'demographic':
        await this.updateStudentDemographics(config.tenantId, {
          ...updateData,
          studentSourceId: existing.studentSourceId,
        });
        break;
    }
  }

  /**
   * Create a student record
   */
  private async createStudent(
    tenantId: string,
    providerId: string,
    data: any
  ): Promise<void> {
    await this.prisma.sisRawUser.create({
      data: {
        tenantId,
        providerId,
        externalId: data.sourceId,
        rawJson: JSON.stringify(data),
        sisRole: 'student',
        email: data.email,
        firstName: data.givenName,
        lastName: data.familyName,
        studentNumber: data.studentNumber,
        grade: data.gradeLevel,
        processed: true,
      },
    });
  }

  /**
   * Create a teacher record
   */
  private async createTeacher(
    tenantId: string,
    providerId: string,
    data: any
  ): Promise<void> {
    await this.prisma.sisRawUser.create({
      data: {
        tenantId,
        providerId,
        externalId: data.sourceId,
        rawJson: JSON.stringify(data),
        sisRole: 'teacher',
        email: data.email,
        firstName: data.givenName,
        lastName: data.familyName,
        processed: true,
      },
    });
  }

  /**
   * Create a parent record
   */
  private async createParent(
    tenantId: string,
    providerId: string,
    data: any
  ): Promise<void> {
    await this.prisma.sisRawUser.create({
      data: {
        tenantId,
        providerId,
        externalId: data.sourceId,
        rawJson: JSON.stringify(data),
        sisRole: 'parent',
        email: data.email,
        firstName: data.givenName,
        lastName: data.familyName,
        processed: true,
      },
    });
  }

  /**
   * Create an enrollment (student-class relationship)
   */
  private async createEnrollment(
    tenantId: string,
    providerId: string,
    data: any
  ): Promise<void> {
    await this.prisma.sisRawEnrollment.create({
      data: {
        tenantId,
        providerId,
        externalId: data.sourceId,
        userExternalId: data.studentSourceId,
        classExternalId: data.classSourceId,
        rawJson: JSON.stringify(data),
        role: data.role || 'student',
        startDate: data.beginDate,
        endDate: data.endDate,
        processed: true,
      },
    });
  }

  /**
   * Create a parent-student relationship
   */
  private async createRelationship(tenantId: string, data: any): Promise<void> {
    // Find parent and student by source IDs
    const parent = await this.prisma.sisRawUser.findFirst({
      where: {
        tenantId,
        externalId: data.parentSourceId,
        sisRole: 'parent',
      },
    });

    const student = await this.prisma.sisRawUser.findFirst({
      where: {
        tenantId,
        externalId: data.studentSourceId,
        sisRole: 'student',
      },
    });

    if (!parent || !student) {
      throw new Error('Cannot create relationship: parent or student not found');
    }

    await this.prisma.parentStudentRelationship.create({
      data: {
        tenantId,
        parentExternalId: data.parentSourceId,
        studentExternalId: data.studentSourceId,
        relationshipType: data.relationshipType || 'guardian',
        isPrimary: data.isPrimary || false,
        legalGuardian: data.legalGuardian ?? true,
        emergencyContact: data.emergencyContact ?? false,
        pickupAuthorized: data.pickupAuthorized ?? false,
        receivesMailing: data.receivesMailing ?? true,
        residesWithStudent: data.residesWithStudent,
        sourceSystem: data.sourceSystem,
        sourceId: data.sourceId,
        sourceHash: data.sourceHash,
        syncedAt: data.syncedAt,
      },
    });
  }

  /**
   * Update student demographics
   */
  private async updateStudentDemographics(
    tenantId: string,
    data: any
  ): Promise<void> {
    const student = await this.prisma.sisRawUser.findFirst({
      where: {
        tenantId,
        externalId: data.studentSourceId,
        sisRole: 'student',
      },
    });

    if (!student) {
      throw new Error('Cannot update demographics: student not found');
    }

    await this.prisma.studentDemographic.upsert({
      where: {
        tenantId_studentExternalId: {
          tenantId,
          studentExternalId: data.studentSourceId,
        },
      },
      create: {
        tenantId,
        studentExternalId: data.studentSourceId,
        race: data.race || [],
        ethnicity: data.ethnicity,
        hispanicLatino: data.hispanicLatino,
        language: data.language,
        homeLanguage: data.homeLanguage,
        countryOfBirth: data.countryOfBirth,
        immigrantStatus: data.immigrantStatus,
        section504: data.section504,
        iep: data.iep,
        ell: data.ell,
        homeless: data.homeless,
        migrant: data.migrant,
        freeReducedLunch: data.freeReducedLunch,
        sourceSystem: data.sourceSystem,
        sourceId: data.sourceId,
        sourceHash: data.sourceHash,
        syncedAt: data.syncedAt,
      },
      update: {
        race: data.race,
        ethnicity: data.ethnicity,
        hispanicLatino: data.hispanicLatino,
        language: data.language,
        homeLanguage: data.homeLanguage,
        countryOfBirth: data.countryOfBirth,
        immigrantStatus: data.immigrantStatus,
        section504: data.section504,
        iep: data.iep,
        ell: data.ell,
        homeless: data.homeless,
        migrant: data.migrant,
        freeReducedLunch: data.freeReducedLunch,
        sourceHash: data.sourceHash,
        syncedAt: data.syncedAt,
      },
    });
  }

  /**
   * Apply field mappings to transform source data
   */
  private applyFieldMappings(
    sourceData: Record<string, any>,
    mappings: FieldMapping[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      let value = this.getNestedValue(sourceData, mapping.sourceField);

      // Apply transform if specified
      if (mapping.transform && value !== undefined) {
        value = this.applyTransform(value, mapping.transform);
      }

      // Use default value if needed
      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Check required
      if (value === undefined && mapping.required) {
        throw new Error(`Required field ${mapping.sourceField} is missing`);
      }

      if (value !== undefined) {
        this.setNestedValue(result, mapping.targetField, value);
      }
    }

    return result;
  }

  /**
   * Apply a transform function to a value
   */
  private applyTransform(value: any, transform: string): any {
    switch (transform) {
      case 'lowercase':
        return String(value).toLowerCase();
      case 'uppercase':
        return String(value).toUpperCase();
      case 'trim':
        return String(value).trim();
      case 'parseDate':
        return new Date(value);
      case 'parseInteger':
        return parseInt(value, 10);
      case 'parseFloat':
        return parseFloat(value);
      case 'parseBoolean':
        return value === 'true' || value === '1' || value === true;
      case 'gradeToNumber':
        return this.gradeToNumber(value);
      case 'normalizeGender':
        return this.normalizeGender(value);
      case 'normalizeRole':
        return this.normalizeRole(value);
      default:
        return value;
    }
  }

  /**
   * Convert grade level string to number
   */
  private gradeToNumber(grade: string): number {
    const gradeMap: Record<string, number> = {
      PK: -1, PreK: -1, 'Pre-K': -1, Preschool: -1,
      K: 0, KG: 0, Kindergarten: 0,
      '1': 1, '01': 1, '1st': 1, First: 1,
      '2': 2, '02': 2, '2nd': 2, Second: 2,
      '3': 3, '03': 3, '3rd': 3, Third: 3,
      '4': 4, '04': 4, '4th': 4, Fourth: 4,
      '5': 5, '05': 5, '5th': 5, Fifth: 5,
      '6': 6, '06': 6, '6th': 6, Sixth: 6,
      '7': 7, '07': 7, '7th': 7, Seventh: 7,
      '8': 8, '08': 8, '8th': 8, Eighth: 8,
      '9': 9, '09': 9, '9th': 9, Ninth: 9, Freshman: 9,
      '10': 10, '10th': 10, Tenth: 10, Sophomore: 10,
      '11': 11, '11th': 11, Eleventh: 11, Junior: 11,
      '12': 12, '12th': 12, Twelfth: 12, Senior: 12,
    };

    return gradeMap[grade] ?? parseInt(grade, 10) || 0;
  }

  /**
   * Normalize gender values
   */
  private normalizeGender(gender: string): string {
    const normalized = gender?.toLowerCase().trim();
    if (['m', 'male', 'boy'].includes(normalized)) return 'male';
    if (['f', 'female', 'girl'].includes(normalized)) return 'female';
    if (['x', 'non-binary', 'nonbinary', 'other'].includes(normalized)) return 'non-binary';
    return 'not-specified';
  }

  /**
   * Normalize role values
   */
  private normalizeRole(role: string): string {
    const normalized = role?.toLowerCase().trim();
    if (['student', 'learner', 'pupil'].includes(normalized)) return 'student';
    if (['teacher', 'instructor', 'educator'].includes(normalized)) return 'teacher';
    if (['parent', 'guardian', 'caregiver'].includes(normalized)) return 'parent';
    if (['admin', 'administrator', 'staff'].includes(normalized)) return 'admin';
    return role;
  }

  /**
   * Calculate hash of data for change detection
   */
  calculateHash(data: Record<string, any>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Find existing entity by source ID
   */
  private async findExistingEntity(
    tenantId: string,
    entityType: SyncEntityType,
    sourceId: string,
    _providerId: string
  ): Promise<any> {
    switch (entityType) {
      case 'org':
        return this.prisma.sisRawSchool.findFirst({
          where: { tenantId, externalId: sourceId },
        });
      case 'student':
      case 'teacher':
      case 'parent':
        return this.prisma.sisRawUser.findFirst({
          where: { tenantId, externalId: sourceId },
        });
      case 'class':
        return this.prisma.sisRawClass.findFirst({
          where: { tenantId, externalId: sourceId },
        });
      case 'enrollment':
        return this.prisma.sisRawEnrollment.findFirst({
          where: { tenantId, externalId: sourceId },
        });
      case 'relationship':
        return this.prisma.parentStudentRelationship.findFirst({
          where: { tenantId, sourceId },
        });
      case 'term':
        return this.prisma.academicTerm.findFirst({
          where: { tenantId, sourceId },
        });
      default:
        return null;
    }
  }

  /**
   * Create a sync conflict for manual resolution
   */
  private async createConflict(
    config: SyncConfig,
    entityType: SyncEntityType,
    existing: any,
    record: DeltaRecord
  ): Promise<SyncConflict> {
    const mappings = config.fieldMappings[entityType] || [];
    const mappedData = this.applyFieldMappings(record.sourceData, mappings);

    // Detect field-level conflicts
    for (const [field, newValue] of Object.entries(mappedData)) {
      const existingValue = existing[field];

      if (existingValue !== newValue && existingValue !== undefined) {
        const conflict = await this.prisma.syncConflict.create({
          data: {
            tenantId: config.tenantId,
            entityType,
            entityId: existing.id,
            field,
            sourceValue: newValue,
            targetValue: existingValue,
            sourceSystem: config.provider.type,
            status: 'pending',
          },
        });
        return conflict as unknown as SyncConflict;
      }
    }

    // Return a default conflict if no field-level conflicts found
    return {
      id: '',
      tenantId: config.tenantId,
      entityType,
      entityId: existing.id,
      sourceValue: null,
      targetValue: null,
      field: '',
      createdAt: new Date(),
    };
  }

  /**
   * Helper: Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helper: Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Helper: Delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Sync state management methods

  private async getSyncState(
    tenantId: string,
    providerId: string
  ): Promise<SyncState | null> {
    const state = await this.prisma.deltaSyncState.findFirst({
      where: { tenantId, providerId },
    });
    return state as unknown as SyncState | null;
  }

  private async createSyncState(config: SyncConfig): Promise<SyncState> {
    const state = await this.prisma.deltaSyncState.create({
      data: {
        tenantId: config.tenantId,
        providerId: config.providerId,
        providerType: config.provider.type,
        lastSyncTime: new Date(0),
        entityCursors: {},
        status: 'idle',
        stats: createEmptySyncStats(),
      },
    });
    return state as unknown as SyncState;
  }

  private async updateSyncStatus(
    syncStateId: string,
    status: SyncState['status'],
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.deltaSyncState.update({
      where: { id: syncStateId },
      data: { status, errorMessage },
    });
  }

  private async updateEntityCursor(
    syncStateId: string,
    entityType: SyncEntityType,
    cursor: string
  ): Promise<void> {
    const state = await this.prisma.deltaSyncState.findUnique({
      where: { id: syncStateId },
    });

    const cursors = (state?.entityCursors as Record<string, string>) || {};
    cursors[entityType] = cursor;

    await this.prisma.deltaSyncState.update({
      where: { id: syncStateId },
      data: { entityCursors: cursors },
    });
  }

  private async completeSyncState(
    syncStateId: string,
    stats: SyncStats
  ): Promise<void> {
    await this.prisma.deltaSyncState.update({
      where: { id: syncStateId },
      data: {
        status: 'idle',
        lastSyncTime: new Date(),
        stats: stats as any,
        errorMessage: null,
      },
    });
  }

  private async getLocalEntities(
    tenantId: string,
    entityType: SyncEntityType,
    providerId: string
  ): Promise<Array<{ id: string; sourceId: string }>> {
    switch (entityType) {
      case 'org':
        return this.prisma.sisRawSchool
          .findMany({
            where: { tenantId, providerId },
            select: { id: true, externalId: true },
          })
          .then((results) =>
            results.map((r) => ({ id: r.id, sourceId: r.externalId }))
          );
      case 'student':
      case 'teacher':
      case 'parent':
        return this.prisma.sisRawUser
          .findMany({
            where: { tenantId, providerId },
            select: { id: true, externalId: true },
          })
          .then((results) =>
            results.map((r) => ({ id: r.id, sourceId: r.externalId }))
          );
      case 'class':
        return this.prisma.sisRawClass
          .findMany({
            where: { tenantId, providerId },
            select: { id: true, externalId: true },
          })
          .then((results) =>
            results.map((r) => ({ id: r.id, sourceId: r.externalId }))
          );
      case 'enrollment':
        return this.prisma.sisRawEnrollment
          .findMany({
            where: { tenantId, providerId },
            select: { id: true, externalId: true },
          })
          .then((results) =>
            results.map((r) => ({ id: r.id, sourceId: r.externalId }))
          );
      default:
        return [];
    }
  }

  private async softDeleteEntity(
    _tenantId: string,
    entityType: SyncEntityType,
    entityId: string,
    _reason: string
  ): Promise<void> {
    // Soft delete by setting processed to false (marking as inactive)
    switch (entityType) {
      case 'org':
        await this.prisma.sisRawSchool.update({
          where: { id: entityId },
          data: { processed: false },
        });
        break;
      case 'student':
      case 'teacher':
      case 'parent':
        await this.prisma.sisRawUser.update({
          where: { id: entityId },
          data: { processed: false },
        });
        break;
      case 'class':
        await this.prisma.sisRawClass.update({
          where: { id: entityId },
          data: { processed: false },
        });
        break;
      case 'enrollment':
        await this.prisma.sisRawEnrollment.update({
          where: { id: entityId },
          data: { processed: false },
        });
        break;
    }
  }

  private async deleteEntity(
    _tenantId: string,
    entityType: SyncEntityType,
    entityId: string
  ): Promise<void> {
    // For most entity types, we soft delete
    await this.softDeleteEntity(_tenantId, entityType, entityId, 'deleted');
  }

  private async trackSyncHistory(
    tenantId: string,
    entityType: SyncEntityType,
    record: DeltaRecord,
    operation: SyncOperation
  ): Promise<void> {
    await this.prisma.syncHistory.create({
      data: {
        tenantId,
        entityType,
        entityId: record.sourceId,
        operation,
        sourceData: record.sourceData,
        timestamp: new Date(),
      },
    });
  }

  private async logSyncError(
    tenantId: string,
    entityType: SyncEntityType,
    sourceId: string,
    error: string
  ): Promise<void> {
    await this.prisma.syncError.create({
      data: {
        tenantId,
        entityType,
        sourceId,
        error,
        timestamp: new Date(),
      },
    });
  }

  private async updateRelationship(id: string, data: any): Promise<void> {
    await this.prisma.parentStudentRelationship.update({
      where: { id },
      data: {
        relationshipType: data.relationshipType,
        isPrimary: data.isPrimary,
        legalGuardian: data.legalGuardian,
        emergencyContact: data.emergencyContact,
        pickupAuthorized: data.pickupAuthorized,
        receivesMailing: data.receivesMailing,
        residesWithStudent: data.residesWithStudent,
        sourceHash: data.sourceHash,
        syncedAt: data.syncedAt,
      },
    });
  }
}
