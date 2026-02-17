/**
 * Reports Routes
 *
 * REST API endpoints for generating and downloading reports.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function reportsRoutes(app: FastifyInstance) {
  const parentService = app.services.parent;
  const pdfService = app.services.pdfReport;

  /**
   * Generate and download progress report PDF
   */
  app.get(
    '/students/:studentId/progress.pdf',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { studentId } = request.params as { studentId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

      const report = await parentService.getProgressReport(request.parent!.id, studentId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      const summary = await parentService.getStudentSummary(request.parent!.id, studentId);

      const pdf = await pdfService.generateProgressReport({
        studentName: summary.name,
        parentName: `${request.parent!.firstName} ${request.parent!.lastName}`,
        report,
        language: request.parent!.language,
      });

      const filename = `progress-report-${summary.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdf.length)
        .send(pdf);
    }
  );

  /**
   * Generate and download weekly summary PDF
   */
  app.get(
    '/students/:studentId/weekly.pdf',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { studentId } = request.params as { studentId: string };
      const { weekOf } = request.query as { weekOf?: string };

      const summary = await parentService.generateWeeklySummary(
        request.parent!.id,
        studentId,
        weekOf ? new Date(weekOf) : new Date()
      );

      const studentSummary = await parentService.getStudentSummary(request.parent!.id, studentId);

      const pdf = await pdfService.generateWeeklySummary({
        studentName: studentSummary.name,
        parentName: `${request.parent!.firstName} ${request.parent!.lastName}`,
        summary,
        language: request.parent!.language,
      });

      const filename = `weekly-summary-${studentSummary.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdf.length)
        .send(pdf);
    }
  );

  /**
   * Get list of available reports
   */
  app.get('/available', async (request: FastifyRequest) => {
    const profile = await parentService.getParentProfile(request.parent!.id);

    return {
      reports: profile.students.map((student: { id: string; name: string }) => ({
        studentId: student.id,
        studentName: student.name,
        available: [
          {
            type: 'progress',
            name: 'Progress Report',
            description: 'Detailed progress across all subjects',
            formats: ['pdf'],
          },
          {
            type: 'weekly',
            name: 'Weekly Summary',
            description: 'Week-by-week learning summary',
            formats: ['pdf'],
          },
        ],
      })),
    };
  });
}
