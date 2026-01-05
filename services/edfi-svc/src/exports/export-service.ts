/**
 * Ed-Fi Export Service
 *
 * Handles exporting Aivo data to Ed-Fi ODS/API endpoints.
 */

import { EdfiClient, type EdfiApiVersion } from '../connectors/edfi-client';
import type { PrismaClient } from '../generated/prisma-client';
import {
  transformToEdfiStudent,
  transformToEdfiStudentSchoolAssociation,
  transformToEdfiStudentSectionAssociations,
  type AivoLearner,
  type TransformContext,
} from '../transforms/student-transform';

// Types matching Prisma enums
type ExportStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';
type ResourceType =
  | 'STUDENTS'
  | 'STUDENT_SCHOOL_ASSOCIATIONS'
  | 'STUDENT_SECTION_ASSOCIATIONS'
  | 'STAFF'
  | 'STAFF_SECTION_ASSOCIATIONS'
  | 'SECTIONS'
  | 'COURSES'
  | 'SCHOOLS'
  | 'LOCAL_EDUCATION_AGENCIES'
  | 'STUDENT_ASSESSMENTS'
  | 'GRADES'
  | 'STUDENT_ATTENDANCE_EVENTS'
  | 'LEARNING_STANDARDS'
  | 'INTERVENTIONS'
  | 'CALENDAR_DATES'
  | 'GRADING_PERIODS';

export interface ExportConfig {
  id: string;
  tenantId: string;
  name: string;
  stateCode: string;
  apiVersion: EdfiApiVersion;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  schoolYear: number;
  enabledResources: ResourceType[];
}

export interface ExportOptions {
  resourceTypes?: ResourceType[];
  fullSync?: boolean;
  sinceDate?: Date;
  triggeredBy?: string;
  isManual?: boolean;
}

export interface ExportProgress {
  exportId: string;
  status: ExportStatus;
  resourceProgress: Record<
    string,
    {
      total: number;
      processed: number;
      success: number;
      errors: number;
    }
  >;
  startedAt?: Date;
  completedAt?: Date;
}

export interface LearnerDataSource {
  getLearners(
    tenantId: string,
    options: {
      since?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ learners: AivoLearner[]; hasMore: boolean }>;
  getSchoolMappings(tenantId: string): Promise<Map<string, number>>;
}

export class ExportService {
  constructor(
    private prisma: PrismaClient,
    private learnerDataSource: LearnerDataSource
  ) {}

  /**
   * Start an export run
   */
  async startExport(config: ExportConfig, options: ExportOptions = {}): Promise<string> {
    const resourceTypes = options.resourceTypes || config.enabledResources;

    // Create export run record
    const exportRun = await this.prisma.edfiExportRun.create({
      data: {
        configId: config.id,
        status: 'PENDING',
        resourceTypes,
        fullSync: options.fullSync ?? false,
        sinceDate: options.sinceDate,
        isManual: options.isManual ?? false,
        triggeredBy: options.triggeredBy,
      },
    });

    // Log audit event
    await this.logAudit(config.tenantId, config.id, 'EXPORT_STARTED', {
      exportId: exportRun.id,
      resourceTypes,
      fullSync: options.fullSync,
    });

    // Start async export process
    this.runExport(exportRun.id, config, options).catch((error: unknown) => {
      console.error(`Export ${exportRun.id} failed:`, error);
    });

    return exportRun.id;
  }

  /**
   * Run the export process
   */
  private async runExport(
    exportId: string,
    config: ExportConfig,
    options: ExportOptions
  ): Promise<void> {
    // Update status to running
    await this.prisma.edfiExportRun.update({
      where: { id: exportId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const client = new EdfiClient({
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      apiVersion: config.apiVersion,
      schoolYear: config.schoolYear,
    });

    // Get school ID mappings
    const schoolIdMap = await this.learnerDataSource.getSchoolMappings(config.tenantId);

    const context: TransformContext = {
      schoolYear: config.schoolYear,
      sessionName: `${config.schoolYear - 1}-${config.schoolYear}`,
      stateCode: config.stateCode,
      districtId: 0, // Would be set from config
      schoolIdMap,
    };

    const resourceTypes = options.resourceTypes || config.enabledResources;
    let totalSuccess = 0;
    let totalErrors = 0;

    try {
      // Process each resource type
      for (const resourceType of resourceTypes) {
        const result = await this.exportResourceType(
          exportId,
          config,
          client,
          context,
          resourceType,
          options
        );
        totalSuccess += result.success;
        totalErrors += result.errors;
      }

      // Determine final status
      const status: ExportStatus =
        totalErrors === 0 ? 'SUCCESS' : totalSuccess > 0 ? 'PARTIAL' : 'FAILED';

      await this.prisma.edfiExportRun.update({
        where: { id: exportId },
        data: {
          status,
          successCount: totalSuccess,
          errorCount: totalErrors,
          completedAt: new Date(),
        },
      });

      // Update config last export timestamp
      await this.prisma.edfiConfig.update({
        where: { id: config.id },
        data: {
          lastExportAt: new Date(),
          ...(status === 'SUCCESS' ? { lastSuccessAt: new Date() } : {}),
        },
      });

      await this.logAudit(config.tenantId, config.id, 'EXPORT_COMPLETED', {
        exportId,
        status,
        successCount: totalSuccess,
        errorCount: totalErrors,
      });
    } catch (error) {
      await this.prisma.edfiExportRun.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          errorLog: { message: error instanceof Error ? error.message : 'Unknown error' },
          completedAt: new Date(),
        },
      });

      await this.logAudit(config.tenantId, config.id, 'EXPORT_FAILED', {
        exportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Export a specific resource type
   */
  private async exportResourceType(
    exportId: string,
    config: ExportConfig,
    client: EdfiClient,
    context: TransformContext,
    resourceType: ResourceType,
    options: ExportOptions
  ): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      // Fetch batch of learners
      const result = await this.learnerDataSource.getLearners(config.tenantId, {
        since: options.fullSync ? undefined : options.sinceDate,
        limit,
        offset,
      });

      hasMore = result.hasMore;
      offset += limit;

      // Process based on resource type
      for (const learner of result.learners) {
        try {
          switch (resourceType) {
            case 'STUDENTS':
              await this.exportStudent(exportId, client, learner, context);
              break;
            case 'STUDENT_SCHOOL_ASSOCIATIONS':
              await this.exportStudentSchoolAssociation(exportId, client, learner, context);
              break;
            case 'STUDENT_SECTION_ASSOCIATIONS':
              await this.exportStudentSectionAssociations(exportId, client, learner, context);
              break;
            // Add more resource types as needed
            default:
              console.warn(`Resource type ${resourceType} not implemented`);
          }
          success++;
        } catch (error) {
          errors++;
          await this.recordSubmissionError(
            exportId,
            resourceType,
            learner.id,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      // Update progress
      await this.updateProgress(exportId, success + errors, success, errors);
    }

    return { success, errors };
  }

  /**
   * Export a single student
   */
  private async exportStudent(
    exportId: string,
    client: EdfiClient,
    learner: AivoLearner,
    context: TransformContext
  ): Promise<void> {
    const transformed = transformToEdfiStudent(learner, context);

    if (!transformed.success || !transformed.data) {
      throw new Error(`Transform failed: ${transformed.errors?.join(', ')}`);
    }

    // Submit to Ed-Fi
    const result = await client.upsert('students', transformed.data);

    // Record submission
    await this.prisma.edfiSubmission.create({
      data: {
        exportRunId: exportId,
        resourceType: 'STUDENTS',
        aivoRecordId: learner.id,
        edfiResourceId: result.id,
        status: 'ACCEPTED',
        payloadJson: transformed.data,
        sentAt: new Date(),
        respondedAt: new Date(),
        attempts: 1,
      },
    });
  }

  /**
   * Export student school association
   */
  private async exportStudentSchoolAssociation(
    exportId: string,
    client: EdfiClient,
    learner: AivoLearner,
    context: TransformContext
  ): Promise<void> {
    const transformed = transformToEdfiStudentSchoolAssociation(learner, context);

    if (!transformed.success || !transformed.data) {
      throw new Error(`Transform failed: ${transformed.errors?.join(', ')}`);
    }

    const result = await client.upsert('studentSchoolAssociations', transformed.data);

    await this.prisma.edfiSubmission.create({
      data: {
        exportRunId: exportId,
        resourceType: 'STUDENT_SCHOOL_ASSOCIATIONS',
        aivoRecordId: learner.id,
        edfiResourceId: result.id,
        status: 'ACCEPTED',
        payloadJson: transformed.data,
        sentAt: new Date(),
        respondedAt: new Date(),
        attempts: 1,
      },
    });
  }

  /**
   * Export student section associations
   */
  private async exportStudentSectionAssociations(
    exportId: string,
    client: EdfiClient,
    learner: AivoLearner,
    context: TransformContext
  ): Promise<void> {
    const transformed = transformToEdfiStudentSectionAssociations(learner, context);

    if (!transformed.success || !transformed.data) {
      throw new Error(`Transform failed: ${transformed.errors?.join(', ')}`);
    }

    for (const association of transformed.data) {
      const result = await client.upsert('studentSectionAssociations', association);

      await this.prisma.edfiSubmission.create({
        data: {
          exportRunId: exportId,
          resourceType: 'STUDENT_SECTION_ASSOCIATIONS',
          aivoRecordId: learner.id,
          edfiResourceId: result.id,
          status: 'ACCEPTED',
          payloadJson: association,
          sentAt: new Date(),
          respondedAt: new Date(),
          attempts: 1,
        },
      });
    }
  }

  /**
   * Get export progress
   */
  async getExportProgress(exportId: string): Promise<ExportProgress | null> {
    const run = await this.prisma.edfiExportRun.findUnique({
      where: { id: exportId },
      include: {
        submissions: {
          select: { resourceType: true, status: true },
        },
      },
    });

    if (!run) return null;

    // Calculate per-resource progress
    const resourceProgress: Record<
      string,
      { total: number; processed: number; success: number; errors: number }
    > = {};

    for (const submission of run.submissions) {
      const rt = submission.resourceType;
      if (!resourceProgress[rt]) {
        resourceProgress[rt] = { total: 0, processed: 0, success: 0, errors: 0 };
      }
      resourceProgress[rt].total++;
      resourceProgress[rt].processed++;
      if (submission.status === 'ACCEPTED') {
        resourceProgress[rt].success++;
      } else if (submission.status === 'REJECTED' || submission.status === 'ERROR') {
        resourceProgress[rt].errors++;
      }
    }

    return {
      exportId,
      status: run.status,
      resourceProgress,
      startedAt: run.startedAt || undefined,
      completedAt: run.completedAt || undefined,
    };
  }

  /**
   * Cancel a running export
   */
  async cancelExport(exportId: string): Promise<void> {
    await this.prisma.edfiExportRun.update({
      where: { id: exportId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  /**
   * Get export history for a config
   */
  async getExportHistory(
    configId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ runs: any[]; total: number }> {
    const [runs, total] = await Promise.all([
      this.prisma.edfiExportRun.findMany({
        where: { configId },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 20,
        skip: options?.offset ?? 0,
      }),
      this.prisma.edfiExportRun.count({ where: { configId } }),
    ]);

    return { runs, total };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private async updateProgress(
    exportId: string,
    processed: number,
    success: number,
    errors: number
  ): Promise<void> {
    await this.prisma.edfiExportRun.update({
      where: { id: exportId },
      data: { processedRecords: processed, successCount: success, errorCount: errors },
    });
  }

  private async recordSubmissionError(
    exportId: string,
    resourceType: ResourceType,
    recordId: string,
    errorMessage: string
  ): Promise<void> {
    await this.prisma.edfiSubmission.create({
      data: {
        exportRunId: exportId,
        resourceType,
        aivoRecordId: recordId,
        status: 'ERROR',
        errorMessage,
        payloadJson: {},
        attempts: 1,
      },
    });
  }

  private async logAudit(
    tenantId: string,
    configId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.edfiAuditLog.create({
      data: {
        tenantId,
        configId,
        action,
        actorType: 'SYSTEM',
        details,
      },
    });
  }
}

export default ExportService;
