/**
 * Pipeline Module Exports
 *
 * Centralizes the AI orchestration pipeline functionality.
 */

export { orchestrateAiRequest, type OrchestratorDependencies } from './orchestrator.js';

// Re-export runAiCall for backward compatibility
export {
  runAiCall,
  type AiCallContext,
  type AiCallInput,
  type AiCallOutput,
} from './AiCallPipeline.js';
