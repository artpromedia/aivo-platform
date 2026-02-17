/**
 * Data Rights Routes
 *
 * Implements FERPA/GDPR parent data rights endpoints:
 * - GET /parent/students/{id}/data/export - Export all student data
 * - POST /parent/students/{id}/data/delete - Request data deletion
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { BadRequestException } from '../errors.js';

interface DeleteRequestDto {
  reason?: string;
  confirmEmail: string;
}

export async function dataRightsRoutes(app: FastifyInstance) {
  const dataRightsService = app.services.dataRights;

  /**
   * Export all data for a linked student
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
}
