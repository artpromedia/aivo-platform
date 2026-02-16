/**
 * AIVO Compliance Service - Legal Hold Module – Report Service
 *
 * Generates compliance and status reports.
 */

import { config } from '../../../config.js';
import { prisma } from '../../../prisma.js';
import type { GenerateReportInput } from '../types.js';

/**
 * Generate a report.
 */
export async function generateReport(
  tenantId: string,
  userId: string,
  input: GenerateReportInput,
) {
  const report = await prisma.holdReport.create({
    data: {
      tenantId,
      reportType: input.reportType as any,
      name: input.name,
      parameters: input.parameters,
      status: 'GENERATING',
      generatedBy: userId,
    },
  });

  try {
    let content: string;

    switch (input.reportType) {
      case 'HOLD_STATUS':
        content = await generateHoldStatusReport(tenantId, input.parameters);
        break;
      case 'CUSTODIAN_COMPLIANCE':
        content = await generateCustodianComplianceReport(tenantId, input.parameters);
        break;
      case 'ACKNOWLEDGMENT_SUMMARY':
        content = await generateAcknowledgmentReport(tenantId, input.parameters);
        break;
      case 'DATA_SOURCE_INVENTORY':
        content = await generateDataSourceReport(tenantId, input.parameters);
        break;
      case 'MATTER_SUMMARY':
        content = await generateMatterSummaryReport(tenantId, input.parameters);
        break;
      case 'AUDIT_TRAIL':
        content = await generateAuditTrailReport(tenantId, input.parameters);
        break;
      default:
        throw new Error(`Unknown report type: ${input.reportType}`);
    }

    const expiresAt = new Date(Date.now() + config.reports.expirationDays * 24 * 60 * 60 * 1000);

    await prisma.holdReport.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        generatedAt: new Date(),
        filePath: content,
        fileSize: BigInt(content.length),
        expiresAt,
      },
    });

    return { ...report, content, status: 'COMPLETED' };
  } catch (error: any) {
    await prisma.holdReport.update({ where: { id: report.id }, data: { status: 'FAILED' } });
    throw error;
  }
}

/**
 * Get report by ID.
 */
export async function getReport(tenantId: string, reportId: string) {
  return prisma.holdReport.findFirst({ where: { id: reportId, tenantId } });
}

/**
 * List reports.
 */
export async function listReports(
  tenantId: string,
  options: { reportType?: string; page?: number; pageSize?: number } = {},
) {
  const { reportType, page = 1, pageSize = 20 } = options;
  const where: any = { tenantId, ...(reportType && { reportType }) };
  const skip = (page - 1) * pageSize;

  const [reports, totalItems] = await Promise.all([
    prisma.holdReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    prisma.holdReport.count({ where }),
  ]);

  return {
    data: reports,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

/**
 * Get available report types.
 */
export function getReportTypes() {
  return [
    { value: 'HOLD_STATUS', label: 'Hold Status Report', description: 'Overview of all legal holds and their status' },
    { value: 'CUSTODIAN_COMPLIANCE', label: 'Custodian Compliance Report', description: 'Custodian acknowledgment status across holds' },
    { value: 'ACKNOWLEDGMENT_SUMMARY', label: 'Acknowledgment Summary', description: 'List of all acknowledgments received' },
    { value: 'DATA_SOURCE_INVENTORY', label: 'Data Source Inventory', description: 'Inventory of all data sources and preservation status' },
    { value: 'MATTER_SUMMARY', label: 'Matter Summary Report', description: 'Summary of matters with hold statistics' },
    { value: 'AUDIT_TRAIL', label: 'Audit Trail Report', description: 'Audit log of all actions taken on holds' },
  ];
}

// ──────────────────────────── Internal report generators ────────────────────────────

async function generateHoldStatusReport(tenantId: string, params: GenerateReportInput['parameters']): Promise<string> {
  const where: any = { tenantId };
  if (params.matterId) where.matterId = params.matterId;
  if (!params.includeReleased) where.status = { not: 'RELEASED' };

  const holds = await prisma.legalHold.findMany({
    where,
    include: {
      matter: { select: { matterNumber: true, name: true } },
      custodians: { where: params.includeReleased ? undefined : { status: { not: 'RELEASED' } } },
      dataSources: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = holds.map((hold) => {
    const ack = hold.custodians.filter((c) => c.status === 'ACKNOWLEDGED').length;
    const total = hold.custodians.length;
    const rate = total > 0 ? ((ack / total) * 100).toFixed(1) : '100.0';
    return {
      holdNumber: hold.holdNumber, name: hold.name, matter: hold.matter.matterNumber,
      status: hold.status, priority: hold.priority, issuedAt: hold.issuedAt?.toISOString() || '',
      totalCustodians: total, acknowledgedCustodians: ack, complianceRate: `${rate}%`,
      dataSources: hold.dataSources.length,
    };
  });

  return JSON.stringify({ reportType: 'HOLD_STATUS', generatedAt: new Date().toISOString(), totalHolds: rows.length, data: rows }, null, 2);
}

async function generateCustodianComplianceReport(tenantId: string, params: GenerateReportInput['parameters']): Promise<string> {
  const holdWhere: any = { tenantId, status: { in: ['ISSUED', 'ACTIVE'] } };
  if (params.holdId) holdWhere.id = params.holdId;

  const holdCustodians = await prisma.holdCustodian.findMany({
    where: {
      hold: holdWhere,
      status: { not: 'RELEASED' },
      ...(params.custodianIds?.length && { custodianId: { in: params.custodianIds } }),
    },
    include: {
      custodian: { select: { email: true, displayName: true, department: true } },
      hold: { select: { holdNumber: true, name: true, acknowledgmentDue: true } },
    },
    orderBy: { custodian: { displayName: 'asc' } },
  });

  const now = new Date();
  const rows = holdCustodians.map((hc) => ({
    custodianEmail: hc.custodian.email, custodianName: hc.custodian.displayName,
    department: hc.custodian.department || '', holdNumber: hc.hold.holdNumber,
    holdName: hc.hold.name, status: hc.status,
    notifiedAt: hc.notifiedAt?.toISOString() || '', acknowledgedAt: hc.acknowledgedAt?.toISOString() || '',
    isOverdue: hc.hold.acknowledgmentDue && hc.hold.acknowledgmentDue < now && hc.status !== 'ACKNOWLEDGED',
    reminderCount: hc.reminderCount,
  }));

  return JSON.stringify({ reportType: 'CUSTODIAN_COMPLIANCE', generatedAt: new Date().toISOString(), totalRecords: rows.length, data: rows }, null, 2);
}

async function generateAcknowledgmentReport(tenantId: string, params: GenerateReportInput['parameters']): Promise<string> {
  const holdWhere: any = { tenantId };
  if (params.holdId) holdWhere.id = params.holdId;

  const acknowledgments = await prisma.holdAcknowledgment.findMany({
    where: {
      hold: holdWhere,
      ...(params.dateFrom && { acknowledgedAt: { gte: new Date(params.dateFrom) } }),
      ...(params.dateTo && { acknowledgedAt: { lte: new Date(params.dateTo) } }),
    },
    include: { hold: { select: { holdNumber: true, name: true } } },
    orderBy: { acknowledgedAt: 'desc' },
  });

  const rows = acknowledgments.map((ack) => ({
    holdNumber: ack.hold.holdNumber, holdName: ack.hold.name,
    custodianEmail: ack.custodianEmail, custodianName: ack.custodianName,
    acknowledgedAt: ack.acknowledgedAt.toISOString(), hasQuestions: ack.hasQuestions,
    questions: ack.questions || '',
  }));

  return JSON.stringify({ reportType: 'ACKNOWLEDGMENT_SUMMARY', generatedAt: new Date().toISOString(), totalAcknowledgments: rows.length, data: rows }, null, 2);
}

async function generateDataSourceReport(tenantId: string, _params: GenerateReportInput['parameters']): Promise<string> {
  const dataSources = await prisma.dataSource.findMany({
    where: { tenantId },
    include: {
      holds: { where: { status: { not: 'RELEASED' } }, include: { hold: { select: { holdNumber: true, name: true } } } },
      custodians: { include: { custodian: { select: { email: true, displayName: true } } } },
    },
  });

  const rows = dataSources.map((ds) => ({
    name: ds.name, type: ds.sourceType, isActive: ds.isActive,
    canPreserve: ds.canPreserve, canExport: ds.canExport, canSearch: ds.canSearch,
    activeHolds: ds.holds.length, linkedCustodians: ds.custodians.length,
    lastSyncAt: ds.lastSyncAt?.toISOString() || '',
  }));

  return JSON.stringify({ reportType: 'DATA_SOURCE_INVENTORY', generatedAt: new Date().toISOString(), totalDataSources: rows.length, data: rows }, null, 2);
}

async function generateMatterSummaryReport(tenantId: string, params: GenerateReportInput['parameters']): Promise<string> {
  const where: any = { tenantId };
  if (params.matterId) where.id = params.matterId;

  const matters = await prisma.legalMatter.findMany({
    where,
    include: {
      holds: { include: { custodians: true } },
      custodians: { where: { removedAt: null } },
    },
  });

  const rows = matters.map((matter) => {
    const activeHolds = matter.holds.filter((h) => ['ISSUED', 'ACTIVE'].includes(h.status));
    let ack = 0, pend = 0;
    for (const hold of activeHolds) {
      for (const hc of hold.custodians) {
        if (hc.status === 'ACKNOWLEDGED') ack++;
        else if (['PENDING', 'NOTIFIED'].includes(hc.status)) pend++;
      }
    }
    const total = ack + pend;
    const compliance = total > 0 ? ((ack / total) * 100).toFixed(1) : '100.0';
    return {
      matterNumber: matter.matterNumber, name: matter.name, type: matter.matterType,
      status: matter.status, riskLevel: matter.riskLevel, openedAt: matter.openedAt.toISOString(),
      totalHolds: matter.holds.length, activeHolds: activeHolds.length,
      totalCustodians: matter.custodians.length, overallCompliance: `${compliance}%`,
      pendingAcknowledgments: pend,
    };
  });

  return JSON.stringify({ reportType: 'MATTER_SUMMARY', generatedAt: new Date().toISOString(), totalMatters: rows.length, data: rows }, null, 2);
}

async function generateAuditTrailReport(tenantId: string, params: GenerateReportInput['parameters']): Promise<string> {
  const holdWhere: any = { tenantId };
  if (params.holdId) holdWhere.id = params.holdId;

  const auditLogs = await prisma.holdAuditLog.findMany({
    where: {
      hold: holdWhere,
      ...(params.dateFrom && { performedAt: { gte: new Date(params.dateFrom) } }),
      ...(params.dateTo && { performedAt: { lte: new Date(params.dateTo) } }),
    },
    include: { hold: { select: { holdNumber: true, name: true } } },
    orderBy: { performedAt: 'desc' },
    take: config.reports.maxExportSize,
  });

  const rows = auditLogs.map((log) => ({
    holdNumber: log.hold.holdNumber, holdName: log.hold.name,
    action: log.action, description: log.description,
    performedBy: log.performedBy, performedAt: log.performedAt.toISOString(),
    ipAddress: log.ipAddress || '',
  }));

  return JSON.stringify({ reportType: 'AUDIT_TRAIL', generatedAt: new Date().toISOString(), totalEntries: rows.length, data: rows }, null, 2);
}
