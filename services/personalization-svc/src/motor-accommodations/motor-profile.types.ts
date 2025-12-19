/**
 * Motor Profile Types - ND-3.3
 *
 * Local type definitions for motor profile service.
 * Re-exports shared types and adds service-specific interfaces.
 */

import type {
  MotorProfile,
  MotorProfileInput,
  MotorAccommodations,
  MotorInteractionLog,
  MotorContentAdaptations,
  AccommodationSuggestion,
  MotorAbilityLevel,
  MotorInteractionType,
} from '@aivo/ts-shared';

// Re-export shared types
export type {
  MotorProfile,
  MotorProfileInput,
  MotorAccommodations,
  MotorInteractionLog,
  MotorContentAdaptations,
  AccommodationSuggestion,
  MotorAbilityLevel,
  MotorInteractionType,
};

/**
 * Database row representation for motor profiles
 */
export interface MotorProfileRow {
  id: string;
  learner_id: string;
  tenant_id: string;
  fine_motor_level: MotorAbilityLevel;
  gross_motor_level: MotorAbilityLevel;
  has_tremor: boolean;
  tremor_severity: number | null;
  has_limited_range: boolean;
  limited_range_side: string | null;
  has_fatigue: boolean;
  fatigue_threshold_minutes: number | null;
  enlarged_touch_targets: boolean;
  touch_target_multiplier: number;
  touch_hold_duration: number;
  accidental_touch_filter: boolean;
  edge_ignore_margin: number;
  simplified_gestures: boolean;
  allow_single_finger_gestures: boolean;
  disable_multi_touch: boolean;
  disable_pinch_zoom: boolean;
  disable_swipe: boolean;
  swipe_distance_multiplier: number;
  drag_assist_enabled: boolean;
  drag_snap_to_grid: boolean;
  drag_grid_size: number;
  drag_auto_complete: boolean;
  drag_auto_complete_threshold: number;
  extended_response_time: boolean;
  response_time_multiplier: number;
  disable_timed_elements: boolean;
  auto_advance_delay: number;
  voice_input_enabled: boolean;
  voice_input_for_text: boolean;
  voice_input_for_navigation: boolean;
  dwell_selection_enabled: boolean;
  dwell_time_ms: number;
  dwell_indicator_style: string;
  switch_access_enabled: boolean;
  switch_access_mode: string;
  switch_scan_speed: number;
  prefer_typing: boolean;
  prefer_voice_input: boolean;
  prefer_multiple_choice: boolean;
  show_word_prediction: boolean;
  enlarged_keyboard: boolean;
  keyboard_type: string;
  enhanced_touch_feedback: boolean;
  haptic_feedback_intensity: string;
  show_touch_ripples: boolean;
  highlight_focused_element: boolean;
  tremor_filter_enabled: boolean;
  tremor_filter_strength: number;
  tremor_filter_algorithm: string;
  auto_break_reminders: boolean;
  break_reminder_interval_minutes: number;
  reduce_requirements_on_fatigue: boolean;
  custom_gestures: Record<string, unknown> | null;
  assessed_by: string | null;
  assessed_at: Date | null;
  accommodation_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database row for motor interaction logs
 */
export interface MotorInteractionLogRow {
  id: string;
  learner_id: string;
  tenant_id: string;
  session_id: string | null;
  interaction_type: string;
  target_element: string | null;
  attempt_count: number;
  success_on_attempt: number | null;
  total_time_ms: number | null;
  target_hit_accuracy: number | null;
  drag_path_smoothness: number | null;
  accommodations_active: string[];
  successful: boolean;
  used_alternative: boolean;
  alternative_method: string | null;
  timestamp: Date;
}

/**
 * Input for logging motor interactions
 */
export interface LogInteractionInput {
  learnerId: string;
  tenantId: string;
  sessionId?: string;
  interactionType: MotorInteractionType;
  targetElement?: string;
  attemptCount: number;
  successOnAttempt?: number;
  totalTimeMs?: number;
  targetHitAccuracy?: number;
  dragPathSmoothness?: number;
  successful: boolean;
  usedAlternative: boolean;
  alternativeMethod?: string;
  accommodationsActive: string[];
}
