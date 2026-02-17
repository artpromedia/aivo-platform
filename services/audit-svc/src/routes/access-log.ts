/**
 * AIVO Audit Service - FERPA Access Log Routes
 *
 * Sprint T2-05: Dedicated endpoints for FERPA compliance:
 *
 *  GET /audit/access-log?studentId=X
 *    → Returns all audit log entries for a specific student,
 *      filtered to DATA_ACCESS category. For district admins
 *      to verify who accessed a student's FERPA-protected records.
 *
 *  GET /audit/compliance-summary?studentId=X
 *    → Aggregated FERPA compliance metrics:
 *      - Total accesses in the period
 *      - Unique users who accessed the records
 *      - Most accessed record types
 *      - Anomalous access patterns (off-hours, high-frequency)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as auditService from '../services/auditService.js';

export async function registerAccessLogRoutes(fastify: FastifyInstance) {
  /**
   * GET /audit/access-log
   *
   * Query FERPA access audit logs for a specific student.
   * Returns who accessed the student's records, when, and from which service.
   */
  fastify.get(
    '/access-log',
    async (
      request: FastifyRequest<{
        Querystring: {
          studentId: string;
          fromDate?: string;
          toDate?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      if (!request.tenantId || !request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { studentId, fromDate, toDate, page, pageSize } = request.query;

      if (!studentId) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'studentId query parameter is required',
        });
      }

      try {
        const result = await auditService.queryAuditLogs(request.tenantId, {
          targetId: studentId,
          categories: ['DATA_ACCESS', 'DATA_MODIFICATION'],
          fromDate,
          toDate,
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 50,
          sortBy: 'occurredAt',
          sortOrder: 'desc',
        });

        // Log this meta-access
        await auditService.logAuditAccess(
          request.tenantId,
          request.user.sub,
          request.user.email,
          request.user.roles || [],
          (request.headers['x-forwarded-for'] as string) || request.ip,
          'ferpa_access_log_query',
          { studentId, fromDate, toDate },
          result.data.length,
          fromDate ? new Date(fromDate) : undefined,
          toDate ? new Date(toDate) : undefined,
          request.headers['x-request-id'] as string
        );

        return reply.status(200).send({
          studentId,
          ...result,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to query FERPA access log');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to query FERPA access log',
        });
      }
    }
  );

  /**
   * GET /audit/compliance-summary
   *
   * Aggregated FERPA compliance summary for a student or tenant.
   * Provides metrics for compliance reporting and anomaly detection.
   */
  fastify.get(
    '/compliance-summary',
    async (
      request: FastifyRequest<{
        Querystring: {
          studentId?: string;
          fromDate?: string;
          toDate?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      if (!request.tenantId || !request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { studentId, fromDate, toDate } = request.query;

      try {
        const summary = await auditService.getFerpaComplianceSummary(
          request.tenantId,
          studentId,
          fromDate,
          toDate
        );

        // Log meta-access
        await auditService.logAuditAccess(
          request.tenantId,
          request.user.sub,
          request.user.email,
          request.user.roles || [],
          (request.headers['x-forwarded-for'] as string) || request.ip,
          'ferpa_compliance_summary',
          { studentId, fromDate, toDate },
          1,
          fromDate ? new Date(fromDate) : undefined,
          toDate ? new Date(toDate) : undefined,
          request.headers['x-request-id'] as string
        );

        return reply.status(200).send(summary);
      } catch (error) {
        request.log.error({ error }, 'Failed to generate compliance summary');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate compliance summary',
        });
      }
    }
  );
}
