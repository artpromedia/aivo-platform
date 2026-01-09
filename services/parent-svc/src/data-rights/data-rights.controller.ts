/**
 * Data Rights Controller
 *
 * Implements FERPA/GDPR parent data rights endpoints:
 * - GET /parent/students/{id}/data/export - Export all student data
 * - POST /parent/students/{id}/data/delete - Request data deletion
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import { Controller, Get, Post, Param, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataRightsService } from './data-rights.service.js';
import { ParentAuthGuard } from '../auth/parent-auth.guard.js';
import { CurrentParent } from '../auth/current-parent.decorator.js';

interface ParentPayload {
  id: string;
  email: string;
  tenantId: string;
}

interface DeleteRequestDto {
  reason?: string;
  confirmEmail: string;
}

@ApiTags('Parent Data Rights')
@Controller('parent/students')
@UseGuards(ParentAuthGuard)
@ApiBearerAuth()
export class DataRightsController {
  constructor(private readonly dataRightsService: DataRightsService) {}

  /**
   * Export all data for a linked student
   *
   * FERPA: Parents have the right to inspect and review education records
   * GDPR: Right to data portability (Article 20)
   */
  @Get(':studentId/data/export')
  @ApiOperation({ summary: 'Export all student data (FERPA/GDPR compliance)' })
  @ApiResponse({ status: 200, description: 'Data export initiated' })
  @ApiResponse({ status: 403, description: 'Not authorized to access this student' })
  async exportStudentData(
    @Param('studentId') studentId: string,
    @CurrentParent() parent: ParentPayload,
    @Res() res: Response
  ): Promise<void> {
    // Verify parent has access to this student
    await this.dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    // Generate export
    const exportData = await this.dataRightsService.generateDataExport(
      studentId,
      parent.id,
      parent.tenantId
    );

    // Set headers for JSON download
    const filename = `student-data-export-${studentId}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Data-Export-Id', exportData.exportId);

    res.json(exportData);
  }

  /**
   * Request deletion of all student data
   *
   * FERPA: Parents can request deletion of inaccurate records
   * GDPR: Right to erasure / "Right to be forgotten" (Article 17)
   *
   * Note: This creates a deletion request that will be processed
   * within 30 days per GDPR requirements.
   */
  @Post(':studentId/data/delete')
  @ApiOperation({ summary: 'Request student data deletion (FERPA/GDPR compliance)' })
  @ApiResponse({ status: 202, description: 'Deletion request accepted' })
  @ApiResponse({ status: 403, description: 'Not authorized to access this student' })
  async requestDataDeletion(
    @Param('studentId') studentId: string,
    @CurrentParent() parent: ParentPayload,
    @Body() dto: DeleteRequestDto,
    @Req() req: Request
  ): Promise<{ requestId: string; status: string; estimatedCompletion: string; message: string }> {
    // Verify parent has access to this student
    await this.dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    // Verify email confirmation matches
    if (dto.confirmEmail.toLowerCase() !== parent.email.toLowerCase()) {
      throw new Error('Email confirmation does not match your account email');
    }

    // Create deletion request
    const request = await this.dataRightsService.createDeletionRequest({
      parentId: parent.id,
      studentId,
      tenantId: parent.tenantId,
      reason: dto.reason || 'Parent requested data deletion',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    // Calculate estimated completion (30 days per GDPR)
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 30);

    return {
      requestId: request.id,
      status: 'pending',
      estimatedCompletion: estimatedCompletion.toISOString().split('T')[0] || '',
      message: 'Your data deletion request has been received. We will process it within 30 days and notify you upon completion. You will receive a confirmation email.',
    };
  }

  /**
   * Get status of a deletion request
   */
  @Get(':studentId/data/delete/:requestId/status')
  @ApiOperation({ summary: 'Check data deletion request status' })
  async getDeletionStatus(
    @Param('studentId') studentId: string,
    @Param('requestId') requestId: string,
    @CurrentParent() parent: ParentPayload
  ): Promise<{ requestId: string; status: string; createdAt: string; completedAt?: string }> {
    await this.dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    const request = await this.dataRightsService.getDeletionRequest(requestId, parent.id);

    return {
      requestId: request.id,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      completedAt: request.completedAt?.toISOString(),
    };
  }
}
