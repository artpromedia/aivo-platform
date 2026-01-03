/**
 * SLO Definitions
 *
 * Central configuration for all Service Level Objectives.
 * Each SLO defines:
 * - The metric and labels that form the SLI
 * - Target objectives (latency percentiles, error rates, availability)
 * - Measurement window
 * - Alert thresholds for burn-rate alerting
 */
export interface SloDefinition {
    /** Unique identifier for the SLO */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description of what this SLO measures */
    description: string;
    /** Service this SLO applies to */
    service: string;
    /** User journey this SLO is part of */
    journey: string;
    /** SLI configuration */
    sli: SliConfig;
    /** Target objectives */
    objectives: SloObjectives;
    /** Alert configuration */
    alerts: SloAlertConfig;
}
export interface SliConfig {
    /** Type of SLI */
    type: 'latency' | 'availability' | 'throughput' | 'quality';
    /** Prometheus metric name for the indicator */
    metric: string;
    /** Label filters to apply */
    labels?: Record<string, string>;
    /** For latency SLIs: the bucket to use (e.g., 'le="0.3"') */
    latencyBucket?: string;
    /** For availability SLIs: how to identify good events */
    goodEventFilter?: string;
    /** For availability SLIs: how to identify total events */
    totalEventFilter?: string;
}
export interface SloObjectives {
    /** Target percentage (e.g., 99.5 for 99.5%) */
    target: number;
    /** Measurement window in days */
    windowDays: number;
    /** For latency SLIs: target percentile (e.g., 95 for p95) */
    percentile?: number;
    /** For latency SLIs: target value in seconds */
    latencySeconds?: number;
}
export interface SloAlertConfig {
    /** Burn rate thresholds for different severity levels */
    burnRates: BurnRateConfig[];
}
export interface BurnRateConfig {
    /** Alert severity */
    severity: 'critical' | 'warning' | 'info';
    /** Burn rate multiplier (e.g., 14.4 for "fast burn") */
    burnRate: number;
    /** Short window for alert evaluation (e.g., '1h') */
    shortWindow: string;
    /** Long window for alert evaluation (e.g., '5m') */
    longWindow: string;
    /** Percentage of budget consumed at this rate */
    budgetConsumed: number;
}
export interface SloConfig {
    slos: SloDefinition[];
    globalWindowDays: number;
}
export declare const SLO_DEFINITIONS: SloDefinition[];
/**
 * Get SLO by ID
 */
export declare function getSloById(id: string): SloDefinition | undefined;
/**
 * Get SLOs by service
 */
export declare function getSlosByService(service: string): SloDefinition[];
/**
 * Get SLOs by journey
 */
export declare function getSlosByJourney(journey: string): SloDefinition[];
//# sourceMappingURL=definitions.d.ts.map