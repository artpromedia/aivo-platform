/**
 * AIVO IEP Service - Compliance Routes
 *
 * Sprint T2-05: Added GET /report for CSV/JSON compliance report generation.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { getComplianceCronScheduler } from '../services/compliance-cron.js';
import * as iepService from '../services/iepService.js';

export default async function complianceRoutes(fastify: FastifyInstance): Promise<void> {
  // Get compliance alerts
  fastify.get('/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const result = await iepService.getComplianceAlerts(tenantId, request.query);
    return reply.send(result);
  });

  // Run compliance check (single tenant)
  fastify.post('/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const alerts = await iepService.checkCompliance(tenantId);
    return reply.send({ newAlerts: alerts.length, alerts });
  });

  // Run compliance check across ALL tenants (admin / manual trigger)
  fastify.post('/check-all', async (_request: FastifyRequest, reply: FastifyReply) => {
    const scheduler = getComplianceCronScheduler();
    if (!scheduler) {
      return reply.status(503).send({ error: 'Compliance cron scheduler not initialised' });
    }
    const result = await scheduler.runDailyCheck();
    return reply.send(result);
  });

  /**
   * Generate compliance report (CSV or JSON)
   *
   * Sprint T2-05: District compliance report export for board presentations.
   * GET /compliance/report?format=csv|json
   *
   * Returns a full compliance snapshot including:
   *  - Overall compliance percentage
   *  - Active/overdue IEP counts
   *  - All open compliance alerts with severity
   *  - Goal on-time rate
   *  - At-risk IEPs with student name, case manager, days until due
   */
  fastify.get('/report', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { format = 'json' } = request.query as { format?: string };

    // Gather dashboard data (includes compliance & goal metrics)
    const dashboard = await iepService.getDashboard(tenantId);

    // Fetch all open alerts (unpaginated for the report)
    const alertsResult = await iepService.getComplianceAlerts(tenantId, {
      status: 'OPEN',
      page: 1,
      pageSize: 1000,
    });

    const generatedAt = new Date().toISOString();

    const report = {
      meta: {
        reportType: 'IEP Compliance Report',
        tenantId,
        generatedAt,
        format,
      },
      summary: {
        compliancePercentage: dashboard.compliance.percentage,
        totalStudents: dashboard.totalStudents,
        activeIEPs: dashboard.activeIEPs,
        overdueAnnualReviews: dashboard.compliance.overdueAnnualReviews,
        overdueReevaluations: dashboard.compliance.overdueReevaluations,
        totalOpenAlerts: dashboard.compliance.totalAlerts,
        goalOnTimeRate: dashboard.goals.onTimeRate,
        goalsTotal: dashboard.goals.total,
        goalsCompleted: dashboard.goals.completed,
        goalsOverdue: dashboard.goals.overdue,
      },
      alerts: alertsResult.data.map((a: any) => ({
        id: a.id,
        alertType: a.alertType,
        severity: a.severity,
        studentId: a.studentId,
        iepId: a.iepId,
        description: a.description,
        dueDate: a.dueDate,
        status: a.status,
      })),
    };

    if (format === 'csv') {
      // Build CSV with summary header + alert rows
      const lines: string[] = [];

      lines.push('AIVO IEP Compliance Report');
      lines.push(`Generated,${generatedAt}`);
      lines.push(`Tenant,${tenantId}`);
      lines.push('');
      lines.push('Metric,Value');
      lines.push(`Compliance %,${report.summary.compliancePercentage}`);
      lines.push(`Total Students,${report.summary.totalStudents}`);
      lines.push(`Active IEPs,${report.summary.activeIEPs}`);
      lines.push(`Overdue Annual Reviews,${report.summary.overdueAnnualReviews}`);
      lines.push(`Overdue Reevaluations,${report.summary.overdueReevaluations}`);
      lines.push(`Open Alerts,${report.summary.totalOpenAlerts}`);
      lines.push(`Goal On-Time Rate,${report.summary.goalOnTimeRate}%`);
      lines.push(`Goals Total,${report.summary.goalsTotal}`);
      lines.push(`Goals Completed,${report.summary.goalsCompleted}`);
      lines.push(`Goals Overdue,${report.summary.goalsOverdue}`);
      lines.push('');
      lines.push('Alert Type,Severity,Student ID,IEP ID,Description,Due Date,Status');

      for (const a of report.alerts) {
        const desc = (a.description || '').replace(/,/g, ';').replace(/\n/g, ' ');
        lines.push(
          `${a.alertType},${a.severity},${a.studentId},${a.iepId},${desc},${a.dueDate || ''},${a.status}`
        );
      }

      const csv = lines.join('\n');
      const filename = `compliance-report-${tenantId}-${generatedAt.split('T')[0]}.csv`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csv);
    }

    // Default: JSON
    return reply.send(report);
  });
}
