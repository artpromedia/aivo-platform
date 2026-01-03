/**
 * SLO Calculations
 *
 * Functions for calculating error budgets, burn rates,
 * and SLO compliance.
 */
import type { SloDefinition } from './definitions.js';
/**
 * Calculate the total error budget for an SLO
 *
 * @param target - Target percentage (e.g., 99.5)
 * @returns Error budget as a decimal (e.g., 0.005 for 99.5% target)
 */
export declare function calculateErrorBudget(target: number): number;
/**
 * Calculate error budget in minutes for a given window
 *
 * @param target - Target percentage (e.g., 99.5)
 * @param windowDays - Measurement window in days
 * @returns Error budget in minutes
 */
export declare function calculateErrorBudgetMinutes(target: number, windowDays: number): number;
/**
 * Calculate remaining error budget
 *
 * @param slo - SLO definition
 * @param currentErrorRate - Current error rate as a decimal
 * @param elapsedDays - Days elapsed in the current window
 * @returns Remaining budget as a percentage (negative means over budget)
 */
export declare function calculateRemainingBudget(slo: SloDefinition, currentErrorRate: number, elapsedDays: number): number;
/**
 * Calculate burn rate
 *
 * Burn rate = (actual error rate) / (error budget rate)
 * A burn rate of 1 means burning budget at exactly the expected rate.
 * A burn rate of 2 means burning budget twice as fast.
 *
 * @param actualErrorRate - Current error rate as a decimal
 * @param target - SLO target percentage
 * @returns Burn rate multiplier
 */
export declare function calculateBurnRate(actualErrorRate: number, target: number): number;
/**
 * Calculate time to exhaust error budget at current burn rate
 *
 * @param burnRate - Current burn rate
 * @param windowDays - SLO window in days
 * @param elapsedDays - Days elapsed in current window
 * @returns Days until budget exhaustion (Infinity if burn rate <= 1)
 */
export declare function calculateTimeToExhaustion(burnRate: number, windowDays: number, elapsedDays: number): number;
/**
 * Calculate what burn rate would exhaust budget in a given time
 *
 * @param hoursToExhaust - Hours until budget exhaustion
 * @param windowDays - SLO window in days
 * @returns Required burn rate
 */
export declare function burnRateForExhaustion(hoursToExhaust: number, windowDays: number): number;
export interface SloComplianceResult {
    sloId: string;
    isCompliant: boolean;
    currentValue: number;
    target: number;
    errorBudgetRemaining: number;
    burnRate: number;
    status: 'healthy' | 'warning' | 'critical' | 'exhausted';
}
/**
 * Evaluate SLO compliance
 *
 * @param slo - SLO definition
 * @param currentValue - Current SLI value (success rate for availability, latency for latency SLOs)
 * @param elapsedDays - Days elapsed in current window
 * @returns Compliance result
 */
export declare function evaluateSloCompliance(slo: SloDefinition, currentValue: number, elapsedDays: number): SloComplianceResult;
/**
 * Generate PromQL for error rate calculation
 *
 * @param slo - SLO definition
 * @param window - Time window (e.g., '1h', '30d')
 * @returns PromQL query string
 */
export declare function generateErrorRateQuery(slo: SloDefinition, window: string): string;
/**
 * Generate PromQL for burn rate calculation
 *
 * @param slo - SLO definition
 * @param window - Time window (e.g., '1h')
 * @returns PromQL query string
 */
export declare function generateBurnRateQuery(slo: SloDefinition, window: string): string;
/**
 * Generate SLO recording rule name
 */
export declare function sloRecordingRuleName(sloId: string, type: 'error_rate' | 'burn_rate'): string;
//# sourceMappingURL=calculations.d.ts.map