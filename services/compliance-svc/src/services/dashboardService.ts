/**
 * AIVO Compliance Service - Dashboard Service
 *
 * Business logic for compliance dashboard and reporting.
 */

import { prisma } from '../prisma.js';
import type {
  Framework,
  DashboardSummary,
  FrameworkSummary,
  FindingsSummary,
  FindingSeverity,
} from '../types/index.js';

/**
 * Get the main compliance dashboard summary.
 */
export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const [
    frameworks,
    findingsData,
    upcomingDeadlines,
    recentActivity,
  ] = await Promise.all([
    getFrameworksSummary(tenantId),
    getFindingsSummary(tenantId),
    getUpcomingDeadlines(tenantId),
    getRecentActivity(tenantId),
  ]);

  // Calculate overall score
  const totalControls = frameworks.reduce((sum, f) => sum + f.controlsTotal, 0);
  const passedControls = frameworks.reduce((sum, f) => sum + f.controlsPassed, 0);
  const overallScore = totalControls > 0
    ? Math.round((passedControls / totalControls) * 100)
    : 100;

  return {
    overallScore,
    frameworks,
    findingsSummary: findingsData,
    upcomingDeadlines,
    recentActivity,
  };
}

/**
 * Get summary for all active frameworks.
 */
async function getFrameworksSummary(tenantId: string): Promise<FrameworkSummary[]> {
  const frameworks = await prisma.tenantFramework.findMany({
    where: { tenantId, isActive: true },
    include: {
      controls: {
        select: { status: true },
      },
    },
  });

  const summaries: FrameworkSummary[] = [];

  for (const fw of frameworks) {
    const controlsByStatus = fw.controls.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = fw.controls.length;
    const passed = controlsByStatus['IMPLEMENTED'] || 0;
    const failed = (controlsByStatus['NOT_STARTED'] || 0) +
      (controlsByStatus['PARTIALLY_IMPLEMENTED'] || 0);
    const inProgress = controlsByStatus['IN_PROGRESS'] || 0;
    const na = controlsByStatus['NOT_APPLICABLE'] || 0;

    const applicableTotal = total - na;
    const score = applicableTotal > 0
      ? Math.round((passed / applicableTotal) * 100)
      : 100;

    const openFindings = await prisma.finding.count({
      where: {
        tenantId,
        control: { tenantFrameworkId: fw.id },
        status: { in: ['OPEN', 'IN_REMEDIATION'] },
      },
    });

    summaries.push({
      framework: fw.framework as Framework,
      displayName: fw.displayName,
      score,
      controlsTotal: total,
      controlsPassed: passed,
      controlsFailed: failed,
      controlsInProgress: inProgress,
      openFindings,
    });
  }

  return summaries.sort((a, b) => a.score - b.score);
}

/**
 * Get findings summary.
 */
async function getFindingsSummary(tenantId: string): Promise<FindingsSummary> {
  const [
    total,
    open,
    inRemediation,
    overdue,
    bySeverityData,
  ] = await Promise.all([
    prisma.finding.count({ where: { tenantId } }),
    prisma.finding.count({ where: { tenantId, status: 'OPEN' } }),
    prisma.finding.count({ where: { tenantId, status: 'IN_REMEDIATION' } }),
    prisma.finding.count({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { in: ['OPEN', 'IN_REMEDIATION'] },
      },
    }),
    prisma.finding.groupBy({
      by: ['severity'],
      where: { tenantId, status: { in: ['OPEN', 'IN_REMEDIATION'] } },
      _count: { severity: true },
    }),
  ]);

  const bySeverity = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0,
  } as Record<FindingSeverity, number>;

  for (const item of bySeverityData) {
    bySeverity[item.severity as FindingSeverity] = item._count.severity;
  }

  return {
    total,
    open,
    inRemediation,
    overdue,
    bySeverity,
  };
}

/**
 * Get upcoming deadlines.
 */
async function getUpcomingDeadlines(tenantId: string, limit: number = 10) {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [findings, evidence, remediations] = await Promise.all([
    prisma.finding.findMany({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_REMEDIATION'] },
        dueDate: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: { id: true, title: true, dueDate: true, severity: true },
    }),
    prisma.evidence.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
        validUntil: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      orderBy: { validUntil: 'asc' },
      take: limit,
      select: { id: true, title: true, validUntil: true },
    }),
    prisma.remediation.findMany({
      where: {
        finding: { tenantId },
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        plannedEndDate: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      orderBy: { plannedEndDate: 'asc' },
      take: limit,
      select: { id: true, title: true, plannedEndDate: true, priority: true },
    }),
  ]);

  const items = [
    ...findings.map((f) => ({
      type: 'finding' as const,
      id: f.id,
      title: f.title,
      dueDate: f.dueDate!.toISOString(),
      severity: f.severity as FindingSeverity,
    })),
    ...evidence.map((e) => ({
      type: 'evidence' as const,
      id: e.id,
      title: `Evidence expiring: ${e.title}`,
      dueDate: e.validUntil!.toISOString(),
    })),
    ...remediations.map((r) => ({
      type: 'remediation' as const,
      id: r.id,
      title: r.title,
      dueDate: r.plannedEndDate!.toISOString(),
    })),
  ];

  return items
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit);
}

/**
 * Get recent activity.
 */
async function getRecentActivity(tenantId: string, limit: number = 10) {
  // Get recent findings
  const findings = await prisma.finding.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
    },
  });

  // Get recent control updates
  const controls = await prisma.control.findMany({
    where: { tenantFramework: { tenantId } },
    orderBy: { statusUpdatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      controlId: true,
      title: true,
      status: true,
      statusUpdatedAt: true,
    },
  });

  const items = [
    ...findings
      .filter((f) => f.status && f.updatedAt)
      .map((f) => ({
        type: `finding.${f.status.toLowerCase()}`,
        title: f.title,
        timestamp: f.updatedAt.toISOString(),
      })),
    ...controls
      .filter((c) => c.statusUpdatedAt && c.status)
      .map((c) => ({
        type: `control.${c.status.toLowerCase()}`,
        title: `${c.controlId}: ${c.title}`,
        timestamp: c.statusUpdatedAt!.toISOString(),
      })),
  ];

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Take a compliance snapshot for trend tracking.
 */
export async function takeSnapshot(tenantId: string) {
  const summary = await getDashboardSummary(tenantId);

  // Get previous snapshot for trend
  const previousSnapshot = await prisma.complianceSnapshot.findFirst({
    where: { tenantId, framework: null },
    orderBy: { snapshotAt: 'desc' },
  });

  const scoreDelta = previousSnapshot
    ? summary.overallScore - previousSnapshot.overallScore
    : null;

  let trendDirection = 'stable';
  if (scoreDelta !== null) {
    if (scoreDelta > 1) trendDirection = 'up';
    else if (scoreDelta < -1) trendDirection = 'down';
  }

  // Create overall snapshot
  await prisma.complianceSnapshot.create({
    data: {
      tenantId,
      framework: null,
      overallScore: summary.overallScore,
      controlsTotal: summary.frameworks.reduce((s, f) => s + f.controlsTotal, 0),
      controlsPassed: summary.frameworks.reduce((s, f) => s + f.controlsPassed, 0),
      controlsFailed: summary.frameworks.reduce((s, f) => s + f.controlsFailed, 0),
      controlsNA: 0,
      controlsInProgress: summary.frameworks.reduce((s, f) => s + f.controlsInProgress, 0),
      findingsOpen: summary.findingsSummary.open,
      findingsCritical: summary.findingsSummary.bySeverity.CRITICAL,
      findingsHigh: summary.findingsSummary.bySeverity.HIGH,
      findingsMedium: summary.findingsSummary.bySeverity.MEDIUM,
      findingsLow: summary.findingsSummary.bySeverity.LOW,
      scoreDelta,
      trendDirection,
    },
  });

  // Create per-framework snapshots
  for (const fw of summary.frameworks) {
    await prisma.complianceSnapshot.create({
      data: {
        tenantId,
        framework: fw.framework,
        overallScore: fw.score,
        controlsTotal: fw.controlsTotal,
        controlsPassed: fw.controlsPassed,
        controlsFailed: fw.controlsFailed,
        controlsNA: 0,
        controlsInProgress: fw.controlsInProgress,
        findingsOpen: fw.openFindings,
        findingsCritical: 0,
        findingsHigh: 0,
        findingsMedium: 0,
        findingsLow: 0,
      },
    });
  }

  return { snapshotAt: new Date() };
}

/**
 * Get compliance trend over time.
 */
export async function getComplianceTrend(
  tenantId: string,
  framework?: Framework,
  days: number = 90
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.complianceSnapshot.findMany({
    where: {
      tenantId,
      framework: framework || null,
      snapshotAt: { gte: since },
    },
    orderBy: { snapshotAt: 'asc' },
    select: {
      snapshotAt: true,
      overallScore: true,
      controlsTotal: true,
      controlsPassed: true,
      findingsOpen: true,
    },
  });

  return snapshots;
}

/**
 * Get compliance alerts for a tenant.
 */
export async function getAlerts(tenantId: string, unreadOnly: boolean = true) {
  const where: any = { tenantId };

  if (unreadOnly) {
    where.isRead = false;
    where.isDismissed = false;
  }

  return prisma.complianceAlert.findMany({
    where,
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });
}

/**
 * Mark alert as read.
 */
export async function markAlertRead(tenantId: string, alertId: string, userId: string) {
  return prisma.complianceAlert.update({
    where: { id: alertId, tenantId },
    data: {
      isRead: true,
      readAt: new Date(),
      readBy: userId,
    },
  });
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(tenantId: string, alertId: string, userId: string) {
  return prisma.complianceAlert.update({
    where: { id: alertId, tenantId },
    data: {
      isDismissed: true,
      dismissedAt: new Date(),
      dismissedBy: userId,
    },
  });
}
