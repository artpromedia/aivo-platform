/**
 * SLO Configuration Module
 *
 * Defines Service Level Objectives for key user journeys.
 * These definitions are used to:
 * - Generate Prometheus alerting rules
 * - Configure Grafana dashboards
 * - Calculate error budgets and burn rates
 */

export * from './definitions.js';
export * from './calculations.js';
