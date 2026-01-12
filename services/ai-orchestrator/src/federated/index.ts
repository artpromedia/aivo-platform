/**
 * Federated Prompt Learning Module
 *
 * Enables cross-tenant prompt optimization while preserving privacy through:
 * - Federated averaging of model updates
 * - Differential privacy guarantees
 * - Secure aggregation protocols
 * - Privacy budget management
 *
 * @module ai-orchestrator/federated
 */

// Core types
export * from './types.js';

// Tenant Learning Agent
export {
  TenantLearningAgent,
  type TenantLearningAgentConfig,
  DEFAULT_AGENT_CONFIG,
} from './tenant-learning-agent.js';

// Aggregation Server
export {
  FederatedAggregationServer,
  type FederatedServerConfig,
  DEFAULT_SERVER_CONFIG,
} from './aggregation-server.js';
