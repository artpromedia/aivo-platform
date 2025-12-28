/**
 * Content Import Service
 *
 * Handles import of learning content from various standards:
 * - SCORM 1.2 and 2004 packages
 * - QTI 2.1 and 3.0 assessments
 * - Common Cartridge packages
 * - Generic content archives
 *
 * Features:
 * - Auto-detection of package format
 * - Validation before import
 * - Progress tracking
 * - Error recovery
 * - Bulk operations
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQS, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import AdmZip from 'adm-zip';
import * as path from 'node:path';
import * as xml2js from 'xml2js';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { SCORMImporter } from './importers/scorm.importer';
import { QTIImporter } from './importers/qti.importer';
import { CommonCartridgeImporter } from './importers/common-cartridge.importer';
import { ContentValidator } from './validators/content.validator';
import { ContentMapper } from './mappers/content.mapper';
import {
  ImportJob,
  ImportResult,
  ImportOptions,
  ContentPackage,
  PackageFormat,
  ValidationResult,
} from './import.types';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly s3: S3;
  private readonly sqs: SQS;
  private readonly bucketName: string;
  private readonly queueUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly scormImporter: SCORMImporter,
    private readonly qtiImporter: QTIImporter,
    private readonly ccImporter: CommonCartridgeImporter,
    private readonly validator: ContentValidator,
    private readonly mapper: ContentMapper,
  ) {
    this.s3 = new S3({ region: config.get('AWS_REGION', 'us-east-1') });
    this.sqs = new SQS({ region: config.get('AWS_REGION', 'us-east-1') });
    this.bucketName = config.get('CONTENT_BUCKET', 'aivo-content');
    this.queueUrl = config.get('IMPORT_QUEUE_URL', '');
  }

  // ============================================================================
  // IMPORT OPERATIONS
  // ============================================================================

  /**
   * Start an import job
   */
  async startImport(
    userId: string,
    tenantId: string,
    fileKey: string,
    options: ImportOptions = {}
  ): Promise<ImportJob> {
    const jobId = uuidv4();

    this.logger.log(`Starting import job: ${jobId} for user: ${userId}, file: ${fileKey}`);

    // Create import job record
    const job = await this.prisma.importJob.create({
      data: {
        id: jobId,
        userId,
        tenantId,
        sourceFile: fileKey,
        status: 'pending',
        options: options as Record<string, unknown>,
        createdAt: new Date(),
      },
    });

    // Queue the import for async processing
    if (options.async !== false) {
      await this.queueImportJob(jobId);
      return this.toImportJob(job);
    }

    // Process synchronously for small files
    return this.processImport(jobId);
  }

  /**
   * Process an import job
   */
  async processImport(jobId: string): Promise<ImportJob> {
    const startTime = Date.now();

    try {
      // Get job details
      const job = await this.prisma.importJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new BadRequestException('Import job not found');
      }

      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', { startedAt: new Date() });

      // Download and extract package
      const packageData = await this.downloadAndExtract(job.sourceFile);

      // Detect format
      const format = await this.detectFormat(packageData);
      await this.updateJobProgress(jobId, 10, `Detected format: ${format}`);

      this.logger.log(`Detected package format: ${format} for job: ${jobId}`);

      // Validate package
      const validationResult = await this.validatePackage(packageData, format);
      await this.updateJobProgress(jobId, 20, 'Validation complete');

      const jobOptions = job.options as ImportOptions | null;
      if (!validationResult.valid && !jobOptions?.skipValidation) {
        await this.updateJobStatus(jobId, 'failed', {
          error: 'Validation failed',
          validationErrors: validationResult.errors,
        });
        throw new BadRequestException(
          `Package validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Import based on format
      let result: ImportResult;

      switch (format) {
        case 'scorm_1.2':
        case 'scorm_2004':
          result = await this.scormImporter.import(
            packageData,
            job.tenantId,
            job.userId,
            {
              ...jobOptions,
              onProgress: (progress) => {
                void this.updateJobProgress(jobId, 20 + progress * 0.7, '');
              },
            }
          );
          break;

        case 'qti_2.1':
        case 'qti_3.0':
          result = await this.qtiImporter.import(
            packageData,
            job.tenantId,
            job.userId,
            {
              ...jobOptions,
              onProgress: (progress) => {
                void this.updateJobProgress(jobId, 20 + progress * 0.7, '');
              },
            }
          );
          break;

        case 'common_cartridge':
          result = await this.ccImporter.import(
            packageData,
            job.tenantId,
            job.userId,
            {
              ...jobOptions,
              onProgress: (progress) => {
                void this.updateJobProgress(jobId, 20 + progress * 0.7, '');
              },
            }
          );
          break;

        default:
          throw new BadRequestException(`Unsupported format: ${format}`);
      }

      // Store imported content
      await this.storeImportedContent(result, job.tenantId);
      await this.updateJobProgress(jobId, 95, 'Storing content');

      // Update job with results
      await this.updateJobStatus(jobId, 'completed', {
        completedAt: new Date(),
        result: {
          itemsImported: result.items.length,
          warnings: result.warnings,
          format,
        },
      });

      // Cleanup temp files
      await this.cleanup(packageData.tempDir);

      const duration = Date.now() - startTime;
      this.logger.log(`Import completed: job=${jobId}, format=${format}, items=${result.items.length}, duration=${duration}ms`);

      // Emit event
      this.eventEmitter.emit('import.completed', {
        jobId,
        userId: job.userId,
        tenantId: job.tenantId,
        itemsImported: result.items.length,
      });

      return this.getImportJob(jobId);
    } catch (error) {
      this.logger.error(`Import failed: job=${jobId}`, error);

      await this.updateJobStatus(jobId, 'failed', {
        error: (error as Error).message,
        completedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Get import job status
   */
  async getImportJob(jobId: string): Promise<ImportJob> {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    return this.toImportJob(job);
  }

  /**
   * List import jobs for a user
   */
  async listImportJobs(
    userId: string,
    tenantId: string,
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<{ jobs: ImportJob[]; total: number }> {
    const { limit = 20, offset = 0, status } = options;

    const where: Record<string, unknown> = { tenantId };
    if (status) where['status'] = status;

    const [jobs, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.importJob.count({ where }),
    ]);

    return {
      jobs: jobs.map((j: Record<string, unknown>) => this.toImportJob(j)),
      total,
    };
  }

  /**
   * Cancel an import job
   */
  async cancelImport(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    if (job.status !== 'pending' && job.status !== 'processing') {
      throw new BadRequestException('Cannot cancel completed or failed job');
    }

    await this.updateJobStatus(jobId, 'cancelled', {
      cancelledBy: userId,
      cancelledAt: new Date(),
    });
  }

  // ============================================================================
  // FORMAT DETECTION
  // ============================================================================

  /**
   * Detect package format
   */
  async detectFormat(packageData: ContentPackage): Promise<PackageFormat> {
    const files = packageData.files;
    const fileNames = files.map((f) => f.name.toLowerCase());

    // Check for SCORM manifest
    if (fileNames.includes('imsmanifest.xml')) {
      const manifestContent = await this.readFile(packageData, 'imsmanifest.xml');
      const manifest = await this.parseXML(manifestContent);

      // Check SCORM version from manifest
      const schemaVersion = this.getSchemaVersion(manifest);

      if (schemaVersion?.includes('2004') || schemaVersion?.includes('1.3')) {
        return 'scorm_2004';
      }

      if (schemaVersion?.includes('1.2')) {
        return 'scorm_1.2';
      }

      // Check for ADL namespace
      const namespaces = this.getNamespaces(manifest);
      if (namespaces.some((ns) => ns.includes('adlcp') || ns.includes('adlseq'))) {
        return 'scorm_2004';
      }

      // Check if it's Common Cartridge
      if (this.isCommonCartridge(manifest)) {
        return 'common_cartridge';
      }

      // Default to SCORM 1.2 if manifest exists but version unclear
      return 'scorm_1.2';
    }

    // Check for Common Cartridge thin manifest
    if (fileNames.includes('imscc-manifest.xml')) {
      return 'common_cartridge';
    }

    // Check for QTI files
    if (fileNames.some((f) => f.endsWith('.xml'))) {
      for (const file of files.filter((f) => f.name.endsWith('.xml'))) {
        try {
          const content = await this.readFile(packageData, file.name);
          const xml = await this.parseXML(content);

          if (this.isQTI3(xml)) {
            return 'qti_3.0';
          }

          if (this.isQTI21(xml)) {
            return 'qti_2.1';
          }
        } catch {
          // Skip files that can't be parsed
          continue;
        }
      }
    }

    throw new BadRequestException(
      'Unable to detect content format. Please ensure the package is a valid SCORM, QTI, or Common Cartridge file.'
    );
  }

  /**
   * Check if XML is QTI 3.0
   */
  private isQTI3(xml: Record<string, unknown>): boolean {
    const root = Object.keys(xml)[0];
    if (!root) return false;

    const rootElement = xml[root] as Record<string, unknown>;
    const attrs = (rootElement?.['$'] as Record<string, unknown>) ?? {};
    const namespaces = Object.values(attrs).filter((v) => typeof v === 'string');

    return namespaces.some(
      (ns) =>
        ns.includes('imsglobal.org/xsd/qti/v3') ||
        ns.includes('purl.imsglobal.org/spec/qti/v3')
    );
  }

  /**
   * Check if XML is QTI 2.1
   */
  private isQTI21(xml: Record<string, unknown>): boolean {
    const root = Object.keys(xml)[0];
    if (!root) return false;

    const rootElement = xml[root] as Record<string, unknown>;
    const attrs = (rootElement?.['$'] as Record<string, unknown>) ?? {};
    const namespaces = Object.values(attrs).filter((v) => typeof v === 'string');

    return namespaces.some(
      (ns) =>
        ns.includes('imsglobal.org/xsd/imsqti_v2p1') ||
        ns.includes('imsglobal.org/xsd/qti/v2')
    );
  }

  /**
   * Check if manifest is Common Cartridge
   */
  private isCommonCartridge(manifest: Record<string, unknown>): boolean {
    const root =
      (manifest['manifest'] as Record<string, unknown>) ?? manifest;
    const metadata = (root['metadata'] as Array<Record<string, unknown>>)?.[0];

    if (metadata) {
      const schema = (metadata['schema'] as string[])?.[0];
      if (schema && typeof schema === 'string') {
        return (
          schema.toLowerCase().includes('common cartridge') ||
          schema.toLowerCase().includes('imscc')
        );
      }
    }

    // Check namespaces
    const attrs = (root['$'] as Record<string, unknown>) ?? {};
    const namespaces = Object.values(attrs).filter((v) => typeof v === 'string');

    return namespaces.some(
      (ns) =>
        ns.includes('imsccv1') ||
        ns.includes('commoncartridge')
    );
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate package
   */
  async validatePackage(
    packageData: ContentPackage,
    format: PackageFormat
  ): Promise<ValidationResult> {
    return this.validator.validate(packageData, format);
  }

  /**
   * Validate package before upload (quick check)
   */
  async preValidate(
    file: Buffer,
    fileName: string
  ): Promise<{
    valid: boolean;
    format?: PackageFormat;
    errors?: string[];
  }> {
    try {
      // Check file size
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.length > maxSize) {
        return { valid: false, errors: ['File exceeds maximum size of 500MB'] };
      }

      // Check file extension
      const ext = path.extname(fileName).toLowerCase();
      if (!['.zip', '.xml', '.imscc'].includes(ext)) {
        return {
          valid: false,
          errors: [
            'Unsupported file type. Please upload a .zip, .xml, or .imscc file',
          ],
        };
      }

      // For ZIP files, check basic structure
      if (ext === '.zip' || ext === '.imscc') {
        const zip = new AdmZip(file);
        const entries = zip.getEntries();

        if (entries.length === 0) {
          return { valid: false, errors: ['Archive is empty'] };
        }

        // Look for manifest
        const hasManifest = entries.some(
          (e) =>
            e.entryName.toLowerCase() === 'imsmanifest.xml' ||
            e.entryName.toLowerCase() === 'imscc-manifest.xml'
        );

        // Look for QTI files
        const hasQTI = entries.some(
          (e) =>
            e.entryName.toLowerCase().endsWith('.xml') &&
            (e.entryName.toLowerCase().includes('qti') ||
              e.entryName.toLowerCase().includes('assessment'))
        );

        if (!hasManifest && !hasQTI) {
          return {
            valid: false,
            errors: [
              'No manifest or assessment files found. Please ensure this is a valid SCORM, QTI, or Common Cartridge package.',
            ],
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, errors: [(error as Error).message] };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async downloadAndExtract(fileKey: string): Promise<ContentPackage> {
    // Download from S3
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    const response = await this.s3.send(command);
    const buffer = await this.streamToBuffer(response.Body as NodeJS.ReadableStream);

    // Create temp directory
    const tempDir = `/tmp/import_${uuidv4()}`;
    const fs = await import('node:fs/promises');
    await fs.mkdir(tempDir, { recursive: true });

    // Extract if ZIP
    const ext = path.extname(fileKey).toLowerCase();
    let files: Array<{ name: string; path: string; size: number }> = [];

    if (ext === '.zip' || ext === '.imscc') {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(tempDir, true);

      // List extracted files
      files = await this.listFilesRecursive(tempDir);
    } else {
      // Single XML file
      const fileName = path.basename(fileKey);
      const filePath = path.join(tempDir, fileName);
      await fs.writeFile(filePath, buffer);
      files = [{ name: fileName, path: filePath, size: buffer.length }];
    }

    return {
      tempDir,
      files,
      originalFileName: path.basename(fileKey),
      size: buffer.length,
    };
  }

  private async listFilesRecursive(
    dir: string
  ): Promise<Array<{ name: string; path: string; size: number }>> {
    const fs = await import('node:fs/promises');
    const files: Array<{ name: string; path: string; size: number }> = [];

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.listFilesRecursive(fullPath);
        files.push(
          ...subFiles.map((f) => ({
            ...f,
            name: path.join(entry.name, f.name),
          }))
        );
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
        });
      }
    }

    return files;
  }

  private async readFile(
    packageData: ContentPackage,
    fileName: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const file = packageData.files.find(
      (f) =>
        f.name.toLowerCase() === fileName.toLowerCase() ||
        f.name.toLowerCase().endsWith('/' + fileName.toLowerCase())
    );

    if (!file) {
      throw new Error(`File not found: ${fileName}`);
    }

    const fullPath = path.join(packageData.tempDir, file.name);
    return fs.readFile(fullPath, 'utf-8');
  }

  private async parseXML(content: string): Promise<Record<string, unknown>> {
    const parser = new xml2js.Parser({
      explicitArray: true,
      mergeAttrs: false,
      xmlns: true,
    });

    return parser.parseStringPromise(content);
  }

  private getSchemaVersion(manifest: Record<string, unknown>): string | null {
    try {
      const manifestRoot = manifest['manifest'] as Record<string, unknown>;
      const metadata = (manifestRoot?.['metadata'] as Array<Record<string, unknown>>)?.[0];
      if (metadata?.['schemaversion']) {
        return (metadata['schemaversion'] as string[])[0] ?? null;
      }

      return null;
    } catch {
      return null;
    }
  }

  private getNamespaces(manifest: Record<string, unknown>): string[] {
    const root =
      (manifest['manifest'] as Record<string, unknown>) ?? manifest;
    const attrs = (root['$'] as Record<string, unknown>) ?? {};

    return Object.entries(attrs)
      .filter(([key]) => key.startsWith('xmlns'))
      .map(([, value]) => value as string);
  }

  private async storeImportedContent(
    result: ImportResult,
    tenantId: string
  ): Promise<void> {
    // Store each imported item in the database
    for (const item of result.items) {
      await this.prisma.importedContent.create({
        data: {
          id: uuidv4(),
          tenantId,
          externalId: item.externalId,
          type: item.type,
          title: item.title,
          description: item.description,
          contentData: item.data,
          sourceFormat: item.sourceFormat,
          mappedTo: item.mappedTo,
          createdAt: new Date(),
        },
      });
    }
  }

  private async cleanup(tempDir: string): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp directory: ${tempDir}`, error);
    }
  }

  private async queueImportJob(jobId: string): Promise<void> {
    if (!this.queueUrl) {
      // Process synchronously if no queue configured
      return;
    }

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify({ jobId }),
    });

    await this.sqs.send(command);
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    data: Record<string, unknown> = {}
  ): Promise<void> {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status, ...data },
    });
  }

  private async updateJobProgress(
    jobId: string,
    progress: number,
    message: string
  ): Promise<void> {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        progress: Math.round(progress),
        progressMessage: message,
      },
    });

    // Emit progress event for real-time updates
    this.eventEmitter.emit('import.progress', { jobId, progress, message });
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
    }
    return Buffer.concat(chunks);
  }

  private toImportJob(job: Record<string, unknown>): ImportJob {
    const progressMessage = job['progressMessage'] as string | undefined;
    const options = job['options'] as ImportOptions | undefined;
    const error = job['error'] as string | undefined;
    const startedAt = job['startedAt'] as Date | undefined;
    const completedAt = job['completedAt'] as Date | undefined;
    const result = job['result'] as ImportJob['result'];

    const importJob: ImportJob = {
      id: job['id'] as string,
      userId: job['userId'] as string,
      tenantId: job['tenantId'] as string,
      sourceFile: job['sourceFile'] as string,
      status: job['status'] as ImportJob['status'],
      progress: (job['progress'] as number | undefined) ?? 0,
      createdAt: job['createdAt'] as Date,
    };

    // Only set optional properties if they have values
    if (progressMessage !== undefined) importJob.progressMessage = progressMessage;
    if (options !== undefined) importJob.options = options;
    if (result !== undefined) importJob.result = result;
    if (error !== undefined) importJob.error = error;
    if (startedAt !== undefined) importJob.startedAt = startedAt;
    if (completedAt !== undefined) importJob.completedAt = completedAt;

    return importJob;
  }
}
