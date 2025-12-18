/**
 * ND-2.3: Emotional Monitoring Module
 *
 * Exports for session emotional state monitoring.
 */

export {
  SessionEmotionalMonitor,
  type SessionEmotionalMonitorConfig,
  type BehavioralSignals,
  type ContextualFactors,
  type EmotionalStateAnalysis,
  type SuggestedIntervention,
} from './session-emotional-monitor.js';

export {
  StateHistory,
  getStateHistory,
  type StateHistoryEntry,
  type TrendAnalysis,
} from './state-history.js';
