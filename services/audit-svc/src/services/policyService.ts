/**
 * AIVO Audit Service - Policy Business Logic
 *
 * Manages audit policies for tenants.
 */

import { prisma } from '../prisma.js';
import type { CreatePolicy } from '../types/index.js';

/**
 * Create an audit policy.
 */
export async function createPolicy(
  tenantId: string,
  createdById: string,
  params: CreatePolicy
) {
  return prisma.auditPolicy.create({
    data: {
      tenantId,
      name: params.name,
      description: params.description,
      eventTypes: params.eventTypes,
      categories: params.categories,
      minSeverity: params.minSeverity,
      retentionDays: params.retentionDays,
      alertOnSeverity: params.alertOnSeverity,
      alertWebhookUrl: params.alertWebhookUrl,
      isActive: params.isActive,
      createdById,
    },
  });
}

/**
 * Update an audit policy.
 */
export async function updatePolicy(
  tenantId: string,
  id: string,
  params: Partial<CreatePolicy>
) {
  return prisma.auditPolicy.update({
    where: { id, tenantId },
    data: {
      name: params.name,
      description: params.description,
      eventTypes: params.eventTypes,
      categories: params.categories,
      minSeverity: params.minSeverity,
      retentionDays: params.retentionDays,
      alertOnSeverity: params.alertOnSeverity,
      alertWebhookUrl: params.alertWebhookUrl,
      isActive: params.isActive,
    },
  });
}

/**
 * Delete an audit policy.
 */
export async function deletePolicy(tenantId: string, id: string) {
  return prisma.auditPolicy.delete({
    where: { id, tenantId },
  });
}

/**
 * Get all policies for a tenant.
 */
export async function getPolicies(tenantId: string) {
  return prisma.auditPolicy.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a policy by ID.
 */
export async function getPolicyById(tenantId: string, id: string) {
  return prisma.auditPolicy.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Get active policies for a tenant.
 */
export async function getActivePolicies(tenantId: string) {
  return prisma.auditPolicy.findMany({
    where: { tenantId, isActive: true },
  });
}

/**
 * Check if an event should trigger an alert based on policies.
 */
export async function checkForAlerts(
  tenantId: string,
  category: string,
  severity: string,
  eventType: string
) {
  const policies = await getActivePolicies(tenantId);

  const alertPolicies = policies.filter((policy) => {
    if (!policy.alertOnSeverity) return false;

    // Check if severity matches or exceeds the alert threshold
    const severityOrder = [
      'DEBUG',
      'INFO',
      'NOTICE',
      'WARNING',
      'ERROR',
      'CRITICAL',
      'ALERT',
      'EMERGENCY',
    ];
    const eventSeverityIndex = severityOrder.indexOf(severity);
    const alertSeverityIndex = severityOrder.indexOf(policy.alertOnSeverity);

    if (eventSeverityIndex < alertSeverityIndex) return false;

    // Check if category matches (if specified)
    if (
      policy.categories.length > 0 &&
      !policy.categories.includes(category as any)
    ) {
      return false;
    }

    // Check if event type matches (if specified)
    if (
      policy.eventTypes.length > 0 &&
      !policy.eventTypes.includes(eventType)
    ) {
      return false;
    }

    return true;
  });

  return alertPolicies;
}
