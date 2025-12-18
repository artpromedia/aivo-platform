/**
 * Predictability Module - ND-2.2
 *
 * Provides predictability enforcement for learners who require predictable session flow.
 * This includes visual schedules, routines, change warnings, and anxiety support.
 */

// Types
export type {
  PredictabilityPreferences,
  SessionRoutineData,
  RoutineStep,
  SessionStructureDefinition,
  SessionOutlineItem,
  PredictableSessionPlan,
  SessionActivityInput,
  ChangeExplanation,
  AnxietyReportResult,
  RoutineType,
  SessionPhase,
  OutlineItemStatus,
} from './predictability.types.js';

// Services
export { PredictabilityService } from './predictability.service.js';

// Routine Manager
export {
  getSystemDefaultRoutine,
  getAllSystemDefaultRoutines,
  getRoutineTemplates,
  validateRoutineSteps,
  calculateRoutineDuration,
  getRoutineDisplayInfo,
  type RoutineTemplate,
  type RoutineDisplayInfo,
} from './routine-manager.js';

// Session Structure
export {
  DEFAULT_SESSION_STRUCTURE,
  MINIMAL_SESSION_STRUCTURE,
  HIGH_SUPPORT_SESSION_STRUCTURE,
  buildSessionOutline,
  updateOutlineProgress,
  getOutlineProgress,
  findNextItem,
  findPreviousItem,
  insertActivityIntoOutline,
  removeActivityFromOutline,
  extendItemTime,
  reorderOutlineItems,
  validateSessionStructure,
  validateOutlineAgainstStructure,
  getActivityIcon,
  getActivityColor,
  getPhaseDisplayName,
  getStatusDisplayInfo,
  calculateTotalDuration,
  type OutlineBuilderOptions,
} from './session-structure.js';

// Events
export {
  predictabilityEventPublisher,
  type SessionPlanCreatedPayload,
  type SessionProgressUpdatedPayload,
  type UnexpectedChangeRequestedPayload,
  type ChangeAppliedPayload,
  type AnxietyReportedPayload,
  type RoutineStartedPayload,
  type RoutineStepCompletedPayload,
  type RoutineCompletedPayload,
  type PreferencesUpdatedPayload,
} from './predictability.events.js';
