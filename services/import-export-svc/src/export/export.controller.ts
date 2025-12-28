// ══════════════════════════════════════════════════════════════════════════════
// EXPORT CONTROLLER
// REST endpoints for content export to SCORM, QTI, Common Cartridge, xAPI
// ══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId, UserId } from '../auth/auth.decorators';
import { ExportService } from './export.service';
import {
  CreateExportDto,
  ExportJobDto,
  ListExportsQueryDto,
  ExportListResponseDto,
} from './export.dto';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('api/v1/export')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // ============================================================================
  // EXPORT OPERATIONS
  // ============================================================================

  @Post()
  @Roles('admin', 'teacher', 'author')
  @ApiOperation({ summary: 'Start a new content export' })
  @ApiResponse({ status: 201, description: 'Export job created', type: ExportJobDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createExport(
    @Body(ValidationPipe) dto: CreateExportDto,
    @UserId() userId: string,
    @TenantId() tenantId: string,
  ): Promise<ExportJobDto> {
    const job = await this.exportService.startExport(
      userId,
      tenantId,
      dto.contentType,
      dto.contentIds,
      dto.format,
      dto.options,
    );

    return this.toExportJobDto(job);
  }

  @Get()
  @Roles('admin', 'teacher', 'author')
  @ApiOperation({ summary: 'List export jobs' })
  @ApiResponse({ status: 200, description: 'List of export jobs', type: ExportListResponseDto })
  async listExports(
    @Query(ValidationPipe) query: ListExportsQueryDto,
    @TenantId() tenantId: string,
  ): Promise<ExportListResponseDto> {
    const { jobs, total } = await this.exportService.listExportJobs(tenantId, {
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      format: query.format,
    });

    return {
      jobs: jobs.map(j => this.toExportJobDto(j)),
      total,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };
  }

  @Get(':jobId')
  @Roles('admin', 'teacher', 'author')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Export job details', type: ExportJobDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getExport(
    @Param('jobId') jobId: string,
  ): Promise<ExportJobDto> {
    const job = await this.exportService.getExportJob(jobId);
    return this.toExportJobDto(job);
  }

  @Delete(':jobId')
  @Roles('admin', 'teacher', 'author')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an export job' })
  @ApiResponse({ status: 204, description: 'Export cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed job' })
  async cancelExport(
    @Param('jobId') jobId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.exportService.cancelExport(jobId, userId);
  }

  @Post(':jobId/regenerate-url')
  @Roles('admin', 'teacher', 'author')
  @ApiOperation({ summary: 'Regenerate download URL for export' })
  @ApiResponse({ status: 200, description: 'New download URL' })
  async regenerateUrl(
    @Param('jobId') jobId: string,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.exportService.regenerateDownloadUrl(jobId);
    return { downloadUrl };
  }

  @Get(':jobId/download')
  @Roles('admin', 'teacher', 'author')
  @ApiOperation({ summary: 'Redirect to download URL' })
  @ApiResponse({ status: 302, description: 'Redirect to S3 presigned URL' })
  async downloadExport(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    const job = await this.exportService.getExportJob(jobId);
    
    if (job.status !== 'completed' || !job.result?.downloadUrl) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'Export not ready' });
      return;
    }

    // Regenerate if expired
    let downloadUrl = job.result.downloadUrl;
    if (job.result.expiresAt && new Date(job.result.expiresAt) < new Date()) {
      downloadUrl = await this.exportService.regenerateDownloadUrl(jobId);
    }

    res.redirect(downloadUrl);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private toExportJobDto(job: any): ExportJobDto {
    return {
      id: job.id,
      contentType: job.contentType,
      contentIds: job.contentIds,
      format: job.format,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      fileName: job.result?.fileName,
      fileSize: job.result?.fileSize,
      downloadUrl: job.result?.downloadUrl,
      expiresAt: job.result?.expiresAt,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
