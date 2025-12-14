/**
 * Profile Service Types
 *
 * Type definitions for profile and accommodation entities.
 */

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: 'PARENT' | 'TEACHER' | 'THERAPIST' | 'DISTRICT_ADMIN' | 'PLATFORM_ADMIN';
}

export interface ProfileWithAccommodations {
  id: string;
  tenantId: string;
  learnerId: string;
  profileVersion: number;
  summary: string | null;
  learningStyleJson: Record<string, unknown>;
  sensoryProfileJson: Record<string, unknown>;
  communicationPreferencesJson: Record<string, unknown>;
  interactionConstraintsJson: Record<string, unknown>;
  uiAccessibilityJson: Record<string, unknown>;
  origin: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  accommodations: AccommodationSummary[];
}

export interface AccommodationSummary {
  id: string;
  category: string;
  description: string;
  appliesToDomains: string[];
  source: string;
  isCritical: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INTEGRATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Compact profile payload for AI orchestrator consumption.
 * No PII, just learning/interaction preferences.
 */
export interface ProfileForAi {
  learning_style: {
    prefers_visual?: boolean;
    prefers_audio?: boolean;
    prefers_text?: boolean;
    prefers_kinesthetic?: boolean;
    needs_chunking?: boolean;
    benefits_from_repetition?: boolean;
  };
  sensory: {
    noise_sensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
    light_sensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
    movement_breaks?: boolean;
    break_duration_minutes?: number;
  };
  communication: {
    short_prompts?: boolean;
    single_step_instructions?: boolean;
    visual_schedules?: boolean;
    check_understanding_frequency?: 'LOW' | 'MEDIUM' | 'HIGH';
    wait_time?: boolean;
    response_format?: 'verbal' | 'written' | 'pointing' | 'any';
  };
  interaction_constraints: {
    questions_per_screen?: number | null;
    avoid_timers?: boolean;
    avoid_red_text?: boolean;
    avoid_flashing?: boolean;
    avoid_loud_sounds?: boolean;
    predictable_flow?: boolean;
  };
  ui_accessibility: {
    font?: string;
    text_size?: string;
    reduce_motion?: boolean;
    high_contrast?: boolean;
    warm_colors?: boolean;
    read_aloud_button?: boolean;
    auto_read_aloud?: boolean;
  };
  accommodations: {
    category: string;
    description: string;
    domains: string[];
    is_critical: boolean;
  }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ProfileUpdatedEvent {
  tenantId: string;
  learnerId: string;
  profileId: string;
  version: number;
  actorUserId: string;
  actorRole: string;
  changeType: 'CREATED' | 'UPDATED';
  changedFields?: string[];
  timestamp: string;
}

export interface AccommodationEvent {
  tenantId: string;
  learnerId: string;
  accommodationId: string;
  category: string;
  isCritical: boolean;
  actorUserId: string;
  actorRole: string;
  eventType: 'CREATED' | 'UPDATED' | 'DELETED';
  timestamp: string;
}
