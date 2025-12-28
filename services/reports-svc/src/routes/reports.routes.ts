/**
 * Enterprise Report Generation Routes
 *
 * API endpoints for generating, scheduling, and managing reports
 * with support for multiple formats (PDF, Excel, CSV, HTML, JSON).
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { ReportService } from '../services/report.service.js';
import type { AuthenticatedUser, ReportFormat, ReportType } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const ReportFormatSchema = z.enum(['pdf', 'excel', 'csv', 'html', 'json']);

const ReportTypeSchema = z.enum([
  'student_progress',
  'class_overview',
  'skill_mastery',
  'at_risk_students',
  'engagement_summary',
  'assessment_results',
  'standard_alignment',
  'parent_summary',
  'district_dashboard',
  'teacher_effectiveness',
]);

const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const GenerateReportSchema = z.object({
  type: ReportTypeSchema,
  format: ReportFormatSchema.default('pdf'),
  tenantId: z.string().uuid(),
  parameters: z.object({
    studentId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    gradeLevel: z.string().optional(),
    subjectId: z.string().uuid().optional(),
    schoolId: z.string().uuid().optional(),
    districtId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    includeCharts: z.boolean().default(true),
    includeRecommendations: z.boolean().default(true),
    aggregationLevel: z.enum(['student', 'class', 'grade', 'school', 'district']).default('student'),
  }).optional().default({}),
  dateRange: DateRangeSchema.optional(),
  options: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    branding: z.object({
      logoUrl: z.string().url().optional(),
      primaryColor: z.string().optional(),
      schoolName: z.string().optional(),
    }).optional(),
    pageSize: z.enum(['letter', 'a4']).default('letter'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    includeHeader: z.boolean().default(true),
    includeFooter: z.boolean().default(true),
    confidentialityLevel: z.enum(['public', 'internal', 'confidential', 'restricted']).default('confidential'),
  }).optional().default({}),
});

const ScheduleReportSchema = GenerateReportSchema.extend({
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
    dayOfWeek: z.number().int().min(0).max(6).optional(), // 0 = Sunday
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('06:00'),
    timezone: z.string().default('America/New_York'),
  }),
  delivery: z.object({
    method: z.enum(['email', 'download', 'both']).default('email'),
    recipients: z.array(z.string().email()).optional(),
    ccRecipients: z.array(z.string().email()).optional(),
    subject: z.string().optional(),
    message: z.string().optional(),
  }),
});

const BatchReportSchema = z.object({
  reports: z.array(GenerateReportSchema).min(1).max(50),
  delivery: z.object({
    method: z.enum(['email', 'download', 'both']).default('download'),
    recipients: z.array(z.string().email()).optional(),
    bundleAs: z.enum(['individual', 'zip']).default('individual'),
  }).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReportRoutesOptions {
  s3Bucket?: string;
  reportService?: ReportService;
}

const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (fastify, options) => {
  const reportService = options.reportService || new ReportService();

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT GENERATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /reports/generate
   *
   * Generate a report with specified type and format
   */
  fastify.post<{
    Body: z.infer<typeof GenerateReportSchema>;
  }>(
    '/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['type', 'tenantId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  reportId: { type: 'string' },
                  downloadUrl: { type: 'string' },
                  expiresAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = getUser(request);
      const body = GenerateReportSchema.parse(request.body);

      // Validate user has access to the requested data
      await validateReportAccess(user, body);

      // Generate the report
      const reportRequest = {
        id: crypto.randomUUID(),
        type: body.type as ReportType,
        format: body.format as ReportFormat,
        tenantId: body.tenantId,
        requestedBy: user.id,
        requestedAt: new Date(),
        parameters: body.parameters,
        dateRange: body.dateRange?.startDate && body.dateRange?.endDate ? {
          startDate: new Date(body.dateRange.startDate),
          endDate: new Date(body.dateRange.endDate),
        } : undefined,
        options: body.options,
      };

      const result = await reportService.generateReport(reportRequest);

      return reply.send({
        success: true,
        data: {
          reportId: result.reportId,
          downloadUrl: result.downloadUrl,
          expiresAt: result.expiresAt,
          format: body.format,
          type: body.type,
        },
      });
    }
  );

  /**
   * POST /reports/generate/stream
   *
   * Generate and stream a report directly (for smaller reports)
   */
  fastify.post<{
    Body: z.infer<typeof GenerateReportSchema>;
  }>(
    '/generate/stream',
    async (request, reply) => {
      const user = getUser(request);
      const body = GenerateReportSchema.parse(request.body);

      await validateReportAccess(user, body);

      const reportRequest = {
        id: crypto.randomUUID(),
        type: body.type as ReportType,
        format: body.format as ReportFormat,
        tenantId: body.tenantId,
        requestedBy: user.id,
        requestedAt: new Date(),
        parameters: body.parameters,
        dateRange: body.dateRange?.startDate && body.dateRange?.endDate ? {
          startDate: new Date(body.dateRange.startDate),
          endDate: new Date(body.dateRange.endDate),
        } : undefined,
        options: body.options,
      };

      const buffer = await reportService.generateReportBuffer(reportRequest);

      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        html: 'text/html',
        json: 'application/json',
      };

      const extensions: Record<string, string> = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
        html: 'html',
        json: 'json',
      };

      const filename = `${body.type}_report_${new Date().toISOString().split('T')[0]}.${extensions[body.format]}`;

      return reply
        .header('Content-Type', contentTypes[body.format])
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    }
  );

  /**
   * POST /reports/generate/batch
   *
   * Generate multiple reports in a batch
   */
  fastify.post<{
    Body: z.infer<typeof BatchReportSchema>;
  }>(
    '/generate/batch',
    async (request, reply) => {
      const user = getUser(request);
      const body = BatchReportSchema.parse(request.body);

      const results = [];

      for (const reportConfig of body.reports) {
        await validateReportAccess(user, reportConfig);

        const reportRequest = {
          id: crypto.randomUUID(),
          type: reportConfig.type as ReportType,
          format: reportConfig.format as ReportFormat,
          tenantId: reportConfig.tenantId,
          requestedBy: user.id,
          requestedAt: new Date(),
          parameters: reportConfig.parameters,
          dateRange: reportConfig.dateRange?.startDate && reportConfig.dateRange?.endDate ? {
            startDate: new Date(reportConfig.dateRange.startDate),
            endDate: new Date(reportConfig.dateRange.endDate),
          } : undefined,
          options: reportConfig.options,
        };

        try {
          const result = await reportService.generateReport(reportRequest);
          results.push({
            success: true,
            reportId: result.reportId,
            type: reportConfig.type,
            format: reportConfig.format,
            downloadUrl: result.downloadUrl,
          });
        } catch (error) {
          results.push({
            success: false,
            type: reportConfig.type,
            format: reportConfig.format,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send email if requested
      if (body.delivery?.method !== 'download' && body.delivery?.recipients?.length) {
        const successfulReports = results.filter(r => r.success);
        if (successfulReports.length > 0) {
          await reportService.sendBatchReportEmail(
            body.delivery.recipients,
            successfulReports as Array<{ reportId: string; downloadUrl: string; type: string; format: string }>
          );
        }
      }

      return reply.send({
        success: true,
        data: {
          totalRequested: body.reports.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          reports: results,
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEDULED REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /reports/schedule
   *
   * Schedule a recurring report
   */
  fastify.post<{
    Body: z.infer<typeof ScheduleReportSchema>;
  }>(
    '/schedule',
    async (request, reply) => {
      const user = getUser(request);
      const body = ScheduleReportSchema.parse(request.body);

      await validateReportAccess(user, body);

      const scheduledReport = {
        id: crypto.randomUUID(),
        type: body.type,
        format: body.format,
        tenantId: body.tenantId,
        createdBy: user.id,
        createdAt: new Date(),
        schedule: body.schedule,
        delivery: body.delivery,
        parameters: body.parameters,
        options: body.options,
        status: 'active' as const,
        nextRunAt: calculateNextRun(body.schedule),
      };

      // Save to database (pseudo-code - implement with your Prisma client)
      // await prisma.scheduledReport.create({ data: scheduledReport });

      return reply.send({
        success: true,
        data: {
          scheduleId: scheduledReport.id,
          nextRunAt: scheduledReport.nextRunAt,
          schedule: body.schedule,
        },
      });
    }
  );

  /**
   * GET /reports/schedule
   *
   * List scheduled reports for the user
   */
  fastify.get<{
    Querystring: { tenantId: string };
  }>(
    '/schedule',
    async (request, reply) => {
      const _user = getUser(request);
      const { tenantId: _tenantId } = request.query;

      // Fetch from database (pseudo-code)
      // const schedules = await prisma.scheduledReport.findMany({
      //   where: { tenantId, createdBy: user.id, status: 'active' },
      // });

      return reply.send({
        success: true,
        data: {
          schedules: [], // Replace with actual data
        },
      });
    }
  );

  /**
   * DELETE /reports/schedule/:scheduleId
   *
   * Cancel a scheduled report
   */
  fastify.delete<{
    Params: { scheduleId: string };
  }>(
    '/schedule/:scheduleId',
    async (request, reply) => {
      const { scheduleId: _scheduleId } = request.params;
      const _user = getUser(request);

      // Update in database (pseudo-code)
      // await prisma.scheduledReport.update({
      //   where: { id: scheduleId, createdBy: user.id },
      //   data: { status: 'cancelled' },
      // });

      return reply.send({
        success: true,
        message: 'Scheduled report cancelled',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT HISTORY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /reports/history
   *
   * Get report generation history
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      page?: number;
      pageSize?: number;
      type?: string;
    };
  }>(
    '/history',
    async (request, reply) => {
      const _user = getUser(request);
      const { tenantId: _tenantId, page = 1, pageSize = 20, type: _type } = request.query;

      // Fetch from database (pseudo-code)
      // const history = await prisma.reportHistory.findMany({
      //   where: { tenantId, requestedBy: user.id, ...(type && { type }) },
      //   orderBy: { requestedAt: 'desc' },
      //   take: pageSize,
      //   skip: (page - 1) * pageSize,
      // });

      return reply.send({
        success: true,
        data: {
          reports: [], // Replace with actual data
          pagination: {
            page,
            pageSize,
            totalItems: 0,
            totalPages: 0,
          },
        },
      });
    }
  );

  /**
   * GET /reports/:reportId
   *
   * Get a specific report's details and download URL
   */
  fastify.get<{
    Params: { reportId: string };
  }>(
    '/:reportId',
    async (request, reply) => {
      const { reportId } = request.params;
      const _user = getUser(request);

      // Fetch from database and regenerate download URL
      const downloadUrl = await reportService.generateDownloadUrl(reportId);

      return reply.send({
        success: true,
        data: {
          reportId,
          downloadUrl,
          expiresIn: 3600, // 1 hour
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /reports/templates
   *
   * Get available report templates
   */
  fastify.get<{
    Querystring: { tenantId: string };
  }>(
    '/templates',
    async (_request, reply) => {
      const templates = [
        {
          id: 'student_progress',
          name: 'Student Progress Report',
          description: 'Individual student learning progress with skill mastery and recommendations',
          supportedFormats: ['pdf', 'excel', 'html'],
          requiredParams: ['studentId'],
          optionalParams: ['classId', 'subjectId'],
        },
        {
          id: 'class_overview',
          name: 'Class Overview Report',
          description: 'Class-wide performance summary with student comparisons',
          supportedFormats: ['pdf', 'excel', 'html', 'csv'],
          requiredParams: ['classId'],
          optionalParams: ['subjectId'],
        },
        {
          id: 'at_risk_students',
          name: 'At-Risk Students Report',
          description: 'Students requiring intervention with risk factors and recommendations',
          supportedFormats: ['pdf', 'excel', 'csv'],
          requiredParams: [],
          optionalParams: ['classId', 'gradeLevel', 'schoolId'],
        },
        {
          id: 'skill_mastery',
          name: 'Skill Mastery Report',
          description: 'Skill-by-skill mastery analysis with learning gaps',
          supportedFormats: ['pdf', 'excel', 'html'],
          requiredParams: [],
          optionalParams: ['studentId', 'classId', 'subjectId'],
        },
        {
          id: 'engagement_summary',
          name: 'Engagement Summary Report',
          description: 'Activity and engagement metrics over time',
          supportedFormats: ['pdf', 'excel', 'csv'],
          requiredParams: [],
          optionalParams: ['studentId', 'classId', 'schoolId'],
        },
        {
          id: 'parent_summary',
          name: 'Parent Summary Report',
          description: 'Parent-friendly student progress summary (FERPA compliant)',
          supportedFormats: ['pdf', 'html'],
          requiredParams: ['studentId'],
          optionalParams: [],
        },
        {
          id: 'district_dashboard',
          name: 'District Dashboard Report',
          description: 'District-wide metrics for administrators',
          supportedFormats: ['pdf', 'excel', 'html'],
          requiredParams: ['districtId'],
          optionalParams: ['schoolId', 'gradeLevel'],
        },
      ];

      return reply.send({
        success: true,
        data: { templates },
      });
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

async function validateReportAccess(
  user: AuthenticatedUser,
  reportConfig: { tenantId: string; parameters?: Record<string, unknown> }
): Promise<void> {
  // Verify user belongs to tenant
  if (user.tenantId !== reportConfig.tenantId) {
    throw new Error('Access denied: User does not belong to this tenant');
  }

  // Additional role-based checks would go here
  // e.g., teachers can only access their own classes
  // parents can only access their children's data
}

function calculateNextRun(schedule: {
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
}): Date {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  // If the time has passed today, start from tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  switch (schedule.frequency) {
    case 'daily':
      return next;

    case 'weekly':
      if (schedule.dayOfWeek !== undefined) {
        while (next.getDay() !== schedule.dayOfWeek) {
          next.setDate(next.getDate() + 1);
        }
      }
      return next;

    case 'monthly':
      if (schedule.dayOfMonth !== undefined) {
        next.setDate(schedule.dayOfMonth);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
      }
      return next;

    case 'quarterly': {
      const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
      const currentMonth = now.getMonth();
      const nextQuarterMonth = quarterMonths.find(m => m > currentMonth) ?? quarterMonths[0] + 12;
      next.setMonth(nextQuarterMonth % 12);
      if (nextQuarterMonth >= 12) {
        next.setFullYear(next.getFullYear() + 1);
      }
      if (schedule.dayOfMonth) {
        next.setDate(schedule.dayOfMonth);
      }
      return next;
    }

    default:
      return next;
  }
}

export default reportRoutes;
