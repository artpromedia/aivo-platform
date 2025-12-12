/* eslint-disable no-redeclare */
/**
 * Seat Usage Analytics Types
 *
 * Type definitions for seat utilization reporting, alerts, and notifications.
 */

import { z } from 'zod';
import { GradeBand } from './licensing.types';

// ============================================================================
// Enums
// ============================================================================

export const SeatUsageAlertStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;
export type SeatUsageAlertStatus = (typeof SeatUsageAlertStatus)[keyof typeof SeatUsageAlertStatus];

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

// ============================================================================
// Threshold Constants
// ============================================================================

/**
 * Standard utilization thresholds for alerting.
 */
export const UTILIZATION_THRESHOLDS = {
  WARNING: 0.8,    // 80% - approaching capacity
  CRITICAL: 1.0,   // 100% - at capacity
  OVERAGE: 1.1,    // 110% - over capacity
} as const;

/**
 * Get severity level for a utilization percentage.
 */
export function getUtilizationSeverity(utilizationPercent: number): AlertSeverity {
  if (utilizationPercent >= UTILIZATION_THRESHOLDS.OVERAGE * 100) {
    return AlertSeverity.CRITICAL;
  }
  if (utilizationPercent >= UTILIZATION_THRESHOLDS.CRITICAL * 100) {
    return AlertSeverity.CRITICAL;
  }
  if (utilizationPercent >= UTILIZATION_THRESHOLDS.WARNING * 100) {
    return AlertSeverity.WARNING;
  }
  return AlertSeverity.INFO;
}

/**
 * Get human-readable threshold label.
 */
export function getThresholdLabel(threshold: number): string {
  const percent = Math.round(threshold * 100);
  if (threshold >= UTILIZATION_THRESHOLDS.OVERAGE) {
    return `${percent}% (Overage)`;
  }
  if (threshold >= UTILIZATION_THRESHOLDS.CRITICAL) {
    return `${percent}% (At Capacity)`;
  }
  return `${percent}%`;
}

// ============================================================================
// Seat Usage View Types
// ============================================================================

/**
 * Row from vw_seat_usage materialized view.
 */
export interface SeatUsageEntry {
  tenantId: string;
  sku: string;
  gradeBand: GradeBand;
  committedSeats: number;
  allocatedSeats: number;
  overageAllowed: boolean;
  overageLimit: number | null;
  overageUsed: number;
  utilizationPercent: number;
  contractId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  enforcement: 'SOFT' | 'HARD' | 'UNLIMITED';
  calculatedAt: Date;
}

/**
 * Aggregated seat usage summary for a tenant.
 */
export interface TenantSeatUsageSummary {
  tenantId: string;
  totalCommittedSeats: number;
  totalAllocatedSeats: number;
  totalOverageUsed: number;
  overallUtilizationPercent: number;
  byGradeBand: SeatUsageByGradeBand[];
  bySku: SeatUsageBySku[];
  alerts: SeatUsageAlertSummary[];
  calculatedAt: Date;
}

/**
 * Seat usage aggregated by grade band.
 */
export interface SeatUsageByGradeBand {
  gradeBand: GradeBand;
  committedSeats: number;
  allocatedSeats: number;
  overageUsed: number;
  utilizationPercent: number;
}

/**
 * Seat usage for a specific SKU.
 */
export interface SeatUsageBySku {
  sku: string;
  gradeBand: GradeBand;
  committedSeats: number;
  allocatedSeats: number;
  overageAllowed: boolean;
  overageLimit: number | null;
  overageUsed: number;
  utilizationPercent: number;
  status: 'normal' | 'warning' | 'critical' | 'overage';
}

/**
 * Summary of an alert for display.
 */
export interface SeatUsageAlertSummary {
  id: string;
  sku: string;
  gradeBand: GradeBand;
  threshold: number;
  utilizationPercent: number;
  status: SeatUsageAlertStatus;
  severity: AlertSeverity;
  createdAt: Date;
  message: string;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Full seat usage alert record.
 */
export interface SeatUsageAlert {
  id: string;
  tenantId: string;
  sku: string;
  gradeBand: GradeBand;
  threshold: number;
  status: SeatUsageAlertStatus;
  contextJson: SeatUsageAlertContext | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Context snapshot stored with alert.
 */
export interface SeatUsageAlertContext {
  committed: number;
  allocated: number;
  utilization: number;
  overage: number;
  overageAllowed: boolean;
  overageLimit: number | null;
  contractId: string;
  contractEndDate: string;
}

/**
 * Input for creating a new alert.
 */
export interface CreateSeatUsageAlertInput {
  tenantId: string;
  sku: string;
  gradeBand: GradeBand;
  threshold: number;
  contextJson: SeatUsageAlertContext;
}

/**
 * Input for acknowledging an alert.
 */
export interface AcknowledgeAlertInput {
  alertId: string;
  acknowledgedBy: string;
}

/**
 * Input for resolving an alert.
 */
export interface ResolveAlertInput {
  alertId: string;
  resolvedBy: string;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * In-app notification for seat usage alerts.
 */
export interface SeatUsageNotification {
  id: string;
  alertId: string;
  tenantId: string;
  userId: string | null;
  title: string;
  message: string;
  severity: AlertSeverity;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Input for creating a notification.
 */
export interface CreateNotificationInput {
  alertId: string;
  tenantId: string;
  userId?: string;
  title: string;
  message: string;
  severity: AlertSeverity;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from GET /billing/tenants/:tenantId/seat-usage
 */
export interface SeatUsageResponse {
  tenantId: string;
  usage: SeatUsageBySku[];
  summary: {
    totalCommitted: number;
    totalAllocated: number;
    totalOverage: number;
    overallUtilization: number;
  };
  alerts: SeatUsageAlertSummary[];
  calculatedAt: string;
}

/**
 * Response from GET /billing/tenants/:tenantId/seat-usage/alerts
 */
export interface AlertsResponse {
  alerts: SeatUsageAlert[];
  total: number;
  unacknowledged: number;
}

/**
 * Response from GET /billing/notifications
 */
export interface NotificationsResponse {
  notifications: SeatUsageNotification[];
  total: number;
  unread: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const SeatUsageAlertStatusSchema = z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);
export const AlertSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL']);

export const SeatUsageAlertContextSchema = z.object({
  committed: z.number().int().min(0),
  allocated: z.number().int().min(0),
  utilization: z.number().min(0),
  overage: z.number().int().min(0),
  overageAllowed: z.boolean(),
  overageLimit: z.number().int().min(0).nullable(),
  contractId: z.string().uuid(),
  contractEndDate: z.string(),
});

export const CreateSeatUsageAlertSchema = z.object({
  tenantId: z.string().uuid(),
  sku: z.string().min(1),
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12', 'TEACHER', 'ALL']),
  threshold: z.number().min(0).max(2),
  contextJson: SeatUsageAlertContextSchema,
});

export const AcknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
  acknowledgedBy: z.string().uuid(),
});

export const ResolveAlertSchema = z.object({
  alertId: z.string().uuid(),
  resolvedBy: z.string().uuid(),
});

export const CreateNotificationSchema = z.object({
  alertId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  severity: AlertSeveritySchema,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine usage status based on utilization percentage.
 */
export function getUsageStatus(utilizationPercent: number): 'normal' | 'warning' | 'critical' | 'overage' {
  if (utilizationPercent > 100) return 'overage';
  if (utilizationPercent >= 100) return 'critical';
  if (utilizationPercent >= 80) return 'warning';
  return 'normal';
}

/**
 * Generate alert message based on usage data.
 */
export function generateAlertMessage(
  sku: string,
  gradeBand: GradeBand,
  utilizationPercent: number,
  threshold: number
): string {
  const gradeBandLabel = getGradeBandLabel(gradeBand);
  const thresholdPercent = Math.round(threshold * 100);
  
  if (utilizationPercent > 100) {
    return `${gradeBandLabel} seats are over capacity at ${utilizationPercent.toFixed(0)}% utilization (${utilizationPercent - 100}% overage).`;
  }
  if (utilizationPercent >= 100) {
    return `${gradeBandLabel} seats are at 100% capacity. No additional licenses can be assigned.`;
  }
  return `${gradeBandLabel} seats are at ${utilizationPercent.toFixed(0)}% utilization, exceeding the ${thresholdPercent}% threshold.`;
}

/**
 * Get human-readable grade band label.
 */
export function getGradeBandLabel(gradeBand: GradeBand): string {
  const labels: Record<GradeBand, string> = {
    K_2: 'Grade K-2',
    G3_5: 'Grade 3-5',
    G6_8: 'Grade 6-8',
    G9_12: 'Grade 9-12',
    TEACHER: 'Teacher',
    ALL: 'All Grades',
  };
  return labels[gradeBand] || gradeBand;
}

/**
 * Calculate days until contract ends.
 */
export function daysUntilContractEnd(endDate: Date): number {
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format utilization for display.
 */
export function formatUtilization(percent: number): string {
  return `${percent.toFixed(0)}%`;
}

/**
 * Get color class for utilization status.
 */
export function getUtilizationColor(status: 'normal' | 'warning' | 'critical' | 'overage'): string {
  switch (status) {
    case 'overage':
      return 'text-error';
    case 'critical':
      return 'text-error';
    case 'warning':
      return 'text-warning';
    default:
      return 'text-success';
  }
}
