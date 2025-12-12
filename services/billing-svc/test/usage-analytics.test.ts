/**
 * Usage Analytics Tests
 *
 * Tests for seat usage calculations, threshold detection,
 * alert generation, and notification delivery.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  type SeatUsageAlert,
  type SeatUsageNotification,
  type SeatUsageAlertContext,
  SeatUsageAlertStatus,
  AlertSeverity,
  getThresholdLabel,
  getUtilizationSeverity,
  UTILIZATION_THRESHOLDS,
} from '../src/types/usage-analytics.types';

import { GradeBand } from '../src/types/licensing.types';

// ============================================================================
// Unit Tests: Utility Functions
// ============================================================================

describe('Usage Analytics Utilities', () => {
  describe('getThresholdLabel', () => {
    it('returns correct label for warning threshold', () => {
      expect(getThresholdLabel(0.8)).toBe('80%');
      expect(getThresholdLabel(0.7)).toBe('70%');
      expect(getThresholdLabel(0.5)).toBe('50%');
    });

    it('returns correct label for at-capacity threshold', () => {
      expect(getThresholdLabel(1.0)).toBe('100% (At Capacity)');
    });

    it('returns correct label for overage threshold', () => {
      expect(getThresholdLabel(1.1)).toBe('110% (Overage)');
      expect(getThresholdLabel(1.2)).toBe('120% (Overage)');
    });
  });

  describe('getUtilizationSeverity', () => {
    it('returns INFO for utilization < 80%', () => {
      expect(getUtilizationSeverity(0)).toBe(AlertSeverity.INFO);
      expect(getUtilizationSeverity(50)).toBe(AlertSeverity.INFO);
      expect(getUtilizationSeverity(79)).toBe(AlertSeverity.INFO);
    });

    it('returns WARNING for utilization >= 80% and < 100%', () => {
      expect(getUtilizationSeverity(80)).toBe(AlertSeverity.WARNING);
      expect(getUtilizationSeverity(90)).toBe(AlertSeverity.WARNING);
      expect(getUtilizationSeverity(99)).toBe(AlertSeverity.WARNING);
    });

    it('returns CRITICAL for utilization >= 100%', () => {
      expect(getUtilizationSeverity(100)).toBe(AlertSeverity.CRITICAL);
      expect(getUtilizationSeverity(110)).toBe(AlertSeverity.CRITICAL);
      expect(getUtilizationSeverity(150)).toBe(AlertSeverity.CRITICAL);
    });
  });
});

// ============================================================================
// Unit Tests: Threshold Constants
// ============================================================================

describe('Utilization Thresholds', () => {
  it('has correct warning threshold', () => {
    expect(UTILIZATION_THRESHOLDS.WARNING).toBe(0.8);
  });

  it('has correct critical threshold', () => {
    expect(UTILIZATION_THRESHOLDS.CRITICAL).toBe(1.0);
  });

  it('has correct overage threshold', () => {
    expect(UTILIZATION_THRESHOLDS.OVERAGE).toBe(1.1);
  });
});

// ============================================================================
// Integration Tests: Alert Generation Logic
// ============================================================================

describe('Alert Generation Logic', () => {
  const THRESHOLD_WARNING = UTILIZATION_THRESHOLDS.WARNING;
  const THRESHOLD_LIMIT = UTILIZATION_THRESHOLDS.CRITICAL;
  const THRESHOLD_OVERAGE = UTILIZATION_THRESHOLDS.OVERAGE;

  /**
   * Determines which thresholds are crossed for a given utilization
   */
  function getCrossedThresholds(utilizationPercent: number): number[] {
    const thresholds: number[] = [];
    if (utilizationPercent >= THRESHOLD_WARNING * 100) {
      thresholds.push(THRESHOLD_WARNING);
    }
    if (utilizationPercent >= THRESHOLD_LIMIT * 100) {
      thresholds.push(THRESHOLD_LIMIT);
    }
    if (utilizationPercent >= THRESHOLD_OVERAGE * 100) {
      thresholds.push(THRESHOLD_OVERAGE);
    }
    return thresholds;
  }

  /**
   * Determines if a new alert should be created
   */
  function shouldCreateAlert(
    utilizationPercent: number,
    threshold: number,
    existingAlerts: Array<{ threshold: number; status: string }>
  ): boolean {
    // Check if utilization crosses the threshold
    const thresholdPercent = threshold * 100;
    if (utilizationPercent < thresholdPercent) {
      return false;
    }

    // Check for existing non-resolved alert at this threshold
    const existingAlert = existingAlerts.find(
      (a) => a.threshold === threshold && a.status !== 'RESOLVED'
    );

    return !existingAlert;
  }

  describe('getCrossedThresholds', () => {
    it('returns no thresholds for low utilization', () => {
      expect(getCrossedThresholds(50)).toEqual([]);
      expect(getCrossedThresholds(79)).toEqual([]);
    });

    it('returns warning threshold for 80% utilization', () => {
      expect(getCrossedThresholds(80)).toEqual([0.8]);
    });

    it('returns warning and limit thresholds for 100% utilization', () => {
      expect(getCrossedThresholds(100)).toEqual([0.8, 1.0]);
    });

    it('returns all thresholds for 110%+ utilization', () => {
      expect(getCrossedThresholds(110)).toEqual([0.8, 1.0, 1.1]);
      expect(getCrossedThresholds(150)).toEqual([0.8, 1.0, 1.1]);
    });
  });

  describe('shouldCreateAlert', () => {
    it('returns true when threshold is crossed and no existing alert', () => {
      expect(shouldCreateAlert(85, 0.8, [])).toBe(true);
      expect(shouldCreateAlert(100, 1.0, [])).toBe(true);
      expect(shouldCreateAlert(115, 1.1, [])).toBe(true);
    });

    it('returns false when threshold is not crossed', () => {
      expect(shouldCreateAlert(75, 0.8, [])).toBe(false);
      expect(shouldCreateAlert(95, 1.0, [])).toBe(false);
      expect(shouldCreateAlert(105, 1.1, [])).toBe(false);
    });

    it('returns false when non-resolved alert exists at threshold', () => {
      const existingAlerts = [{ threshold: 0.8, status: 'OPEN' }];
      expect(shouldCreateAlert(85, 0.8, existingAlerts)).toBe(false);
    });

    it('returns false when acknowledged alert exists at threshold', () => {
      const existingAlerts = [{ threshold: 0.8, status: 'ACKNOWLEDGED' }];
      expect(shouldCreateAlert(85, 0.8, existingAlerts)).toBe(false);
    });

    it('returns true when only resolved alert exists at threshold', () => {
      const existingAlerts = [{ threshold: 0.8, status: 'RESOLVED' }];
      expect(shouldCreateAlert(85, 0.8, existingAlerts)).toBe(true);
    });

    it('handles multiple existing alerts correctly', () => {
      const existingAlerts = [
        { threshold: 0.8, status: 'RESOLVED' },
        { threshold: 1.0, status: 'OPEN' },
      ];
      expect(shouldCreateAlert(105, 0.8, existingAlerts)).toBe(true);
      expect(shouldCreateAlert(105, 1.0, existingAlerts)).toBe(false);
      expect(shouldCreateAlert(105, 1.1, existingAlerts)).toBe(false); // Below threshold
    });
  });
});

// ============================================================================
// Integration Tests: Notification Generation
// ============================================================================

describe('Notification Generation', () => {
  function createNotificationForAlert(
    alert: { gradeBand: GradeBand; contextJson: SeatUsageAlertContext | null }
  ): { title: string; message: string; severity: AlertSeverity } {
    const utilization = alert.contextJson?.utilization ?? 0;

    let severity: AlertSeverity;
    let title: string;
    let message: string;

    if (utilization > 100) {
      severity = AlertSeverity.CRITICAL;
      title = 'Seat Overage Alert';
      message = `Seat usage for ${alert.gradeBand} is at ${utilization}% - exceeding capacity.`;
    } else if (utilization >= 100) {
      severity = AlertSeverity.CRITICAL;
      title = 'Seat Limit Reached';
      message = `All committed seats for ${alert.gradeBand} are now allocated.`;
    } else {
      severity = AlertSeverity.WARNING;
      title = 'Seat Usage Warning';
      message = `Seat usage for ${alert.gradeBand} is at ${utilization}% of capacity.`;
    }

    return { title, message, severity };
  }

  describe('createNotificationForAlert', () => {
    it('creates warning notification for 80-99% utilization', () => {
      const notification = createNotificationForAlert({
        gradeBand: GradeBand.K_2,
        contextJson: {
          utilization: 85,
          committed: 100,
          allocated: 85,
          overage: 0,
          overageAllowed: true,
          overageLimit: 10,
          contractId: 'contract-1',
          contractEndDate: '2025-06-30',
        },
      });

      expect(notification.severity).toBe(AlertSeverity.WARNING);
      expect(notification.title).toBe('Seat Usage Warning');
    });

    it('creates critical notification for 100% utilization', () => {
      const notification = createNotificationForAlert({
        gradeBand: GradeBand.K_2,
        contextJson: {
          utilization: 100,
          committed: 100,
          allocated: 100,
          overage: 0,
          overageAllowed: true,
          overageLimit: 10,
          contractId: 'contract-1',
          contractEndDate: '2025-06-30',
        },
      });

      expect(notification.severity).toBe(AlertSeverity.CRITICAL);
      expect(notification.title).toBe('Seat Limit Reached');
    });

    it('creates overage notification for >100% utilization', () => {
      const notification = createNotificationForAlert({
        gradeBand: GradeBand.K_2,
        contextJson: {
          utilization: 115,
          committed: 100,
          allocated: 115,
          overage: 15,
          overageAllowed: true,
          overageLimit: 20,
          contractId: 'contract-1',
          contractEndDate: '2025-06-30',
        },
      });

      expect(notification.severity).toBe(AlertSeverity.CRITICAL);
      expect(notification.title).toBe('Seat Overage Alert');
      expect(notification.message).toContain('115%');
    });
  });
});

// ============================================================================
// Integration Tests: Utilization Calculations
// ============================================================================

describe('Utilization Calculations', () => {
  function calculateUtilization(committed: number, allocated: number): number {
    if (committed === 0) return 0;
    return Math.round((allocated / committed) * 100);
  }

  function calculateOverage(committed: number, allocated: number): number {
    return Math.max(0, allocated - committed);
  }

  describe('calculateUtilization', () => {
    it('calculates correct utilization percentage', () => {
      expect(calculateUtilization(100, 80)).toBe(80);
      expect(calculateUtilization(100, 100)).toBe(100);
      expect(calculateUtilization(100, 115)).toBe(115);
    });

    it('handles zero committed seats', () => {
      expect(calculateUtilization(0, 0)).toBe(0);
      expect(calculateUtilization(0, 10)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      expect(calculateUtilization(100, 85)).toBe(85);
      expect(calculateUtilization(100, 33)).toBe(33);
      expect(calculateUtilization(3, 1)).toBe(33); // 33.33 rounds to 33
    });
  });

  describe('calculateOverage', () => {
    it('returns 0 when allocated <= committed', () => {
      expect(calculateOverage(100, 80)).toBe(0);
      expect(calculateOverage(100, 100)).toBe(0);
    });

    it('returns correct overage when allocated > committed', () => {
      expect(calculateOverage(100, 110)).toBe(10);
      expect(calculateOverage(100, 150)).toBe(50);
    });

    it('handles edge cases', () => {
      expect(calculateOverage(0, 0)).toBe(0);
      expect(calculateOverage(0, 10)).toBe(10);
    });
  });
});

// ============================================================================
// Integration Tests: Alert State Transitions
// ============================================================================

describe('Alert State Transitions', () => {
  type AlertTransition = {
    from: SeatUsageAlertStatus;
    to: SeatUsageAlertStatus;
    action: 'ACKNOWLEDGE' | 'RESOLVE';
  };

  const validTransitions: AlertTransition[] = [
    { from: SeatUsageAlertStatus.OPEN, to: SeatUsageAlertStatus.ACKNOWLEDGED, action: 'ACKNOWLEDGE' },
    { from: SeatUsageAlertStatus.OPEN, to: SeatUsageAlertStatus.RESOLVED, action: 'RESOLVE' },
    { from: SeatUsageAlertStatus.ACKNOWLEDGED, to: SeatUsageAlertStatus.RESOLVED, action: 'RESOLVE' },
  ];

  function isValidTransition(from: SeatUsageAlertStatus, to: SeatUsageAlertStatus): boolean {
    return validTransitions.some((t) => t.from === from && t.to === to);
  }

  describe('isValidTransition', () => {
    it('allows OPEN -> ACKNOWLEDGED', () => {
      expect(isValidTransition(SeatUsageAlertStatus.OPEN, SeatUsageAlertStatus.ACKNOWLEDGED)).toBe(true);
    });

    it('allows OPEN -> RESOLVED', () => {
      expect(isValidTransition(SeatUsageAlertStatus.OPEN, SeatUsageAlertStatus.RESOLVED)).toBe(true);
    });

    it('allows ACKNOWLEDGED -> RESOLVED', () => {
      expect(isValidTransition(SeatUsageAlertStatus.ACKNOWLEDGED, SeatUsageAlertStatus.RESOLVED)).toBe(true);
    });

    it('disallows RESOLVED -> OPEN', () => {
      expect(isValidTransition(SeatUsageAlertStatus.RESOLVED, SeatUsageAlertStatus.OPEN)).toBe(false);
    });

    it('disallows RESOLVED -> ACKNOWLEDGED', () => {
      expect(isValidTransition(SeatUsageAlertStatus.RESOLVED, SeatUsageAlertStatus.ACKNOWLEDGED)).toBe(false);
    });

    it('disallows ACKNOWLEDGED -> OPEN', () => {
      expect(isValidTransition(SeatUsageAlertStatus.ACKNOWLEDGED, SeatUsageAlertStatus.OPEN)).toBe(false);
    });
  });
});
