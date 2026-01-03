/**
 * Metrics Registry Factory
 *
 * Creates a fully-configured metrics registry with all standard Aivo metrics.
 */
import type { MetricsRegistry } from './types.js';
export interface MetricsConfig {
    serviceName: string;
    environment?: string;
    prefix?: string;
    defaultLabels?: Record<string, string>;
    collectDefaultMetrics?: boolean;
}
export declare function createMetricsRegistry(config: MetricsConfig): MetricsRegistry;
//# sourceMappingURL=registry.d.ts.map