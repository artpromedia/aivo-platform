/**
 * Data Rights Routes
 *
 * Implements FERPA/GDPR parent data rights endpoints:
 * - GET /parent/students/{id}/data/export - Export all student data (JSON)
 * - POST /parent/students/{id}/data/export-zip - Export as FERPA ZIP package (T2-05)
 * - POST /parent/students/{id}/data/delete - Request data deletion
 * - POST /parent/students/{id}/data/correction - Request record correction (T2-05)
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 * Updated: Sprint T2-05 - FERPA ZIP export, email confirmations, 45-day correction timer
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { BadRequestException } from '../errors.js';
import { generateDataExportZip } from './data-export-zip.service.js';

interface DeleteRequestDto {
  reason?: string;
  confirmEmail: string;
}

interface CorrectionRequestDto {
  recordType: string;
  recordId: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
}

export async function dataRightsRoutes(app: FastifyInstance) {
  const dataRightsService = app.services.dataRights;

  /**
   * Export all data for a linked student (JSON format)
   *
   * FERPA: Parents have the right to inspect and review education records
   * GDPR: Right to data portability (Article 20)
   */
  app.get('/:studentId/data/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId } = request.params as { studentId: string };
    const parent = request.parent!;

    await dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    const exportData = await dataRightsService.generateDataExport(
      studentId,
      parent.id,
      (parent as any).tenantId
    );

    const filename = `student-data-export-${studentId}-${new Date().toISOString().split('T')[0]}.json`;

    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('X-Data-Export-Id', exportData.exportId)
      .send(exportData);
  });

  /**
   * Export all data as a FERPA-compliant ZIP package
   *
   * Sprint T2-05: Generates a ZIP containing:
   *  - Cover letter PDF (explains contents + FERPA rights)
   *  - IEP records PDF (all IEPs with goals, accommodations, services)
   *  - Learning activity CSV
   *  - Assessment results CSV
   *  - Consent records CSV
   *  - Full JSON export
   *
   * Sends email confirmation to parent after export.
   */
  app.post('/:studentId/data/export-zip', async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId } = request.params as { studentId: string };
    const parent = request.parent!;

    await dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    const exportData = await dataRightsService.generateDataExport(
      studentId,
      parent.id,
      (parent as any).tenantId
    );

    // Generate ZIP package
    const zipBuffer = await generateDataExportZip(exportData);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `student-data-export-${studentId}-${dateStr}.zip`;

    // Send email confirmation (fire-and-forget)
    const notificationService = app.services.notification;
    notificationService
      .sendEmail({
        to: parent.email,
        template: 'data-export-confirmation',
        language: (parent as any).language || 'en',
        data: {
          parentName: parent.givenName || 'Parent',
          studentName: exportData.dataCategories.profile.givenName || 'your child',
          exportDate: dateStr,
          exportId: exportData.exportId,
          expiryDays: 7,
        },
      })
      .catch(() => {
        /* email delivery is best-effort */
      });

    return reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('X-Data-Export-Id', exportData.exportId)
      .send(zipBuffer);
  });

  /**
   * Request deletion of all student data
   *
   * FERPA: Parents can request deletion of inaccurate records
   * GDPR: Right to erasure / "Right to be forgotten" (Article 17)
   */
  app.post('/:studentId/data/delete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId } = request.params as { studentId: string };
    const parent = request.parent!;
    const dto = request.body as DeleteRequestDto;

    await dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    if (dto.confirmEmail.toLowerCase() !== parent.email.toLowerCase()) {
      throw new BadRequestException('Email confirmation does not match your account email');
    }

    const deletionRequest = await dataRightsService.createDeletionRequest({
      parentId: parent.id,
      studentId,
      tenantId: (parent as any).tenantId,
      reason: dto.reason || 'Parent requested data deletion',
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
    });

    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 30);

    reply.status(202);
    return {
      requestId: deletionRequest.id,
      status: 'pending',
      estimatedCompletion: estimatedCompletion.toISOString().split('T')[0] || '',
      message:
        'Your data deletion request has been received. We will process it within 30 days and notify you upon completion. You will receive a confirmation email.',
    };
  });

  /**
   * Get status of a deletion request
   */
  app.get('/:studentId/data/delete/:requestId/status', async (request: FastifyRequest) => {
    const { studentId, requestId } = request.params as { studentId: string; requestId: string };
    const parent = request.parent!;

    await dataRightsService.verifyParentStudentAccess(parent.id, studentId);

    const deletionRequest = await dataRightsService.getDeletionRequest(requestId, parent.id);

    return {
      requestId: deletionRequest.id,
      status: deletionRequest.status,
      createdAt: deletionRequest.createdAt.toISOString(),
      completedAt: deletionRequest.completedAt?.toISOString(),
    };
  });

  /**
   * Submit a FERPA correction request
   *
   * FERPA 34 CFR § 99.20: Parents can request amendment of education
   * records they believe are inaccurate, misleading, or in violation
   * of the student's privacy rights.
   *
   * Sprint T2-05: 45-day response deadline with auto-escalation at 40 days
   */
  app.post('/:studentId/data/correction', async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId } = request.params as { studentId: string };
    const parent = request.parent!;
    const dto = request.body as CorrectionRequestDto;

    if (!dto.recordType || !dto.recordId || !dto.reason) {
      throw new BadRequestException('recordType, recordId, and reason are required');
    }

    const result = await dataRightsService.submitCorrectionRequest({
      parentId: parent.id,
      studentId,
      tenantId: (parent as any).tenantId,
      recordType: dto.recordType,
      recordId: dto.recordId,
      currentValue: dto.currentValue || '',
      requestedValue: dto.requestedValue || '',
      reason: dto.reason,
    });

    // Calculate 45-day response deadline and 40-day escalation date
    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 45);
    const escalationDate = new Date();
    escalationDate.setDate(escalationDate.getDate() + 40);

    // Send email confirmation (fire-and-forget)
    const notificationService = app.services.notification;
    notificationService
      .sendEmail({
        to: parent.email,
        template: 'correction-request-confirmation',
        language: (parent as any).language || 'en',
        data: {
          parentName: parent.givenName || 'Parent',
          requestId: result.id,
          recordType: dto.recordType,
          reason: dto.reason,
          responseDeadline: responseDeadline.toISOString().split('T')[0],
        },
      })
      .catch(() => {
        /* email delivery is best-effort */
      });

    reply.status(201);
    return {
      requestId: result.id,
      status: result.status,
      responseDeadline: responseDeadline.toISOString().split('T')[0],
      escalationDate: escalationDate.toISOString().split('T')[0],
      message:
        'Your correction request has been submitted. Per FERPA requirements, the school district must respond within 45 days. ' +
        'If no response is received within 40 days, the request will be automatically escalated. ' +
        'You will receive an email confirmation and a notification when the request is resolved.',
    };
  });
}
