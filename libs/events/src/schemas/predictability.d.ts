import { z } from 'zod';
export declare const PREDICTABILITY_EVENT_TYPES: readonly [
  'predictability.session_plan.created',
  'predictability.progress.updated',
  'predictability.change.requested',
  'predictability.change.applied',
  'predictability.anxiety.reported',
  'predictability.routine.started',
  'predictability.routine.step_completed',
  'predictability.routine.completed',
  'predictability.preferences.updated',
];
/**
 * Emitted when a new session plan is created for a learner.
 */
export declare const SessionPlanCreatedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.session_plan.created'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        planId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Structure type used for the session */
        structureType: z.ZodEnum<['default', 'minimal', 'high_support', 'custom']>;
        /** Number of items in the session outline */
        itemCount: z.ZodNumber;
        /** Estimated total session duration in minutes */
        estimatedMinutes: z.ZodNumber;
        /** Whether session includes welcome segment */
        hasWelcome: z.ZodBoolean;
        /** Whether session includes check-in segment */
        hasCheckin: z.ZodBoolean;
        /** Whether session includes goodbye segment */
        hasGoodbye: z.ZodBoolean;
        /** Number of activities in the session */
        activityCount: z.ZodNumber;
        /** Number of breaks in the session */
        breakCount: z.ZodNumber;
        /** When the plan was created */
        createdAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        createdAt?: string;
        planId?: string;
        structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
        itemCount?: number;
        estimatedMinutes?: number;
        hasWelcome?: boolean;
        hasCheckin?: boolean;
        hasGoodbye?: boolean;
        activityCount?: number;
        breakCount?: number;
      },
      {
        learnerId?: string;
        sessionId?: string;
        createdAt?: string;
        planId?: string;
        structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
        itemCount?: number;
        estimatedMinutes?: number;
        hasWelcome?: boolean;
        hasCheckin?: boolean;
        hasGoodbye?: boolean;
        activityCount?: number;
        breakCount?: number;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      createdAt?: string;
      planId?: string;
      structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
      itemCount?: number;
      estimatedMinutes?: number;
      hasWelcome?: boolean;
      hasCheckin?: boolean;
      hasGoodbye?: boolean;
      activityCount?: number;
      breakCount?: number;
    };
    eventId?: string;
    eventType?: 'predictability.session_plan.created';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      createdAt?: string;
      planId?: string;
      structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
      itemCount?: number;
      estimatedMinutes?: number;
      hasWelcome?: boolean;
      hasCheckin?: boolean;
      hasGoodbye?: boolean;
      activityCount?: number;
      breakCount?: number;
    };
    eventId?: string;
    eventType?: 'predictability.session_plan.created';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type SessionPlanCreated = z.infer<typeof SessionPlanCreatedSchema>;
/**
 * Emitted when session progress is updated.
 */
export declare const SessionProgressUpdatedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.progress.updated'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        planId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** ID of the current item being worked on */
        currentItemId: z.ZodString;
        /** Current phase of the item */
        currentPhase: z.ZodString;
        /** Number of items completed */
        completedItems: z.ZodNumber;
        /** Total items in the session */
        totalItems: z.ZodNumber;
        /** Progress percentage (0-100) */
        progressPercent: z.ZodNumber;
        /** Estimated remaining minutes */
        remainingMinutes: z.ZodNumber;
        /** When the progress was updated */
        timestamp: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        planId?: string;
        currentItemId?: string;
        currentPhase?: string;
        completedItems?: number;
        totalItems?: number;
        progressPercent?: number;
        remainingMinutes?: number;
      },
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        planId?: string;
        currentItemId?: string;
        currentPhase?: string;
        completedItems?: number;
        totalItems?: number;
        progressPercent?: number;
        remainingMinutes?: number;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      timestamp?: string;
      sessionId?: string;
      planId?: string;
      currentItemId?: string;
      currentPhase?: string;
      completedItems?: number;
      totalItems?: number;
      progressPercent?: number;
      remainingMinutes?: number;
    };
    eventId?: string;
    eventType?: 'predictability.progress.updated';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      timestamp?: string;
      sessionId?: string;
      planId?: string;
      currentItemId?: string;
      currentPhase?: string;
      completedItems?: number;
      totalItems?: number;
      progressPercent?: number;
      remainingMinutes?: number;
    };
    eventId?: string;
    eventType?: 'predictability.progress.updated';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type SessionProgressUpdated = z.infer<typeof SessionProgressUpdatedSchema>;
/**
 * Emitted when an unexpected change to the session plan is requested.
 */
export declare const UnexpectedChangeRequestedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.change.requested'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        planId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Type of change requested */
        changeType: z.ZodEnum<['add', 'remove', 'reorder', 'skip', 'extend']>;
        /** Reason for the change */
        reason: z.ZodString;
        /** Severity of the change */
        severity: z.ZodEnum<['low', 'medium', 'high']>;
        /** Explanation provided to learner */
        explanation: z.ZodObject<
          {
            severity: z.ZodEnum<['low', 'medium', 'high']>;
            title: z.ZodString;
            message: z.ZodString;
            iconType: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            message?: string;
            title?: string;
            severity?: 'low' | 'medium' | 'high';
            iconType?: string;
          },
          {
            message?: string;
            title?: string;
            severity?: 'low' | 'medium' | 'high';
            iconType?: string;
          }
        >;
        /** Whether the change requires learner/guardian approval */
        requiresApproval: z.ZodBoolean;
        /** Approval status if requires approval */
        approvalStatus: z.ZodOptional<z.ZodEnum<['pending', 'approved', 'declined']>>;
        /** When the change was requested */
        timestamp: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        reason?: string;
        timestamp?: string;
        sessionId?: string;
        planId?: string;
        changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
        severity?: 'low' | 'medium' | 'high';
        explanation?: {
          message?: string;
          title?: string;
          severity?: 'low' | 'medium' | 'high';
          iconType?: string;
        };
        requiresApproval?: boolean;
        approvalStatus?: 'pending' | 'approved' | 'declined';
      },
      {
        learnerId?: string;
        reason?: string;
        timestamp?: string;
        sessionId?: string;
        planId?: string;
        changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
        severity?: 'low' | 'medium' | 'high';
        explanation?: {
          message?: string;
          title?: string;
          severity?: 'low' | 'medium' | 'high';
          iconType?: string;
        };
        requiresApproval?: boolean;
        approvalStatus?: 'pending' | 'approved' | 'declined';
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      reason?: string;
      timestamp?: string;
      sessionId?: string;
      planId?: string;
      changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
      severity?: 'low' | 'medium' | 'high';
      explanation?: {
        message?: string;
        title?: string;
        severity?: 'low' | 'medium' | 'high';
        iconType?: string;
      };
      requiresApproval?: boolean;
      approvalStatus?: 'pending' | 'approved' | 'declined';
    };
    eventId?: string;
    eventType?: 'predictability.change.requested';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      reason?: string;
      timestamp?: string;
      sessionId?: string;
      planId?: string;
      changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
      severity?: 'low' | 'medium' | 'high';
      explanation?: {
        message?: string;
        title?: string;
        severity?: 'low' | 'medium' | 'high';
        iconType?: string;
      };
      requiresApproval?: boolean;
      approvalStatus?: 'pending' | 'approved' | 'declined';
    };
    eventId?: string;
    eventType?: 'predictability.change.requested';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type UnexpectedChangeRequested = z.infer<typeof UnexpectedChangeRequestedSchema>;
/**
 * Emitted when a change is applied to the session plan.
 */
export declare const ChangeAppliedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.change.applied'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        planId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Unique identifier for the change */
        changeId: z.ZodString;
        /** Type of change applied */
        changeType: z.ZodEnum<['add', 'remove', 'reorder', 'skip', 'extend']>;
        /** Whether the change was explicitly approved */
        wasApproved: z.ZodBoolean;
        /** When the change was applied */
        appliedAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        planId?: string;
        changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
        changeId?: string;
        wasApproved?: boolean;
        appliedAt?: string;
      },
      {
        learnerId?: string;
        sessionId?: string;
        planId?: string;
        changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
        changeId?: string;
        wasApproved?: boolean;
        appliedAt?: string;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      planId?: string;
      changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
      changeId?: string;
      wasApproved?: boolean;
      appliedAt?: string;
    };
    eventId?: string;
    eventType?: 'predictability.change.applied';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      planId?: string;
      changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
      changeId?: string;
      wasApproved?: boolean;
      appliedAt?: string;
    };
    eventId?: string;
    eventType?: 'predictability.change.applied';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type ChangeApplied = z.infer<typeof ChangeAppliedSchema>;
/**
 * Emitted when anxiety is reported during a session.
 */
export declare const AnxietyReportedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.anxiety.reported'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Severity level of reported anxiety */
        level: z.ZodEnum<['mild', 'moderate', 'severe']>;
        /** Category of trigger if identified */
        triggerCategory: z.ZodOptional<z.ZodString>;
        /** Specific trigger ID if identified */
        triggerId: z.ZodOptional<z.ZodString>;
        /** Support actions taken in response */
        supportActions: z.ZodArray<z.ZodString, 'many'>;
        /** Coping strategy used if any */
        copingStrategyUsed: z.ZodOptional<z.ZodString>;
        /** Time in seconds until learner calmed down (if tracked) */
        calmedDownAfterSeconds: z.ZodOptional<z.ZodNumber>;
        /** When the anxiety was reported */
        reportedAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        level?: 'moderate' | 'mild' | 'severe';
        triggerCategory?: string;
        triggerId?: string;
        supportActions?: string[];
        copingStrategyUsed?: string;
        calmedDownAfterSeconds?: number;
        reportedAt?: string;
      },
      {
        learnerId?: string;
        sessionId?: string;
        level?: 'moderate' | 'mild' | 'severe';
        triggerCategory?: string;
        triggerId?: string;
        supportActions?: string[];
        copingStrategyUsed?: string;
        calmedDownAfterSeconds?: number;
        reportedAt?: string;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      level?: 'moderate' | 'mild' | 'severe';
      triggerCategory?: string;
      triggerId?: string;
      supportActions?: string[];
      copingStrategyUsed?: string;
      calmedDownAfterSeconds?: number;
      reportedAt?: string;
    };
    eventId?: string;
    eventType?: 'predictability.anxiety.reported';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      level?: 'moderate' | 'mild' | 'severe';
      triggerCategory?: string;
      triggerId?: string;
      supportActions?: string[];
      copingStrategyUsed?: string;
      calmedDownAfterSeconds?: number;
      reportedAt?: string;
    };
    eventId?: string;
    eventType?: 'predictability.anxiety.reported';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type AnxietyReported = z.infer<typeof AnxietyReportedSchema>;
/**
 * Emitted when a routine is started during a session.
 */
export declare const RoutineStartedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.routine.started'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Unique identifier for the routine instance */
        routineId: z.ZodString;
        /** Type of routine (e.g., 'welcome', 'transition', 'calming') */
        routineType: z.ZodString;
        /** Total steps in the routine */
        totalSteps: z.ZodNumber;
        /** Estimated duration in seconds */
        estimatedSeconds: z.ZodNumber;
        /** Whether this is a custom learner routine */
        isCustom: z.ZodBoolean;
        /** When the routine started */
        startedAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        routineId?: string;
        routineType?: string;
        totalSteps?: number;
        estimatedSeconds?: number;
        isCustom?: boolean;
      },
      {
        learnerId?: string;
        sessionId?: string;
        startedAt?: string;
        routineId?: string;
        routineType?: string;
        totalSteps?: number;
        estimatedSeconds?: number;
        isCustom?: boolean;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      startedAt?: string;
      routineId?: string;
      routineType?: string;
      totalSteps?: number;
      estimatedSeconds?: number;
      isCustom?: boolean;
    };
    eventId?: string;
    eventType?: 'predictability.routine.started';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      startedAt?: string;
      routineId?: string;
      routineType?: string;
      totalSteps?: number;
      estimatedSeconds?: number;
      isCustom?: boolean;
    };
    eventId?: string;
    eventType?: 'predictability.routine.started';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type RoutineStarted = z.infer<typeof RoutineStartedSchema>;
/**
 * Emitted when a routine step is completed.
 */
export declare const RoutineStepCompletedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.routine.step_completed'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        routineId: z.ZodString;
        routineType: z.ZodString;
        /** Index of the step (0-based) */
        stepIndex: z.ZodNumber;
        /** Type of step (e.g., 'breathing', 'visual_cue', 'countdown') */
        stepType: z.ZodString;
        /** Whether the step was skipped */
        wasSkipped: z.ZodBoolean;
        /** Actual duration of the step in seconds */
        durationSeconds: z.ZodNumber;
        /** When the step completed */
        timestamp: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        durationSeconds?: number;
        stepIndex?: number;
        stepType?: string;
        routineId?: string;
        routineType?: string;
        wasSkipped?: boolean;
      },
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        durationSeconds?: number;
        stepIndex?: number;
        stepType?: string;
        routineId?: string;
        routineType?: string;
        wasSkipped?: boolean;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      timestamp?: string;
      sessionId?: string;
      durationSeconds?: number;
      stepIndex?: number;
      stepType?: string;
      routineId?: string;
      routineType?: string;
      wasSkipped?: boolean;
    };
    eventId?: string;
    eventType?: 'predictability.routine.step_completed';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      timestamp?: string;
      sessionId?: string;
      durationSeconds?: number;
      stepIndex?: number;
      stepType?: string;
      routineId?: string;
      routineType?: string;
      wasSkipped?: boolean;
    };
    eventId?: string;
    eventType?: 'predictability.routine.step_completed';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type RoutineStepCompleted = z.infer<typeof RoutineStepCompletedSchema>;
/**
 * Emitted when a routine is completed.
 */
export declare const RoutineCompletedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.routine.completed'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        routineId: z.ZodString;
        routineType: z.ZodString;
        /** Outcome of the routine */
        outcome: z.ZodEnum<['completed', 'partial', 'skipped', 'interrupted']>;
        /** Number of steps completed */
        stepsCompleted: z.ZodNumber;
        /** Total steps in the routine */
        stepsTotal: z.ZodNumber;
        /** Actual duration in seconds */
        actualDurationSeconds: z.ZodNumber;
        /** Planned duration in seconds */
        plannedDurationSeconds: z.ZodNumber;
        /** When the routine completed */
        completedAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
        completedAt?: string;
        routineId?: string;
        routineType?: string;
        stepsCompleted?: number;
        stepsTotal?: number;
        actualDurationSeconds?: number;
        plannedDurationSeconds?: number;
      },
      {
        learnerId?: string;
        sessionId?: string;
        outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
        completedAt?: string;
        routineId?: string;
        routineType?: string;
        stepsCompleted?: number;
        stepsTotal?: number;
        actualDurationSeconds?: number;
        plannedDurationSeconds?: number;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
      completedAt?: string;
      routineId?: string;
      routineType?: string;
      stepsCompleted?: number;
      stepsTotal?: number;
      actualDurationSeconds?: number;
      plannedDurationSeconds?: number;
    };
    eventId?: string;
    eventType?: 'predictability.routine.completed';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      sessionId?: string;
      outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
      completedAt?: string;
      routineId?: string;
      routineType?: string;
      stepsCompleted?: number;
      stepsTotal?: number;
      actualDurationSeconds?: number;
      plannedDurationSeconds?: number;
    };
    eventId?: string;
    eventType?: 'predictability.routine.completed';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type RoutineCompleted = z.infer<typeof RoutineCompletedSchema>;
/**
 * Emitted when predictability preferences are updated.
 */
export declare const PreferencesUpdatedSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    tenantId: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<
      {
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
      },
      'strip',
      z.ZodTypeAny,
      {
        version?: string;
        service?: string;
        instanceId?: string;
      },
      {
        version?: string;
        service?: string;
        instanceId?: string;
      }
    >;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    eventType: z.ZodLiteral<'predictability.preferences.updated'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        learnerId: z.ZodString;
        /** Whether predictability features are enabled */
        enabled: z.ZodBoolean;
        /** Minutes before session end to warn */
        warnMinutesBefore: z.ZodNumber;
        /** Whether to show remaining time */
        showRemainingTime: z.ZodBoolean;
        /** Whether to use visual schedule */
        useVisualSchedule: z.ZodBoolean;
        /** Preferred routine types */
        preferredRoutines: z.ZodArray<z.ZodString, 'many'>;
        /** List of changed fields */
        changes: z.ZodArray<z.ZodString, 'many'>;
        /** When the preferences were updated */
        updatedAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        enabled?: boolean;
        warnMinutesBefore?: number;
        showRemainingTime?: boolean;
        useVisualSchedule?: boolean;
        preferredRoutines?: string[];
        changes?: string[];
        updatedAt?: string;
      },
      {
        learnerId?: string;
        enabled?: boolean;
        warnMinutesBefore?: number;
        showRemainingTime?: boolean;
        useVisualSchedule?: boolean;
        preferredRoutines?: string[];
        changes?: string[];
        updatedAt?: string;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      enabled?: boolean;
      warnMinutesBefore?: number;
      showRemainingTime?: boolean;
      useVisualSchedule?: boolean;
      preferredRoutines?: string[];
      changes?: string[];
      updatedAt?: string;
    };
    eventId?: string;
    eventType?: 'predictability.preferences.updated';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  },
  {
    tenantId?: string;
    payload?: {
      learnerId?: string;
      enabled?: boolean;
      warnMinutesBefore?: number;
      showRemainingTime?: boolean;
      useVisualSchedule?: boolean;
      preferredRoutines?: string[];
      changes?: string[];
      updatedAt?: string;
    };
    eventId?: string;
    eventType?: 'predictability.preferences.updated';
    eventVersion?: '1.0.0';
    timestamp?: string;
    source?: {
      version?: string;
      service?: string;
      instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
>;
export type PreferencesUpdated = z.infer<typeof PreferencesUpdatedSchema>;
export declare const PredictabilityEventSchema: z.ZodDiscriminatedUnion<
  'eventType',
  [
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.session_plan.created'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            planId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Structure type used for the session */
            structureType: z.ZodEnum<['default', 'minimal', 'high_support', 'custom']>;
            /** Number of items in the session outline */
            itemCount: z.ZodNumber;
            /** Estimated total session duration in minutes */
            estimatedMinutes: z.ZodNumber;
            /** Whether session includes welcome segment */
            hasWelcome: z.ZodBoolean;
            /** Whether session includes check-in segment */
            hasCheckin: z.ZodBoolean;
            /** Whether session includes goodbye segment */
            hasGoodbye: z.ZodBoolean;
            /** Number of activities in the session */
            activityCount: z.ZodNumber;
            /** Number of breaks in the session */
            breakCount: z.ZodNumber;
            /** When the plan was created */
            createdAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            createdAt?: string;
            planId?: string;
            structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
            itemCount?: number;
            estimatedMinutes?: number;
            hasWelcome?: boolean;
            hasCheckin?: boolean;
            hasGoodbye?: boolean;
            activityCount?: number;
            breakCount?: number;
          },
          {
            learnerId?: string;
            sessionId?: string;
            createdAt?: string;
            planId?: string;
            structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
            itemCount?: number;
            estimatedMinutes?: number;
            hasWelcome?: boolean;
            hasCheckin?: boolean;
            hasGoodbye?: boolean;
            activityCount?: number;
            breakCount?: number;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          createdAt?: string;
          planId?: string;
          structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
          itemCount?: number;
          estimatedMinutes?: number;
          hasWelcome?: boolean;
          hasCheckin?: boolean;
          hasGoodbye?: boolean;
          activityCount?: number;
          breakCount?: number;
        };
        eventId?: string;
        eventType?: 'predictability.session_plan.created';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          createdAt?: string;
          planId?: string;
          structureType?: 'default' | 'custom' | 'minimal' | 'high_support';
          itemCount?: number;
          estimatedMinutes?: number;
          hasWelcome?: boolean;
          hasCheckin?: boolean;
          hasGoodbye?: boolean;
          activityCount?: number;
          breakCount?: number;
        };
        eventId?: string;
        eventType?: 'predictability.session_plan.created';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.progress.updated'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            planId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** ID of the current item being worked on */
            currentItemId: z.ZodString;
            /** Current phase of the item */
            currentPhase: z.ZodString;
            /** Number of items completed */
            completedItems: z.ZodNumber;
            /** Total items in the session */
            totalItems: z.ZodNumber;
            /** Progress percentage (0-100) */
            progressPercent: z.ZodNumber;
            /** Estimated remaining minutes */
            remainingMinutes: z.ZodNumber;
            /** When the progress was updated */
            timestamp: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            planId?: string;
            currentItemId?: string;
            currentPhase?: string;
            completedItems?: number;
            totalItems?: number;
            progressPercent?: number;
            remainingMinutes?: number;
          },
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            planId?: string;
            currentItemId?: string;
            currentPhase?: string;
            completedItems?: number;
            totalItems?: number;
            progressPercent?: number;
            remainingMinutes?: number;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          timestamp?: string;
          sessionId?: string;
          planId?: string;
          currentItemId?: string;
          currentPhase?: string;
          completedItems?: number;
          totalItems?: number;
          progressPercent?: number;
          remainingMinutes?: number;
        };
        eventId?: string;
        eventType?: 'predictability.progress.updated';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          timestamp?: string;
          sessionId?: string;
          planId?: string;
          currentItemId?: string;
          currentPhase?: string;
          completedItems?: number;
          totalItems?: number;
          progressPercent?: number;
          remainingMinutes?: number;
        };
        eventId?: string;
        eventType?: 'predictability.progress.updated';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.change.requested'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            planId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Type of change requested */
            changeType: z.ZodEnum<['add', 'remove', 'reorder', 'skip', 'extend']>;
            /** Reason for the change */
            reason: z.ZodString;
            /** Severity of the change */
            severity: z.ZodEnum<['low', 'medium', 'high']>;
            /** Explanation provided to learner */
            explanation: z.ZodObject<
              {
                severity: z.ZodEnum<['low', 'medium', 'high']>;
                title: z.ZodString;
                message: z.ZodString;
                iconType: z.ZodOptional<z.ZodString>;
              },
              'strip',
              z.ZodTypeAny,
              {
                message?: string;
                title?: string;
                severity?: 'low' | 'medium' | 'high';
                iconType?: string;
              },
              {
                message?: string;
                title?: string;
                severity?: 'low' | 'medium' | 'high';
                iconType?: string;
              }
            >;
            /** Whether the change requires learner/guardian approval */
            requiresApproval: z.ZodBoolean;
            /** Approval status if requires approval */
            approvalStatus: z.ZodOptional<z.ZodEnum<['pending', 'approved', 'declined']>>;
            /** When the change was requested */
            timestamp: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            reason?: string;
            timestamp?: string;
            sessionId?: string;
            planId?: string;
            changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
            severity?: 'low' | 'medium' | 'high';
            explanation?: {
              message?: string;
              title?: string;
              severity?: 'low' | 'medium' | 'high';
              iconType?: string;
            };
            requiresApproval?: boolean;
            approvalStatus?: 'pending' | 'approved' | 'declined';
          },
          {
            learnerId?: string;
            reason?: string;
            timestamp?: string;
            sessionId?: string;
            planId?: string;
            changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
            severity?: 'low' | 'medium' | 'high';
            explanation?: {
              message?: string;
              title?: string;
              severity?: 'low' | 'medium' | 'high';
              iconType?: string;
            };
            requiresApproval?: boolean;
            approvalStatus?: 'pending' | 'approved' | 'declined';
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          reason?: string;
          timestamp?: string;
          sessionId?: string;
          planId?: string;
          changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
          severity?: 'low' | 'medium' | 'high';
          explanation?: {
            message?: string;
            title?: string;
            severity?: 'low' | 'medium' | 'high';
            iconType?: string;
          };
          requiresApproval?: boolean;
          approvalStatus?: 'pending' | 'approved' | 'declined';
        };
        eventId?: string;
        eventType?: 'predictability.change.requested';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          reason?: string;
          timestamp?: string;
          sessionId?: string;
          planId?: string;
          changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
          severity?: 'low' | 'medium' | 'high';
          explanation?: {
            message?: string;
            title?: string;
            severity?: 'low' | 'medium' | 'high';
            iconType?: string;
          };
          requiresApproval?: boolean;
          approvalStatus?: 'pending' | 'approved' | 'declined';
        };
        eventId?: string;
        eventType?: 'predictability.change.requested';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.change.applied'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            planId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Unique identifier for the change */
            changeId: z.ZodString;
            /** Type of change applied */
            changeType: z.ZodEnum<['add', 'remove', 'reorder', 'skip', 'extend']>;
            /** Whether the change was explicitly approved */
            wasApproved: z.ZodBoolean;
            /** When the change was applied */
            appliedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            planId?: string;
            changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
            changeId?: string;
            wasApproved?: boolean;
            appliedAt?: string;
          },
          {
            learnerId?: string;
            sessionId?: string;
            planId?: string;
            changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
            changeId?: string;
            wasApproved?: boolean;
            appliedAt?: string;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          planId?: string;
          changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
          changeId?: string;
          wasApproved?: boolean;
          appliedAt?: string;
        };
        eventId?: string;
        eventType?: 'predictability.change.applied';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          planId?: string;
          changeType?: 'remove' | 'add' | 'reorder' | 'skip' | 'extend';
          changeId?: string;
          wasApproved?: boolean;
          appliedAt?: string;
        };
        eventId?: string;
        eventType?: 'predictability.change.applied';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.anxiety.reported'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Severity level of reported anxiety */
            level: z.ZodEnum<['mild', 'moderate', 'severe']>;
            /** Category of trigger if identified */
            triggerCategory: z.ZodOptional<z.ZodString>;
            /** Specific trigger ID if identified */
            triggerId: z.ZodOptional<z.ZodString>;
            /** Support actions taken in response */
            supportActions: z.ZodArray<z.ZodString, 'many'>;
            /** Coping strategy used if any */
            copingStrategyUsed: z.ZodOptional<z.ZodString>;
            /** Time in seconds until learner calmed down (if tracked) */
            calmedDownAfterSeconds: z.ZodOptional<z.ZodNumber>;
            /** When the anxiety was reported */
            reportedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            level?: 'moderate' | 'mild' | 'severe';
            triggerCategory?: string;
            triggerId?: string;
            supportActions?: string[];
            copingStrategyUsed?: string;
            calmedDownAfterSeconds?: number;
            reportedAt?: string;
          },
          {
            learnerId?: string;
            sessionId?: string;
            level?: 'moderate' | 'mild' | 'severe';
            triggerCategory?: string;
            triggerId?: string;
            supportActions?: string[];
            copingStrategyUsed?: string;
            calmedDownAfterSeconds?: number;
            reportedAt?: string;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          level?: 'moderate' | 'mild' | 'severe';
          triggerCategory?: string;
          triggerId?: string;
          supportActions?: string[];
          copingStrategyUsed?: string;
          calmedDownAfterSeconds?: number;
          reportedAt?: string;
        };
        eventId?: string;
        eventType?: 'predictability.anxiety.reported';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          level?: 'moderate' | 'mild' | 'severe';
          triggerCategory?: string;
          triggerId?: string;
          supportActions?: string[];
          copingStrategyUsed?: string;
          calmedDownAfterSeconds?: number;
          reportedAt?: string;
        };
        eventId?: string;
        eventType?: 'predictability.anxiety.reported';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.routine.started'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Unique identifier for the routine instance */
            routineId: z.ZodString;
            /** Type of routine (e.g., 'welcome', 'transition', 'calming') */
            routineType: z.ZodString;
            /** Total steps in the routine */
            totalSteps: z.ZodNumber;
            /** Estimated duration in seconds */
            estimatedSeconds: z.ZodNumber;
            /** Whether this is a custom learner routine */
            isCustom: z.ZodBoolean;
            /** When the routine started */
            startedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            startedAt?: string;
            routineId?: string;
            routineType?: string;
            totalSteps?: number;
            estimatedSeconds?: number;
            isCustom?: boolean;
          },
          {
            learnerId?: string;
            sessionId?: string;
            startedAt?: string;
            routineId?: string;
            routineType?: string;
            totalSteps?: number;
            estimatedSeconds?: number;
            isCustom?: boolean;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          startedAt?: string;
          routineId?: string;
          routineType?: string;
          totalSteps?: number;
          estimatedSeconds?: number;
          isCustom?: boolean;
        };
        eventId?: string;
        eventType?: 'predictability.routine.started';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          startedAt?: string;
          routineId?: string;
          routineType?: string;
          totalSteps?: number;
          estimatedSeconds?: number;
          isCustom?: boolean;
        };
        eventId?: string;
        eventType?: 'predictability.routine.started';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.routine.step_completed'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            routineId: z.ZodString;
            routineType: z.ZodString;
            /** Index of the step (0-based) */
            stepIndex: z.ZodNumber;
            /** Type of step (e.g., 'breathing', 'visual_cue', 'countdown') */
            stepType: z.ZodString;
            /** Whether the step was skipped */
            wasSkipped: z.ZodBoolean;
            /** Actual duration of the step in seconds */
            durationSeconds: z.ZodNumber;
            /** When the step completed */
            timestamp: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            durationSeconds?: number;
            stepIndex?: number;
            stepType?: string;
            routineId?: string;
            routineType?: string;
            wasSkipped?: boolean;
          },
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            durationSeconds?: number;
            stepIndex?: number;
            stepType?: string;
            routineId?: string;
            routineType?: string;
            wasSkipped?: boolean;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          timestamp?: string;
          sessionId?: string;
          durationSeconds?: number;
          stepIndex?: number;
          stepType?: string;
          routineId?: string;
          routineType?: string;
          wasSkipped?: boolean;
        };
        eventId?: string;
        eventType?: 'predictability.routine.step_completed';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          timestamp?: string;
          sessionId?: string;
          durationSeconds?: number;
          stepIndex?: number;
          stepType?: string;
          routineId?: string;
          routineType?: string;
          wasSkipped?: boolean;
        };
        eventId?: string;
        eventType?: 'predictability.routine.step_completed';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.routine.completed'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            routineId: z.ZodString;
            routineType: z.ZodString;
            /** Outcome of the routine */
            outcome: z.ZodEnum<['completed', 'partial', 'skipped', 'interrupted']>;
            /** Number of steps completed */
            stepsCompleted: z.ZodNumber;
            /** Total steps in the routine */
            stepsTotal: z.ZodNumber;
            /** Actual duration in seconds */
            actualDurationSeconds: z.ZodNumber;
            /** Planned duration in seconds */
            plannedDurationSeconds: z.ZodNumber;
            /** When the routine completed */
            completedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
            completedAt?: string;
            routineId?: string;
            routineType?: string;
            stepsCompleted?: number;
            stepsTotal?: number;
            actualDurationSeconds?: number;
            plannedDurationSeconds?: number;
          },
          {
            learnerId?: string;
            sessionId?: string;
            outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
            completedAt?: string;
            routineId?: string;
            routineType?: string;
            stepsCompleted?: number;
            stepsTotal?: number;
            actualDurationSeconds?: number;
            plannedDurationSeconds?: number;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
          completedAt?: string;
          routineId?: string;
          routineType?: string;
          stepsCompleted?: number;
          stepsTotal?: number;
          actualDurationSeconds?: number;
          plannedDurationSeconds?: number;
        };
        eventId?: string;
        eventType?: 'predictability.routine.completed';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          sessionId?: string;
          outcome?: 'completed' | 'skipped' | 'partial' | 'interrupted';
          completedAt?: string;
          routineId?: string;
          routineType?: string;
          stepsCompleted?: number;
          stepsTotal?: number;
          actualDurationSeconds?: number;
          plannedDurationSeconds?: number;
        };
        eventId?: string;
        eventType?: 'predictability.routine.completed';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
    z.ZodObject<
      {
        eventId: z.ZodString;
        tenantId: z.ZodString;
        timestamp: z.ZodString;
        source: z.ZodObject<
          {
            service: z.ZodString;
            version: z.ZodString;
            instanceId: z.ZodOptional<z.ZodString>;
          },
          'strip',
          z.ZodTypeAny,
          {
            version?: string;
            service?: string;
            instanceId?: string;
          },
          {
            version?: string;
            service?: string;
            instanceId?: string;
          }
        >;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
      } & {
        eventType: z.ZodLiteral<'predictability.preferences.updated'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            learnerId: z.ZodString;
            /** Whether predictability features are enabled */
            enabled: z.ZodBoolean;
            /** Minutes before session end to warn */
            warnMinutesBefore: z.ZodNumber;
            /** Whether to show remaining time */
            showRemainingTime: z.ZodBoolean;
            /** Whether to use visual schedule */
            useVisualSchedule: z.ZodBoolean;
            /** Preferred routine types */
            preferredRoutines: z.ZodArray<z.ZodString, 'many'>;
            /** List of changed fields */
            changes: z.ZodArray<z.ZodString, 'many'>;
            /** When the preferences were updated */
            updatedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            enabled?: boolean;
            warnMinutesBefore?: number;
            showRemainingTime?: boolean;
            useVisualSchedule?: boolean;
            preferredRoutines?: string[];
            changes?: string[];
            updatedAt?: string;
          },
          {
            learnerId?: string;
            enabled?: boolean;
            warnMinutesBefore?: number;
            showRemainingTime?: boolean;
            useVisualSchedule?: boolean;
            preferredRoutines?: string[];
            changes?: string[];
            updatedAt?: string;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          enabled?: boolean;
          warnMinutesBefore?: number;
          showRemainingTime?: boolean;
          useVisualSchedule?: boolean;
          preferredRoutines?: string[];
          changes?: string[];
          updatedAt?: string;
        };
        eventId?: string;
        eventType?: 'predictability.preferences.updated';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      },
      {
        tenantId?: string;
        payload?: {
          learnerId?: string;
          enabled?: boolean;
          warnMinutesBefore?: number;
          showRemainingTime?: boolean;
          useVisualSchedule?: boolean;
          preferredRoutines?: string[];
          changes?: string[];
          updatedAt?: string;
        };
        eventId?: string;
        eventType?: 'predictability.preferences.updated';
        eventVersion?: '1.0.0';
        timestamp?: string;
        source?: {
          version?: string;
          service?: string;
          instanceId?: string;
        };
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, unknown>;
      }
    >,
  ]
>;
export type PredictabilityEvent = z.infer<typeof PredictabilityEventSchema>;
//# sourceMappingURL=predictability.d.ts.map
