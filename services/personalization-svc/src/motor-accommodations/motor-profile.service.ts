/**
 * Motor Profile Service - ND-3.3
 *
 * Manages motor accommodation profiles for learners with motor challenges.
 * Provides profile CRUD, auto-configuration, interaction logging, and analytics.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

import type { Pool, PoolClient } from 'pg';

// Motor profile presets - previously imported from @aivo/ts-shared
const DEFAULT_MOTOR_PROFILE = {
  interactionMode: 'standard' as const,
  inputMethod: 'touch' as const,
  targetSizeMultiplier: 1.0,
  dwellTimeMs: 0,
  autoAdvanceDelay: 0,
};

const MILD_DIFFICULTY_PRESET = {
  interactionMode: 'assisted' as const,
  inputMethod: 'touch' as const,
  targetSizeMultiplier: 1.25,
  dwellTimeMs: 200,
  autoAdvanceDelay: 500,
};

const MODERATE_DIFFICULTY_PRESET = {
  interactionMode: 'assisted' as const,
  inputMethod: 'touch' as const,
  targetSizeMultiplier: 1.5,
  dwellTimeMs: 400,
  autoAdvanceDelay: 1000,
};

const SIGNIFICANT_DIFFICULTY_PRESET = {
  interactionMode: 'simplified' as const,
  inputMethod: 'switch' as const,
  targetSizeMultiplier: 2.0,
  dwellTimeMs: 600,
  autoAdvanceDelay: 1500,
};

const FULL_SUPPORT_PRESET = {
  interactionMode: 'scanning' as const,
  inputMethod: 'switch' as const,
  targetSizeMultiplier: 2.5,
  dwellTimeMs: 800,
  autoAdvanceDelay: 2000,
};

const ANALYTICS_THRESHOLDS = {
  missClickRatioThreshold: 0.3,
  avgResponseTimeThreshold: 5000,
  successRateThreshold: 0.7,
  ANALYSIS_WINDOW_DAYS: 30,
  MIN_SAMPLE_SIZE: 10,
  MIN_TAP_ACCURACY: 0.8,
  MAX_AVG_ATTEMPTS: 3,
  MIN_DRAG_SUCCESS_RATE: 0.7,
};
import type {
  MotorProfile,
  MotorProfileInput,
  MotorAccommodations,
  MotorContentAdaptations,
  AccommodationSuggestion,
  MotorAbilityLevel,
  MotorProfileRow,
  LogInteractionInput,
} from './motor-profile.types.js';

/**
 * Service for managing motor accommodation profiles
 */
export class MotorProfileService {
  constructor(private pool: Pool) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get or create motor profile for a learner
   */
  async getProfile(learnerId: string, tenantId: string): Promise<MotorProfile> {
    const client = await this.pool.connect();
    try {
      // Try to get existing profile
      const result = await client.query<MotorProfileRow>(
        'SELECT * FROM motor_profiles WHERE learner_id = $1',
        [learnerId]
      );

      if (result.rows.length > 0) {
        return this.rowToProfile(result.rows[0]!);
      }

      // Create new profile with defaults
      const insertResult = await client.query<MotorProfileRow>(
        `INSERT INTO motor_profiles (learner_id, tenant_id)
         VALUES ($1, $2)
         RETURNING *`,
        [learnerId, tenantId]
      );

      return this.rowToProfile(insertResult.rows[0]!);
    } finally {
      client.release();
    }
  }

  /**
   * Update motor profile
   */
  async updateProfile(
    learnerId: string,
    tenantId: string,
    updates: Partial<MotorProfileInput>
  ): Promise<MotorProfile> {
    const client = await this.pool.connect();
    try {
      // Build dynamic update query
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const fieldMappings: Record<string, string> = {
        fineMotorLevel: 'fine_motor_level',
        grossMotorLevel: 'gross_motor_level',
        hasTremor: 'has_tremor',
        tremorSeverity: 'tremor_severity',
        hasLimitedRange: 'has_limited_range',
        limitedRangeSide: 'limited_range_side',
        hasFatigue: 'has_fatigue',
        fatigueThresholdMinutes: 'fatigue_threshold_minutes',
        enlargedTouchTargets: 'enlarged_touch_targets',
        touchTargetMultiplier: 'touch_target_multiplier',
        touchHoldDuration: 'touch_hold_duration',
        accidentalTouchFilter: 'accidental_touch_filter',
        edgeIgnoreMargin: 'edge_ignore_margin',
        simplifiedGestures: 'simplified_gestures',
        allowSingleFingerGestures: 'allow_single_finger_gestures',
        disableMultiTouch: 'disable_multi_touch',
        disablePinchZoom: 'disable_pinch_zoom',
        disableSwipe: 'disable_swipe',
        swipeDistanceMultiplier: 'swipe_distance_multiplier',
        dragAssistEnabled: 'drag_assist_enabled',
        dragSnapToGrid: 'drag_snap_to_grid',
        dragGridSize: 'drag_grid_size',
        dragAutoComplete: 'drag_auto_complete',
        dragAutoCompleteThreshold: 'drag_auto_complete_threshold',
        extendedResponseTime: 'extended_response_time',
        responseTimeMultiplier: 'response_time_multiplier',
        disableTimedElements: 'disable_timed_elements',
        autoAdvanceDelay: 'auto_advance_delay',
        voiceInputEnabled: 'voice_input_enabled',
        voiceInputForText: 'voice_input_for_text',
        voiceInputForNavigation: 'voice_input_for_navigation',
        dwellSelectionEnabled: 'dwell_selection_enabled',
        dwellTimeMs: 'dwell_time_ms',
        dwellIndicatorStyle: 'dwell_indicator_style',
        switchAccessEnabled: 'switch_access_enabled',
        switchAccessMode: 'switch_access_mode',
        switchScanSpeed: 'switch_scan_speed',
        preferTyping: 'prefer_typing',
        preferVoiceInput: 'prefer_voice_input',
        preferMultipleChoice: 'prefer_multiple_choice',
        showWordPrediction: 'show_word_prediction',
        enlargedKeyboard: 'enlarged_keyboard',
        keyboardType: 'keyboard_type',
        enhancedTouchFeedback: 'enhanced_touch_feedback',
        hapticFeedbackIntensity: 'haptic_feedback_intensity',
        showTouchRipples: 'show_touch_ripples',
        highlightFocusedElement: 'highlight_focused_element',
        tremorFilterEnabled: 'tremor_filter_enabled',
        tremorFilterStrength: 'tremor_filter_strength',
        tremorFilterAlgorithm: 'tremor_filter_algorithm',
        autoBreakReminders: 'auto_break_reminders',
        breakReminderIntervalMinutes: 'break_reminder_interval_minutes',
        reduceRequirementsOnFatigue: 'reduce_requirements_on_fatigue',
        customGestures: 'custom_gestures',
        assessedBy: 'assessed_by',
        assessedAt: 'assessed_at',
        accommodationNotes: 'accommodation_notes',
      };

      for (const [key, value] of Object.entries(updates)) {
        const dbField = fieldMappings[key];
        if (dbField && value !== undefined) {
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(key === 'customGestures' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return this.getProfile(learnerId, tenantId);
      }

      values.push(learnerId, tenantId);

      const result = await client.query<MotorProfileRow>(
        `INSERT INTO motor_profiles (learner_id, tenant_id)
         VALUES ($${paramIndex}, $${paramIndex + 1})
         ON CONFLICT (learner_id) DO UPDATE SET
           ${setClauses.join(', ')},
           updated_at = NOW()
         RETURNING *`,
        values
      );

      return this.rowToProfile(result.rows[0]!);
    } finally {
      client.release();
    }
  }

  /**
   * Delete motor profile
   */
  async deleteProfile(learnerId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM motor_profiles WHERE learner_id = $1',
      [learnerId]
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOMMODATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get active accommodations for a learner
   */
  async getAccommodations(learnerId: string, tenantId: string): Promise<MotorAccommodations> {
    const profile = await this.getProfile(learnerId, tenantId) as any;

    return {
      // Touch
      touchTargetMultiplier: profile.touchTargetMultiplier,
      touchHoldDuration: profile.touchHoldDuration,
      accidentalTouchFilter: profile.accidentalTouchFilter,
      edgeIgnoreMargin: profile.edgeIgnoreMargin,

      // Gestures
      simplifiedGestures: profile.simplifiedGestures,
      allowSingleFingerGestures: profile.allowSingleFingerGestures,
      swipeDistanceMultiplier: profile.swipeDistanceMultiplier,
      disableMultiTouch: profile.disableMultiTouch,

      // Drag & drop
      dragAssistEnabled: profile.dragAssistEnabled,
      dragSnapToGrid: profile.dragSnapToGrid,
      dragGridSize: profile.dragGridSize,
      dragAutoComplete: profile.dragAutoComplete,
      dragAutoCompleteThreshold: profile.dragAutoCompleteThreshold,

      // Timing
      responseTimeMultiplier: profile.responseTimeMultiplier,
      disableTimedElements: profile.disableTimedElements,

      // Input methods
      voiceInputEnabled: profile.voiceInputEnabled,
      dwellSelectionEnabled: profile.dwellSelectionEnabled,
      dwellTimeMs: profile.dwellTimeMs,
      dwellIndicatorStyle: profile.dwellIndicatorStyle,
      switchAccessEnabled: profile.switchAccessEnabled,

      // Keyboard
      preferTyping: profile.preferTyping,
      enlargedKeyboard: profile.enlargedKeyboard,
      keyboardType: profile.keyboardType,
      showWordPrediction: profile.showWordPrediction,

      // Feedback
      enhancedTouchFeedback: profile.enhancedTouchFeedback,
      hapticFeedbackIntensity: profile.hapticFeedbackIntensity,

      // Tremor
      tremorFilterEnabled: profile.tremorFilterEnabled,
      tremorFilterStrength: profile.tremorFilterStrength,
    } as any;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Auto-configure accommodations based on motor level
   */
  async autoConfigureFromLevel(
    learnerId: string,
    tenantId: string,
    fineMotorLevel: MotorAbilityLevel,
    grossMotorLevel: MotorAbilityLevel
  ): Promise<MotorProfile> {
    const updates: Partial<MotorProfileInput> = {
      fineMotorLevel,
      grossMotorLevel,
    };

    // Apply preset based on fine motor level
    switch (fineMotorLevel) {
      case 'MILD_DIFFICULTY':
        Object.assign(updates, MILD_DIFFICULTY_PRESET);
        break;
      case 'MODERATE_DIFFICULTY':
        Object.assign(updates, MODERATE_DIFFICULTY_PRESET);
        break;
      case 'SIGNIFICANT_DIFFICULTY':
        Object.assign(updates, SIGNIFICANT_DIFFICULTY_PRESET);
        break;
      case 'REQUIRES_FULL_SUPPORT':
        Object.assign(updates, FULL_SUPPORT_PRESET);
        break;
    }

    return this.updateProfile(learnerId, tenantId, updates);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTION LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Log a motor interaction for analysis
   */
  async logInteraction(input: LogInteractionInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO motor_interaction_logs (
        learner_id, tenant_id, session_id, interaction_type, target_element,
        attempt_count, success_on_attempt, total_time_ms, target_hit_accuracy,
        drag_path_smoothness, accommodations_active, successful, used_alternative,
        alternative_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        input.learnerId,
        input.tenantId,
        input.sessionId ?? null,
        input.interactionType,
        input.targetElement ?? null,
        input.attemptCount,
        input.successOnAttempt ?? null,
        input.totalTimeMs ?? null,
        input.targetHitAccuracy ?? null,
        input.dragPathSmoothness ?? null,
        input.accommodationsActive,
        input.successful,
        input.usedAlternative,
        input.alternativeMethod ?? null,
      ]
    );

    // Trigger analysis if interaction failed multiple times
    if (!input.successful && input.attemptCount > 3) {
      // Fire and forget - don't await
      this.analyzeAndSuggestAdjustments(input.learnerId, input.tenantId).catch(
        (err) => console.error('Analysis failed:', err)
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS & SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze interaction logs and suggest adjustments
   */
  async analyzeAndSuggestAdjustments(
    learnerId: string,
    tenantId: string
  ): Promise<AccommodationSuggestion> {
    const suggestions: string[] = [];
    const recommendedChanges: Partial<MotorProfileInput> = {};

    // Get recent logs (last 7 days)
    const result = await this.pool.query(
      `SELECT * FROM motor_interaction_logs
       WHERE learner_id = $1
         AND timestamp > NOW() - INTERVAL '${ANALYTICS_THRESHOLDS.ANALYSIS_WINDOW_DAYS} days'
       ORDER BY timestamp DESC
       LIMIT 100`,
      [learnerId]
    );

    const logs = result.rows;
    if (logs.length < ANALYTICS_THRESHOLDS.MIN_SAMPLE_SIZE) {
      return { suggestions: [], recommendedChanges: {} };
    }

    // Analyze tap accuracy
    const taps = logs.filter((l) => l.interaction_type === 'tap');
    if (taps.length >= ANALYTICS_THRESHOLDS.MIN_SAMPLE_SIZE) {
      const avgTapAccuracy =
        taps.reduce((sum, t) => sum + (t.target_hit_accuracy || 0), 0) / taps.length;

      if (avgTapAccuracy < ANALYTICS_THRESHOLDS.MIN_TAP_ACCURACY) {
        suggestions.push('Tap accuracy is low - consider enlarging touch targets');
        recommendedChanges.touchTargetMultiplier = 1.5;
        recommendedChanges.enlargedTouchTargets = true;
      }
    }

    // Analyze attempt counts
    const avgAttempts =
      logs.reduce((sum, l) => sum + l.attempt_count, 0) / logs.length;

    if (avgAttempts > ANALYTICS_THRESHOLDS.MAX_AVG_ATTEMPTS) {
      suggestions.push(
        'Multiple attempts needed - consider enabling accidental touch filter'
      );
      recommendedChanges.accidentalTouchFilter = true;
      recommendedChanges.touchHoldDuration = 150;
    }

    // Analyze drag operations
    const drags = logs.filter((l) => l.interaction_type === 'drag');
    if (drags.length >= 5) {
      const dragSuccessRate =
        drags.filter((d) => d.successful).length / drags.length;

      if (dragSuccessRate < ANALYTICS_THRESHOLDS.MIN_DRAG_SUCCESS_RATE) {
        suggestions.push(
          'Drag operations are challenging - consider enabling drag assist'
        );
        recommendedChanges.dragAssistEnabled = true;
        recommendedChanges.dragSnapToGrid = true;
        recommendedChanges.dragAutoComplete = true;
      }
    }

    // Analyze voice input usage
    const voiceUsed = logs.filter((l) => l.alternative_method === 'voice');
    if (voiceUsed.length > logs.length * 0.3) {
      suggestions.push("Voice input is frequently used - ensure it's optimized");
      recommendedChanges.voiceInputEnabled = true;
      recommendedChanges.voiceInputForNavigation = true;
    }

    return { suggestions, recommendedChanges };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT ADAPTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get content adaptations for motor profile
   */
  async getContentAdaptations(
    learnerId: string,
    tenantId: string
  ): Promise<MotorContentAdaptations> {
    const profile = await this.getProfile(learnerId, tenantId);

    const preferredInputTypes: string[] = ['multiple_choice'];
    const avoidInputTypes: string[] = [];

    if (profile.preferTyping) {
      preferredInputTypes.push('typing');
    }

    if (profile.preferVoiceInput) {
      preferredInputTypes.push('voice');
    }

    if (
      profile.fineMotorLevel === 'SIGNIFICANT_DIFFICULTY' ||
      profile.fineMotorLevel === 'REQUIRES_FULL_SUPPORT'
    ) {
      avoidInputTypes.push('handwriting', 'precise_drawing', 'complex_drag');
    }

    const activityModifications: Record<string, unknown> = {};

    if (profile.dragAssistEnabled) {
      activityModifications['drag_and_drop'] = {
        snapToGrid: profile.dragSnapToGrid,
        gridSize: profile.dragGridSize,
        autoComplete: profile.dragAutoComplete,
        threshold: profile.dragAutoCompleteThreshold,
      };
    }

    if (profile.extendedResponseTime) {
      activityModifications['timed_activities'] = {
        timeMultiplier: profile.responseTimeMultiplier,
        disabled: profile.disableTimedElements,
      };
    }

    return {
      preferredInputTypes,
      avoidInputTypes,
      activityModifications,
    } as any;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert database row to MotorProfile type
   */
  private rowToProfile(row: MotorProfileRow): MotorProfile {
    return {
      id: row.id,
      learnerId: row.learner_id,
      tenantId: row.tenant_id,
      fineMotorLevel: row.fine_motor_level,
      grossMotorLevel: row.gross_motor_level,
      hasTremor: row.has_tremor,
      tremorSeverity: row.tremor_severity ?? null,
      hasLimitedRange: row.has_limited_range,
      limitedRangeSide: row.limited_range_side as 'left' | 'right' | 'both' | null,
      hasFatigue: row.has_fatigue,
      fatigueThresholdMinutes: row.fatigue_threshold_minutes ?? null,
      enlargedTouchTargets: row.enlarged_touch_targets,
      touchTargetMultiplier: Number(row.touch_target_multiplier),
      touchHoldDuration: row.touch_hold_duration,
      accidentalTouchFilter: row.accidental_touch_filter,
      edgeIgnoreMargin: row.edge_ignore_margin,
      simplifiedGestures: row.simplified_gestures,
      allowSingleFingerGestures: row.allow_single_finger_gestures,
      disableMultiTouch: row.disable_multi_touch,
      disablePinchZoom: row.disable_pinch_zoom,
      disableSwipe: row.disable_swipe,
      swipeDistanceMultiplier: Number(row.swipe_distance_multiplier),
      dragAssistEnabled: row.drag_assist_enabled,
      dragSnapToGrid: row.drag_snap_to_grid,
      dragGridSize: row.drag_grid_size,
      dragAutoComplete: row.drag_auto_complete,
      dragAutoCompleteThreshold: row.drag_auto_complete_threshold,
      extendedResponseTime: row.extended_response_time,
      responseTimeMultiplier: Number(row.response_time_multiplier),
      disableTimedElements: row.disable_timed_elements,
      autoAdvanceDelay: row.auto_advance_delay,
      voiceInputEnabled: row.voice_input_enabled,
      voiceInputForText: row.voice_input_for_text,
      voiceInputForNavigation: row.voice_input_for_navigation,
      dwellSelectionEnabled: row.dwell_selection_enabled,
      dwellTimeMs: row.dwell_time_ms,
      dwellIndicatorStyle: row.dwell_indicator_style as 'circle' | 'shrink' | 'fill',
      switchAccessEnabled: row.switch_access_enabled,
      switchAccessMode: row.switch_access_mode as 'auto_scan' | 'manual' | 'step_scan',
      switchScanSpeed: row.switch_scan_speed,
      preferTyping: row.prefer_typing,
      preferVoiceInput: row.prefer_voice_input,
      preferMultipleChoice: row.prefer_multiple_choice,
      showWordPrediction: row.show_word_prediction,
      enlargedKeyboard: row.enlarged_keyboard,
      keyboardType: row.keyboard_type as 'standard' | 'large' | 'split' | 'one_handed',
      enhancedTouchFeedback: row.enhanced_touch_feedback,
      hapticFeedbackIntensity: row.haptic_feedback_intensity as 'none' | 'light' | 'normal' | 'strong',
      showTouchRipples: row.show_touch_ripples,
      highlightFocusedElement: row.highlight_focused_element,
      tremorFilterEnabled: row.tremor_filter_enabled,
      tremorFilterStrength: row.tremor_filter_strength,
      tremorFilterAlgorithm: row.tremor_filter_algorithm as 'moving_average' | 'kalman' | 'exponential',
      autoBreakReminders: row.auto_break_reminders,
      breakReminderIntervalMinutes: row.break_reminder_interval_minutes,
      reduceRequirementsOnFatigue: row.reduce_requirements_on_fatigue,
      customGestures: row.custom_gestures as Record<string, { action: string; gesture: string }> | undefined,
      assessedBy: (row.assessed_by as string) ?? null,
      assessedAt: row.assessed_at ?? null,
      accommodationNotes: row.accommodation_notes ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as any;
  }
}
