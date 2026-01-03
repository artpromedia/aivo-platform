/**
 * SLO Calculations
 *
 * Functions for calculating error budgets, burn rates,
 * and SLO compliance.
 */
// ══════════════════════════════════════════════════════════════════════════════
// ERROR BUDGET CALCULATIONS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Calculate the total error budget for an SLO
 *
 * @param target - Target percentage (e.g., 99.5)
 * @returns Error budget as a decimal (e.g., 0.005 for 99.5% target)
 */
export function calculateErrorBudget(target) {
    return (100 - target) / 100;
}
/**
 * Calculate error budget in minutes for a given window
 *
 * @param target - Target percentage (e.g., 99.5)
 * @param windowDays - Measurement window in days
 * @returns Error budget in minutes
 */
export function calculateErrorBudgetMinutes(target, windowDays) {
    const budgetDecimal = calculateErrorBudget(target);
    const totalMinutes = windowDays * 24 * 60;
    return budgetDecimal * totalMinutes;
}
/**
 * Calculate remaining error budget
 *
 * @param slo - SLO definition
 * @param currentErrorRate - Current error rate as a decimal
 * @param elapsedDays - Days elapsed in the current window
 * @returns Remaining budget as a percentage (negative means over budget)
 */
export function calculateRemainingBudget(slo, currentErrorRate, elapsedDays) {
    const totalBudget = calculateErrorBudget(slo.objectives.target);
    const expectedBurnRate = elapsedDays / slo.objectives.windowDays;
    const expectedBudgetUsed = totalBudget * expectedBurnRate;
    const actualBudgetUsed = currentErrorRate * (elapsedDays / slo.objectives.windowDays);
    // Return remaining as percentage of total budget
    const remaining = (totalBudget - actualBudgetUsed) / totalBudget * 100;
    return remaining;
}
// ══════════════════════════════════════════════════════════════════════════════
// BURN RATE CALCULATIONS
// ══════════════════════════════════════════════════════════════════════════════
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
export function calculateBurnRate(actualErrorRate, target) {
    const errorBudget = calculateErrorBudget(target);
    if (errorBudget === 0)
        return Infinity;
    return actualErrorRate / errorBudget;
}
/**
 * Calculate time to exhaust error budget at current burn rate
 *
 * @param burnRate - Current burn rate
 * @param windowDays - SLO window in days
 * @param elapsedDays - Days elapsed in current window
 * @returns Days until budget exhaustion (Infinity if burn rate <= 1)
 */
export function calculateTimeToExhaustion(burnRate, windowDays, elapsedDays) {
    if (burnRate <= 1) {
        return Infinity;
    }
    const remainingDays = windowDays - elapsedDays;
    return remainingDays / burnRate;
}
/**
 * Calculate what burn rate would exhaust budget in a given time
 *
 * @param hoursToExhaust - Hours until budget exhaustion
 * @param windowDays - SLO window in days
 * @returns Required burn rate
 */
export function burnRateForExhaustion(hoursToExhaust, windowDays) {
    const windowHours = windowDays * 24;
    return windowHours / hoursToExhaust;
}
/**
 * Evaluate SLO compliance
 *
 * @param slo - SLO definition
 * @param currentValue - Current SLI value (success rate for availability, latency for latency SLOs)
 * @param elapsedDays - Days elapsed in current window
 * @returns Compliance result
 */
export function evaluateSloCompliance(slo, currentValue, elapsedDays) {
    const target = slo.objectives.target;
    const isCompliant = currentValue >= target;
    // For availability/quality SLOs, currentValue is success rate
    // For latency SLOs, we need to invert (currentValue is % meeting threshold)
    const errorRate = (100 - currentValue) / 100;
    const burnRate = calculateBurnRate(errorRate, target);
    const errorBudgetRemaining = calculateRemainingBudget(slo, errorRate, elapsedDays);
    let status;
    if (errorBudgetRemaining <= 0) {
        status = 'exhausted';
    }
    else if (burnRate >= 10) {
        status = 'critical';
    }
    else if (burnRate >= 3) {
        status = 'warning';
    }
    else {
        status = 'healthy';
    }
    return {
        sloId: slo.id,
        isCompliant,
        currentValue,
        target,
        errorBudgetRemaining,
        burnRate,
        status,
    };
}
// ══════════════════════════════════════════════════════════════════════════════
// PROMETHEUS QUERY HELPERS
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Generate PromQL for error rate calculation
 *
 * @param slo - SLO definition
 * @param window - Time window (e.g., '1h', '30d')
 * @returns PromQL query string
 */
export function generateErrorRateQuery(slo, window) {
    const { sli } = slo;
    const labels = sli.labels
        ? Object.entries(sli.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';
    if (sli.type === 'availability') {
        // Error rate = (total - good) / total
        const goodFilter = sli.goodEventFilter ? `,${sli.goodEventFilter}` : '';
        return `
      1 - (
        sum(rate(${sli.metric}{${labels}${goodFilter}}[${window}]))
        /
        sum(rate(${sli.metric}{${labels}}[${window}]))
      )
    `.trim();
    }
    if (sli.type === 'latency') {
        // Latency SLO: % of requests under threshold
        // Error rate = 1 - (requests under threshold / total requests)
        return `
      1 - (
        sum(rate(${sli.metric}_bucket{${labels},${sli.latencyBucket}}[${window}]))
        /
        sum(rate(${sli.metric}_count{${labels}}[${window}]))
      )
    `.trim();
    }
    return '';
}
/**
 * Generate PromQL for burn rate calculation
 *
 * @param slo - SLO definition
 * @param window - Time window (e.g., '1h')
 * @returns PromQL query string
 */
export function generateBurnRateQuery(slo, window) {
    const errorBudget = calculateErrorBudget(slo.objectives.target);
    const errorRateQuery = generateErrorRateQuery(slo, window);
    return `
    (${errorRateQuery}) / ${errorBudget}
  `.trim();
}
/**
 * Generate SLO recording rule name
 */
export function sloRecordingRuleName(sloId, type) {
    return `slo:${sloId.replace(/-/g, '_')}:${type}`;
}
//# sourceMappingURL=calculations.js.map