// ══════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE
// Exports content to SCORM, QTI, Common Cartridge, and xAPI formats
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

import { SCORMExporter } from './exporters/scorm.exporter';
import { QTIExporter } from './exporters/qti.exporter';
import { CommonCartridgeExporter } from './exporters/common-cartridge.exporter';
import { XAPIExporter } from '../xapi/xapi-statement.exporter';
import {
  ExportJob,
  ExportOptions,
  ExportFormat,
  ExportResult,
  ContentType,
  ExportStatus,
} from './export.types';

/**
 * Content Export Service
 * 
 * Exports content to various learning standards:
 * - SCORM 1.2 and 2004 packages
 * - QTI 2.1 and 3.0 assessments
 * - Common Cartridge packages
 * - xAPI statements
 */

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private s3: S3;
  private bucketName: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
    private scormExporter: SCORMExporter,
    private qtiExporter: QTIExporter,
    private ccExporter: CommonCartridgeExporter,
    private xapiExporter: XAPIExporter,
  ) {
    this.s3 = new S3({ region: config.get('AWS_REGION', 'us-east-1') });
    this.bucketName = config.get('CONTENT_BUCKET', 'aivo-content');
  }

  // ============================================================================
  // EXPORT OPERATIONS
  // ============================================================================

  /**
   * Start an export job
   */
  async startExport(
    userId: string,
    tenantId: string,
    contentType: ContentType,
    contentIds: string[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<ExportJob> {
    const jobId = uuidv4();

    this.logger.log(`Starting export job jobId=${jobId} format=${format} contentType=${contentType} count=${contentIds.length}`);

    // Validate content exists
    await this.validateContent(tenantId, contentType, contentIds);

    // Create export job record
    const job = await this.prisma.exportJob.create({
      data: {
        id: jobId,
        userId,
        tenantId,
        contentType,
        contentIds,
        format,
        status: 'pending',
        options: options as unknown,
        createdAt: new Date(),
      },
    });

    // Process export asynchronously
    this.processExport(jobId, tenantId, contentType, contentIds, format, options)
      .catch(error => {
        this.logger.error(`Export processing failed jobId=${jobId}`, error);
      });

    return this.toExportJob(job);
  }

  /**
   * Process an export job
   */
  private async processExport(
    jobId: string,
    tenantId: string,
    contentType: ContentType,
    contentIds: string[],
    format: ExportFormat,
    options: ExportOptions
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to processing
      await this.updateJobStatus(jobId, 'processing');

      let result: ExportResult;

      // Route to appropriate exporter
      switch (format) {
        case 'scorm_1.2':
        case 'scorm_2004':
          result = await this.scormExporter.export(
            tenantId,
            contentType,
            contentIds,
            format === 'scorm_2004' ? '2004' : '1.2',
            {
              ...options,
              onProgress: (progress, message) => 
                this.updateJobProgress(jobId, progress, message),
            }
          );
          break;

        case 'qti_2.1':
        case 'qti_3.0':
          result = await this.qtiExporter.export(
            tenantId,
            contentType,
            contentIds,
            format === 'qti_3.0' ? '3.0' : '2.1',
            {
              ...options,
              onProgress: (progress, message) => 
                this.updateJobProgress(jobId, progress, message),
            }
          );
          break;

        case 'common_cartridge':
          result = await this.ccExporter.export(
            tenantId,
            contentType,
            contentIds,
            {
              ...options,
              onProgress: (progress, message) => 
                this.updateJobProgress(jobId, progress, message),
            }
          );
          break;

        case 'xapi':
          result = await this.xapiExporter.export(
            tenantId,
            contentIds,
            {
              ...options,
              onProgress: (progress, message) => 
                this.updateJobProgress(jobId, progress, message),
            }
          );
          break;

        default:
          throw new BadRequestException(`Unsupported export format: ${format}`);
      }

      // Upload to S3
      const s3Key = `exports/${tenantId}/${jobId}/${result.fileName}`;
      
      await this.s3.putObject({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: result.buffer,
        ContentType: result.contentType,
        Metadata: {
          'export-job-id': jobId,
          'export-format': format,
          'content-type': contentType,
        },
      });

      // Generate presigned URL (7 days)
      const downloadUrl = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucketName, Key: s3Key }),
        { expiresIn: 7 * 24 * 60 * 60 }
      );

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Update job with results
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          fileName: result.fileName,
          fileSize: result.fileSize,
          s3Key,
          downloadUrl,
          expiresAt,
          result: {
            ...result.metadata,
            warnings: result.warnings,
          } as unknown,
          completedAt: new Date(),
        },
      });

      const duration = Date.now() - startTime;
      // TODO: Add metrics service
      // metrics.histogram('export.duration', duration, { format });
      // metrics.increment('export.completed', { format });

      this.logger.log(`Export completed jobId=${jobId} format=${format} fileSize=${result.fileSize} duration=${duration}ms`);

      // Emit event
      this.eventEmitter.emit('export.completed', {
        jobId,
        userId: (await this.getExportJob(jobId)).userId,
        tenantId,
        format,
        downloadUrl,
      });

    } catch (error) {
      this.logger.error(`Export failed jobId=${jobId}`, error);

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: (error as Error).message,
          completedAt: new Date(),
        },
      });

      // TODO: Add metrics service
      // metrics.increment('export.failed', { format });

      this.eventEmitter.emit('export.failed', {
        jobId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<ExportJob> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new BadRequestException('Export job not found');
    }

    return this.toExportJob(job);
  }

  /**
   * List export jobs for a tenant
   */
  async listExportJobs(
    tenantId: string,
    options: { 
      limit?: number; 
      offset?: number; 
      status?: ExportStatus;
      format?: ExportFormat;
    } = {}
  ): Promise<{ jobs: ExportJob[]; total: number }> {
    const { limit = 20, offset = 0, status, format } = options;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (format) where.format = format;

    const [jobs, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jobs: jobs.map((j: any) => this.toExportJob(j)),
      total,
    };
  }

  /**
   * Cancel an export job
   */
  async cancelExport(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new BadRequestException('Export job not found');
    }

    if (job.status !== 'pending' && job.status !== 'processing') {
      throw new BadRequestException('Cannot cancel completed or failed job');
    }

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Regenerate download URL for an export
   */
  async regenerateDownloadUrl(jobId: string): Promise<string> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.s3Key) {
      throw new BadRequestException('Export not found or not completed');
    }

    const downloadUrl = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucketName, Key: job.s3Key }),
      { expiresIn: 7 * 24 * 60 * 60 }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { downloadUrl, expiresAt },
    });

    return downloadUrl;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validate content exists and user has access
   */
  private async validateContent(
    tenantId: string,
    contentType: ContentType,
    contentIds: string[]
  ): Promise<void> {
    let count = 0;

    switch (contentType) {
      case 'lesson':
        count = await this.prisma.lesson.count({
          where: { id: { in: contentIds }, tenantId },
        });
        break;
      case 'assessment':
        count = await this.prisma.assessment.count({
          where: { id: { in: contentIds }, tenantId },
        });
        break;
      case 'question':
        count = await this.prisma.question.count({
          where: { id: { in: contentIds }, tenantId },
        });
        break;
      case 'course':
        count = await this.prisma.course.count({
          where: { id: { in: contentIds }, tenantId },
        });
        break;
    }

    if (count !== contentIds.length) {
      throw new BadRequestException(
        `Some ${contentType}s not found or not accessible`
      );
    }
  }

  private async updateJobStatus(jobId: string, status: ExportStatus): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status },
    });
  }

  private async updateJobProgress(
    jobId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        progress: Math.round(progress),
        progressMessage: message,
      },
    });

    this.eventEmitter.emit('export.progress', { jobId, progress, message });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toExportJob(job: any): ExportJob {
    return {
      id: job.id as string,
      userId: job.userId as string,
      tenantId: job.tenantId as string,
      contentType: job.contentType as ContentType,
      contentIds: job.contentIds as string[],
      format: job.format as ExportFormat,
      status: job.status as ExportStatus,
      progress: job.progress as number,
      progressMessage: job.progressMessage as string | undefined,
      options: job.options as ExportOptions,
      result: job.result as ExportResult | undefined,
      error: job.error as string | undefined,
      createdAt: job.createdAt as Date,
      startedAt: job.startedAt as Date | undefined,
      completedAt: job.completedAt as Date | undefined,
    };
  }
}
