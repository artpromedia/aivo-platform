/**
 * Research Project Service
 *
 * Handles CRUD operations and status management for research projects.
 */

import type { ProjectStatus, ProjectType } from '@prisma/client';

import {
  publishProjectApproved,
  publishProjectCreated,
  publishProjectRejected,
} from '../events/publisher.js';
import { prisma } from '../prisma.js';

import { recordAuditLog, type AuditContext } from './auditService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateProjectInput {
  tenantId: string;
  title: string;
  description?: string;
  type: ProjectType;
  piName: string;
  piEmail: string;
  piAffiliation?: string;
  startDate?: Date;
  endDate?: Date;
  irbProtocolId?: string;
  irbExpiryDate?: Date;
  createdByUserId: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  piName?: string;
  piEmail?: string;
  piAffiliation?: string;
  startDate?: Date;
  endDate?: Date;
  irbProtocolId?: string;
  irbExpiryDate?: Date;
  updatedByUserId: string;
}

export interface ListProjectsOptions {
  tenantId: string;
  status?: ProjectStatus[];
  type?: ProjectType[];
  userId?: string; // Filter by projects user has access to
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new research project (starts in DRAFT status)
 */
export async function createProject(input: CreateProjectInput, auditContext: AuditContext) {
  const project = await prisma.researchProject.create({
    data: {
      tenantId: input.tenantId,
      title: input.title,
      description: input.description,
      type: input.type,
      status: 'DRAFT',
      piName: input.piName,
      piEmail: input.piEmail,
      piAffiliation: input.piAffiliation,
      startDate: input.startDate,
      endDate: input.endDate,
      irbProtocolId: input.irbProtocolId,
      irbExpiryDate: input.irbExpiryDate,
      createdByUserId: input.createdByUserId,
    },
  });

  // Audit log
  await recordAuditLog(auditContext, 'PROJECT_CREATED', project.id, {
    title: project.title,
    type: project.type,
  });

  // Publish event
  await publishProjectCreated({
    projectId: project.id,
    tenantId: project.tenantId,
    title: project.title,
    type: project.type,
    piEmail: project.piEmail,
    createdByUserId: project.createdByUserId,
    timestamp: new Date().toISOString(),
  });

  return project;
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string, tenantId: string) {
  return prisma.researchProject.findFirst({
    where: {
      id: projectId,
      tenantId,
    },
    include: {
      dataUseAgreements: {
        orderBy: { version: 'desc' },
        take: 1,
      },
      cohorts: true,
      datasetDefinitions: true,
      accessGrants: {
        where: { status: 'ACTIVE' },
      },
      _count: {
        select: {
          exportJobs: true,
        },
      },
    },
  });
}

/**
 * List projects with filters
 */
export async function listProjects(options: ListProjectsOptions) {
  const { tenantId, status, type, userId, limit = 20, offset = 0 } = options;

  const where: NonNullable<Parameters<typeof prisma.researchProject.findMany>[0]>['where'] = {
    tenantId,
    ...(status && status.length > 0 ? { status: { in: status } } : {}),
    ...(type && type.length > 0 ? { type: { in: type } } : {}),
  };

  // If userId is provided, filter to projects where user has access or is creator
  if (userId) {
    where.OR = [
      { createdByUserId: userId },
      { accessGrants: { some: { userId, status: 'ACTIVE' } } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.researchProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            exportJobs: true,
            accessGrants: true,
          },
        },
      },
    }),
    prisma.researchProject.count({ where }),
  ]);

  return { projects, total };
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  tenantId: string,
  input: UpdateProjectInput,
  auditContext: AuditContext
) {
  const project = await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      title: input.title,
      description: input.description,
      piName: input.piName,
      piEmail: input.piEmail,
      piAffiliation: input.piAffiliation,
      startDate: input.startDate,
      endDate: input.endDate,
      irbProtocolId: input.irbProtocolId,
      irbExpiryDate: input.irbExpiryDate,
      updatedByUserId: input.updatedByUserId,
    },
  });

  await recordAuditLog(auditContext, 'PROJECT_UPDATED', project.id, {
    updatedFields: Object.keys(input).filter((k) => k !== 'updatedByUserId'),
  });

  return project;
}

/**
 * Submit a project for approval (DRAFT → PENDING_APPROVAL)
 */
export async function submitForApproval(
  projectId: string,
  tenantId: string,
  auditContext: AuditContext
) {
  const project = await prisma.researchProject.findFirst({
    where: { id: projectId, tenantId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'DRAFT') {
    throw new Error(`Cannot submit project with status ${project.status}`);
  }

  // For external research, require IRB
  if (project.type === 'EXTERNAL_RESEARCH' && !project.irbProtocolId) {
    throw new Error('External research projects require IRB protocol ID');
  }

  const updated = await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      status: 'PENDING_APPROVAL',
      updatedByUserId: auditContext.userId,
    },
  });

  await recordAuditLog(auditContext, 'PROJECT_UPDATED', projectId, {
    statusChange: { from: 'DRAFT', to: 'PENDING_APPROVAL' },
  });

  return updated;
}

/**
 * Approve a project (PENDING_APPROVAL → APPROVED)
 */
export async function approveProject(
  projectId: string,
  tenantId: string,
  approvedByUserId: string,
  auditContext: AuditContext
) {
  const project = await prisma.researchProject.findFirst({
    where: { id: projectId, tenantId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot approve project with status ${project.status}`);
  }

  const updated = await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      status: 'APPROVED',
      approvedByUserId,
      approvedAt: new Date(),
      updatedByUserId: approvedByUserId,
    },
  });

  await recordAuditLog(auditContext, 'PROJECT_APPROVED', projectId);

  await publishProjectApproved({
    projectId: updated.id,
    tenantId: updated.tenantId,
    title: updated.title,
    approvedByUserId,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

/**
 * Reject a project (PENDING_APPROVAL → REJECTED)
 */
export async function rejectProject(
  projectId: string,
  tenantId: string,
  rejectedByUserId: string,
  reason: string,
  auditContext: AuditContext
) {
  const project = await prisma.researchProject.findFirst({
    where: { id: projectId, tenantId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot reject project with status ${project.status}`);
  }

  const updated = await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      status: 'REJECTED',
      rejectedReason: reason,
      updatedByUserId: rejectedByUserId,
    },
  });

  await recordAuditLog(auditContext, 'PROJECT_REJECTED', projectId, { reason });

  await publishProjectRejected({
    projectId: updated.id,
    tenantId: updated.tenantId,
    title: updated.title,
    rejectedByUserId,
    reason,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

/**
 * Close a project (any status → CLOSED)
 */
export async function closeProject(
  projectId: string,
  tenantId: string,
  closedByUserId: string,
  auditContext: AuditContext
) {
  const updated = await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      status: 'CLOSED',
      updatedByUserId: closedByUserId,
    },
  });

  await recordAuditLog(auditContext, 'PROJECT_CLOSED', projectId);

  // Revoke all active access grants
  await prisma.researchAccessGrant.updateMany({
    where: { researchProjectId: projectId, status: 'ACTIVE' },
    data: {
      status: 'EXPIRED',
      revokedAt: new Date(),
      revokedReason: 'Project closed',
      revokedByUserId: closedByUserId,
    },
  });

  return updated;
}
