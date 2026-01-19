/**
 * Focus Monitor Module
 *
 * Tracks learner focus and engagement during learning sessions.
 * Provides break suggestions and focus analytics.
 */

export { FocusMonitor } from './FocusMonitor';
export { FocusIndicator } from './FocusIndicator';
export { BreakSuggestion } from './BreakSuggestion';
export { FocusStats } from './FocusStats';

export type {
  FocusState,
  FocusEvent,
  FocusSession,
  FocusMonitorProps,
  FocusIndicatorProps,
  BreakSuggestionProps,
  FocusStatsProps,
  FocusPreset,
} from './types';

export { FOCUS_PRESETS } from './types';
