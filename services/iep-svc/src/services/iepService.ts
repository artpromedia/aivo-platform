/**
 * AIVO IEP Service - IEP Management Service
 */

import { addMonths, addYears, differenceInDays } from 'date-fns';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// IEP CRUD
// ══════════════════════════════════════════════════════════════════════════════

export async function createIEP(tenantId: string, userId: string, input: any) {
  // Get student's IEP count for numbering
  const iepCount = await prisma.iEP.count({
    where: { tenantId, studentId: input.studentId },
  });

  const iep = await prisma.iEP.create({
    data: {
      tenantId,
      studentId: input.studentId,
      iepNumber: `IEP-${iepCount + 1}`,
      version: 1,
      iepType: input.iepType,
      status: 'DRAFT',
      meetingDate: input.meetingDate ? new Date(input.meetingDate) : null,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
      academicLevel: input.academicLevel,
      functionalLevel: input.functionalLevel,
      parentConcerns: input.parentConcerns,
      studentStrengths: input.studentStrengths,
      participatesInGenEd: input.participatesInGenEd ?? true,
      genEdPercentage: input.genEdPercentage,
      placementType: input.placementType,
      esyEligible: input.esyEligible ?? false,
      createdBy: userId,
      metadata: input.metadata,
    },
  });

  // Set annual review and reevaluation dates
  if (input.effectiveDate) {
    const effectiveDate = new Date(input.effectiveDate);
    await prisma.iEP.update({
      where: { id: iep.id },
      data: {
        annualReviewDate: addYears(effectiveDate, 1),
        reevaluationDate: addYears(effectiveDate, config.compliance.reevaluationYears),
      },
    });
  }

  return getIEP(tenantId, iep.id);
}

export async function getIEP(tenantId: string, iepId: string) {
  return prisma.iEP.findFirst({
    where: { id: iepId, tenantId },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          grade: true,
          school: true,
          primaryDisability: true,
        },
      },
      goals: {
        include: { objectives: true },
        orderBy: { goalNumber: 'asc' },
      },
      accommodations: { where: { isActive: true } },
      modifications: { where: { isActive: true } },
      services: { where: { isActive: true } },
      transitionPlan: true,
      _count: {
        select: {
          meetings: true,
          progressReports: true,
          amendments: true,
        },
      },
    },
  });
}

export async function listIEPs(tenantId: string, query: any) {
  const { studentId, status, iepType, page = 1, pageSize = 20 } = query;

  const where: any = {
    tenantId,
    ...(studentId && { studentId }),
    ...(status && { status }),
    ...(iepType && { iepType }),
  };

  const skip = (page - 1) * pageSize;

  const [ieps, totalItems] = await Promise.all([
    prisma.iEP.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        student: {
          select: { firstName: true, lastName: true, studentId: true, grade: true },
        },
        _count: { select: { goals: true, services: true } },
      },
    }),
    prisma.iEP.count({ where }),
  ]);

  return {
    data: ieps,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

export async function updateIEP(tenantId: string, iepId: string, userId: string, input: any) {
  const existing = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!existing) throw new Error('IEP not found');

  return prisma.iEP.update({
    where: { id: iepId },
    data: {
      ...input,
      meetingDate: input.meetingDate ? new Date(input.meetingDate) : undefined,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
      annualReviewDate: input.annualReviewDate ? new Date(input.annualReviewDate) : undefined,
      lastModifiedBy: userId,
    },
  });
}

export async function submitIEP(tenantId: string, iepId: string, userId: string) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');
  if (iep.status !== 'DRAFT') throw new Error('IEP is not in draft status');

  return prisma.iEP.update({
    where: { id: iepId },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date(), lastModifiedBy: userId },
  });
}

export async function approveIEP(tenantId: string, iepId: string, userId: string) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');

  return prisma.iEP.update({
    where: { id: iepId },
    data: {
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: userId,
      lastModifiedBy: userId,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// GOALS
// ══════════════════════════════════════════════════════════════════════════════

export async function addGoal(tenantId: string, iepId: string, input: any) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');

  const goalCount = await prisma.iEPGoal.count({ where: { iepId } });

  const goal = await prisma.iEPGoal.create({
    data: {
      iepId,
      goalNumber: goalCount + 1,
      domain: input.domain,
      description: input.description,
      baseline: input.baseline,
      targetCriteria: input.targetCriteria,
      measurementMethod: input.measurementMethod,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      standardsAligned: input.standardsAligned || [],
      status: 'NOT_STARTED',
    },
  });

  // Add objectives if provided
  if (input.objectives?.length) {
    await prisma.objective.createMany({
      data: input.objectives.map((obj: any, index: number) => ({
        goalId: goal.id,
        objectiveNumber: index + 1,
        description: obj.description,
        criteria: obj.criteria,
        status: 'NOT_STARTED',
      })),
    });
  }

  return prisma.iEPGoal.findUnique({
    where: { id: goal.id },
    include: { objectives: true },
  });
}

export async function updateGoal(tenantId: string, goalId: string, input: any) {
  const goal = await prisma.iEPGoal.findFirst({
    where: { id: goalId },
    include: { iep: { select: { tenantId: true } } },
  });

  if (goal?.iep.tenantId !== tenantId) throw new Error('Goal not found');

  return prisma.iEPGoal.update({
    where: { id: goalId },
    data: {
      domain: input.domain,
      description: input.description,
      baseline: input.baseline,
      targetCriteria: input.targetCriteria,
      measurementMethod: input.measurementMethod,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      standardsAligned: input.standardsAligned,
      status: input.status,
    },
    include: { objectives: true },
  });
}

export async function recordProgress(tenantId: string, goalId: string, input: any) {
  const goal = await prisma.iEPGoal.findFirst({
    where: { id: goalId },
    include: { iep: { select: { tenantId: true } } },
  });

  if (goal?.iep.tenantId !== tenantId) throw new Error('Goal not found');

  return prisma.progressData.create({
    data: {
      goalId,
      recordDate: input.recordDate ? new Date(input.recordDate) : new Date(),
      progressLevel: input.progressLevel,
      measurementType: input.measurementType,
      measurementValue: input.measurementValue,
      notes: input.notes,
      recordedBy: input.recordedBy,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOMMODATIONS & MODIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function addAccommodation(tenantId: string, iepId: string, input: any) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');

  return prisma.accommodation.create({
    data: {
      iepId,
      category: input.category,
      name: input.name,
      description: input.description,
      settings: input.settings || [],
      subjects: input.subjects || [],
      frequency: input.frequency,
      isActive: true,
    },
  });
}

export async function addModification(tenantId: string, iepId: string, input: any) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');

  return prisma.modification.create({
    data: {
      iepId,
      subject: input.subject,
      description: input.description,
      rationale: input.rationale,
      gradeLevel: input.gradeLevel,
      isActive: true,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES
// ══════════════════════════════════════════════════════════════════════════════

export async function addService(tenantId: string, iepId: string, input: any) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');

  return prisma.service.create({
    data: {
      iepId,
      serviceType: input.serviceType,
      description: input.description,
      frequency: input.frequency,
      duration: input.duration,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      location: input.location,
      groupSize: input.groupSize,
      providerType: input.providerType,
      providerName: input.providerName,
      isActive: true,
    },
  });
}

export async function logServiceSession(tenantId: string, serviceId: string, input: any) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId },
    include: { iep: { select: { tenantId: true } } },
  });

  if (service?.iep.tenantId !== tenantId) throw new Error('Service not found');

  return prisma.serviceLog.create({
    data: {
      serviceId,
      sessionDate: new Date(input.sessionDate),
      duration: input.duration,
      attended: input.attended ?? true,
      notes: input.notes,
      activities: input.activities || [],
      providerId: input.providerId,
      providerName: input.providerName,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MEETINGS
// ══════════════════════════════════════════════════════════════════════════════

export async function scheduleMeeting(tenantId: string, iepId: string, userId: string, input: any) {
  const iep = await prisma.iEP.findFirst({ where: { id: iepId, tenantId } });
  if (!iep) throw new Error('IEP not found');

  return prisma.meeting.create({
    data: {
      iepId,
      meetingType: input.meetingType,
      scheduledDate: new Date(input.scheduledDate),
      scheduledTime: input.scheduledTime,
      duration: input.duration,
      location: input.location,
      virtualLink: input.virtualLink,
      purpose: input.purpose,
      agenda: input.agenda,
      status: 'SCHEDULED',
      createdBy: userId,
    },
  });
}

export async function completeMeeting(tenantId: string, meetingId: string, input: any) {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId },
    include: { iep: { select: { tenantId: true } } },
  });

  if (meeting?.iep.tenantId !== tenantId) throw new Error('Meeting not found');

  return prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: 'COMPLETED',
      actualDate: new Date(),
      notes: input.notes,
      decisions: input.decisions,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════

export async function checkCompliance(tenantId: string) {
  const now = new Date();
  const alerts: any[] = [];

  // Check annual reviews
  const annualReviewsDue = await prisma.iEP.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      annualReviewDate: {
        lte: addMonths(now, 1),
        gte: now,
      },
    },
    include: { student: { select: { firstName: true, lastName: true, studentId: true } } },
  });

  for (const iep of annualReviewsDue) {
    const daysUntil = differenceInDays(iep.annualReviewDate!, now);
    alerts.push({
      alertType: 'ANNUAL_REVIEW_DUE',
      severity: daysUntil <= 7 ? 'High' : 'Medium',
      studentId: iep.studentId,
      iepId: iep.id,
      description: `Annual review due in ${daysUntil} days for ${iep.student.firstName} ${iep.student.lastName}`,
      dueDate: iep.annualReviewDate,
    });
  }

  // Check reevaluations
  const reevaluationsDue = await prisma.iEP.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      reevaluationDate: {
        lte: addMonths(now, 3),
        gte: now,
      },
    },
    include: { student: { select: { firstName: true, lastName: true, studentId: true } } },
  });

  for (const iep of reevaluationsDue) {
    alerts.push({
      alertType: 'REEVALUATION_DUE',
      severity: 'Medium',
      studentId: iep.studentId,
      iepId: iep.id,
      description: `Reevaluation due for ${iep.student.firstName} ${iep.student.lastName}`,
      dueDate: iep.reevaluationDate,
    });
  }

  // Store alerts
  for (const alert of alerts) {
    await prisma.complianceAlert.upsert({
      where: {
        id: `${alert.alertType}-${alert.iepId}`,
      },
      create: {
        tenantId,
        ...alert,
        status: 'OPEN',
      },
      update: {
        severity: alert.severity,
        dueDate: alert.dueDate,
      },
    });
  }

  return alerts;
}

export async function getComplianceAlerts(tenantId: string, options: any = {}) {
  const { status, alertType, page = 1, pageSize = 20 } = options;

  const where: any = {
    tenantId,
    ...(status && { status }),
    ...(alertType && { alertType }),
  };

  const skip = (page - 1) * pageSize;

  const [alerts, totalItems] = await Promise.all([
    prisma.complianceAlert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.complianceAlert.count({ where }),
  ]);

  return {
    data: alerts,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export async function getDashboard(tenantId: string) {
  const [
    totalStudents,
    activeIEPs,
    statusCounts,
    upcomingMeetings,
    complianceAlerts,
  ] = await Promise.all([
    prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.iEP.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.iEP.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.meeting.findMany({
      where: {
        iep: { tenantId },
        scheduledDate: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
      include: {
        iep: {
          include: { student: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.complianceAlert.count({
      where: { tenantId, status: 'OPEN' },
    }),
  ]);

  return {
    totalStudents,
    activeIEPs,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status])),
    upcomingMeetings,
    openComplianceAlerts: complianceAlerts,
  };
}
