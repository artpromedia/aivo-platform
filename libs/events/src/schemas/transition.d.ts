import { z } from 'zod';
export declare const TRANSITION_EVENT_TYPES: readonly [
  'transition.started',
  'transition.warning',
  'transition.acknowledged',
  'transition.routine.step',
  'transition.completed',
];
/**
 * Emitted when a transition between activities is scheduled to begin.
 */
export declare const TransitionStartedSchema: z.ZodObject<
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
    eventType: z.ZodLiteral<'transition.started'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        transitionId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Activity being transitioned from (null for session start) */
        fromActivity: z.ZodOptional<
          z.ZodObject<
            {
              id: z.ZodString;
              title: z.ZodString;
              type: z.ZodString;
            },
            'strip',
            z.ZodTypeAny,
            {
              type?: string;
              id?: string;
              title?: string;
            },
            {
              type?: string;
              id?: string;
              title?: string;
            }
          >
        >;
        /** Activity being transitioned to */
        toActivity: z.ZodObject<
          {
            id: z.ZodString;
            title: z.ZodString;
            type: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            type?: string;
            id?: string;
            title?: string;
          },
          {
            type?: string;
            id?: string;
            title?: string;
          }
        >;
        /** Transition plan configuration */
        plan: z.ZodObject<
          {
            totalDuration: z.ZodNumber;
            warningIntervals: z.ZodArray<z.ZodNumber, 'many'>;
            visualStyle: z.ZodString;
            colorScheme: z.ZodString;
            enableAudio: z.ZodBoolean;
            enableHaptic: z.ZodBoolean;
            hasRoutine: z.ZodBoolean;
            hasFirstThenBoard: z.ZodBoolean;
          },
          'strip',
          z.ZodTypeAny,
          {
            totalDuration?: number;
            warningIntervals?: number[];
            visualStyle?: string;
            colorScheme?: string;
            enableAudio?: boolean;
            enableHaptic?: boolean;
            hasRoutine?: boolean;
            hasFirstThenBoard?: boolean;
          },
          {
            totalDuration?: number;
            warningIntervals?: number[];
            visualStyle?: string;
            colorScheme?: string;
            enableAudio?: boolean;
            enableHaptic?: boolean;
            hasRoutine?: boolean;
            hasFirstThenBoard?: boolean;
          }
        >;
        /** When the transition was scheduled */
        scheduledAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        transitionId?: string;
        fromActivity?: {
          type?: string;
          id?: string;
          title?: string;
        };
        toActivity?: {
          type?: string;
          id?: string;
          title?: string;
        };
        plan?: {
          totalDuration?: number;
          warningIntervals?: number[];
          visualStyle?: string;
          colorScheme?: string;
          enableAudio?: boolean;
          enableHaptic?: boolean;
          hasRoutine?: boolean;
          hasFirstThenBoard?: boolean;
        };
        scheduledAt?: string;
      },
      {
        learnerId?: string;
        sessionId?: string;
        transitionId?: string;
        fromActivity?: {
          type?: string;
          id?: string;
          title?: string;
        };
        toActivity?: {
          type?: string;
          id?: string;
          title?: string;
        };
        plan?: {
          totalDuration?: number;
          warningIntervals?: number[];
          visualStyle?: string;
          colorScheme?: string;
          enableAudio?: boolean;
          enableHaptic?: boolean;
          hasRoutine?: boolean;
          hasFirstThenBoard?: boolean;
        };
        scheduledAt?: string;
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
      transitionId?: string;
      fromActivity?: {
        type?: string;
        id?: string;
        title?: string;
      };
      toActivity?: {
        type?: string;
        id?: string;
        title?: string;
      };
      plan?: {
        totalDuration?: number;
        warningIntervals?: number[];
        visualStyle?: string;
        colorScheme?: string;
        enableAudio?: boolean;
        enableHaptic?: boolean;
        hasRoutine?: boolean;
        hasFirstThenBoard?: boolean;
      };
      scheduledAt?: string;
    };
    eventId?: string;
    eventType?: 'transition.started';
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
      transitionId?: string;
      fromActivity?: {
        type?: string;
        id?: string;
        title?: string;
      };
      toActivity?: {
        type?: string;
        id?: string;
        title?: string;
      };
      plan?: {
        totalDuration?: number;
        warningIntervals?: number[];
        visualStyle?: string;
        colorScheme?: string;
        enableAudio?: boolean;
        enableHaptic?: boolean;
        hasRoutine?: boolean;
        hasFirstThenBoard?: boolean;
      };
      scheduledAt?: string;
    };
    eventId?: string;
    eventType?: 'transition.started';
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
export type TransitionStarted = z.infer<typeof TransitionStartedSchema>;
/**
 * Emitted when a warning is delivered to the learner before transition.
 */
export declare const TransitionWarningSchema: z.ZodObject<
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
    eventType: z.ZodLiteral<'transition.warning'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        transitionId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Which warning number this is (1st, 2nd, etc.) */
        warningNumber: z.ZodNumber;
        /** Seconds remaining until transition */
        secondsRemaining: z.ZodNumber;
        /** Whether a visual timer is being shown */
        isTimerVisible: z.ZodBoolean;
        /** Visual warning style */
        visualStyle: z.ZodEnum<['subtle', 'moderate', 'prominent']>;
        /** Audio warning type if applicable */
        audioType: z.ZodNullable<z.ZodEnum<['audio', 'spoken']>>;
        /** Haptic pattern if applicable */
        hapticPattern: z.ZodNullable<z.ZodEnum<['gentle', 'moderate', 'strong']>>;
        /** When the warning was delivered */
        timestamp: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        transitionId?: string;
        visualStyle?: 'subtle' | 'moderate' | 'prominent';
        warningNumber?: number;
        secondsRemaining?: number;
        isTimerVisible?: boolean;
        audioType?: 'audio' | 'spoken';
        hapticPattern?: 'moderate' | 'gentle' | 'strong';
      },
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        transitionId?: string;
        visualStyle?: 'subtle' | 'moderate' | 'prominent';
        warningNumber?: number;
        secondsRemaining?: number;
        isTimerVisible?: boolean;
        audioType?: 'audio' | 'spoken';
        hapticPattern?: 'moderate' | 'gentle' | 'strong';
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
      transitionId?: string;
      visualStyle?: 'subtle' | 'moderate' | 'prominent';
      warningNumber?: number;
      secondsRemaining?: number;
      isTimerVisible?: boolean;
      audioType?: 'audio' | 'spoken';
      hapticPattern?: 'moderate' | 'gentle' | 'strong';
    };
    eventId?: string;
    eventType?: 'transition.warning';
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
      transitionId?: string;
      visualStyle?: 'subtle' | 'moderate' | 'prominent';
      warningNumber?: number;
      secondsRemaining?: number;
      isTimerVisible?: boolean;
      audioType?: 'audio' | 'spoken';
      hapticPattern?: 'moderate' | 'gentle' | 'strong';
    };
    eventId?: string;
    eventType?: 'transition.warning';
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
export type TransitionWarning = z.infer<typeof TransitionWarningSchema>;
/**
 * Emitted when a learner acknowledges an upcoming transition.
 */
export declare const TransitionAcknowledgedSchema: z.ZodObject<
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
    eventType: z.ZodLiteral<'transition.acknowledged'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        transitionId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** When the learner acknowledged */
        acknowledgedAt: z.ZodString;
        /** Seconds before transition start when acknowledged */
        secondsBeforeStart: z.ZodNumber;
        /** Learner's readiness state */
        readyState: z.ZodEnum<['ready', 'needs_more_time', 'skipped']>;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        transitionId?: string;
        acknowledgedAt?: string;
        secondsBeforeStart?: number;
        readyState?: 'ready' | 'skipped' | 'needs_more_time';
      },
      {
        learnerId?: string;
        sessionId?: string;
        transitionId?: string;
        acknowledgedAt?: string;
        secondsBeforeStart?: number;
        readyState?: 'ready' | 'skipped' | 'needs_more_time';
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
      transitionId?: string;
      acknowledgedAt?: string;
      secondsBeforeStart?: number;
      readyState?: 'ready' | 'skipped' | 'needs_more_time';
    };
    eventId?: string;
    eventType?: 'transition.acknowledged';
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
      transitionId?: string;
      acknowledgedAt?: string;
      secondsBeforeStart?: number;
      readyState?: 'ready' | 'skipped' | 'needs_more_time';
    };
    eventId?: string;
    eventType?: 'transition.acknowledged';
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
export type TransitionAcknowledged = z.infer<typeof TransitionAcknowledgedSchema>;
/**
 * Emitted when a routine step is completed or skipped during transition.
 */
export declare const TransitionRoutineStepSchema: z.ZodObject<
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
    eventType: z.ZodLiteral<'transition.routine.step'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        transitionId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** Index of the step in the routine */
        stepIndex: z.ZodNumber;
        /** Type of routine step (e.g., 'breathing', 'countdown', 'visual_cue') */
        stepType: z.ZodString;
        /** Expected duration in seconds */
        stepDuration: z.ZodNumber;
        /** Whether the step was completed */
        completed: z.ZodBoolean;
        /** Whether the step was skipped */
        skipped: z.ZodBoolean;
        /** When the step event occurred */
        timestamp: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        completed?: boolean;
        skipped?: boolean;
        transitionId?: string;
        stepIndex?: number;
        stepType?: string;
        stepDuration?: number;
      },
      {
        learnerId?: string;
        timestamp?: string;
        sessionId?: string;
        completed?: boolean;
        skipped?: boolean;
        transitionId?: string;
        stepIndex?: number;
        stepType?: string;
        stepDuration?: number;
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
      completed?: boolean;
      skipped?: boolean;
      transitionId?: string;
      stepIndex?: number;
      stepType?: string;
      stepDuration?: number;
    };
    eventId?: string;
    eventType?: 'transition.routine.step';
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
      completed?: boolean;
      skipped?: boolean;
      transitionId?: string;
      stepIndex?: number;
      stepType?: string;
      stepDuration?: number;
    };
    eventId?: string;
    eventType?: 'transition.routine.step';
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
export type TransitionRoutineStep = z.infer<typeof TransitionRoutineStepSchema>;
/**
 * Emitted when a transition is completed and learner moved to next activity.
 */
export declare const TransitionCompletedSchema: z.ZodObject<
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
    eventType: z.ZodLiteral<'transition.completed'>;
    eventVersion: z.ZodLiteral<'1.0.0'>;
    payload: z.ZodObject<
      {
        transitionId: z.ZodString;
        sessionId: z.ZodString;
        learnerId: z.ZodString;
        /** ID of the activity transitioned from */
        fromActivityId: z.ZodString;
        /** ID of the activity transitioned to */
        toActivityId: z.ZodString;
        /** Transition outcome classification */
        outcome: z.ZodEnum<['smooth', 'successful', 'struggled', 'refused', 'timed_out']>;
        /** Originally planned duration in seconds */
        plannedDuration: z.ZodNumber;
        /** Actual duration in seconds */
        actualDuration: z.ZodNumber;
        /** Number of warnings delivered */
        warningsDelivered: z.ZodNumber;
        /** Number of warnings acknowledged by learner */
        warningsAcknowledged: z.ZodNumber;
        /** Number of routine steps completed */
        routineStepsCompleted: z.ZodNumber;
        /** Total routine steps in the plan */
        routineStepsTotal: z.ZodNumber;
        /** Number of learner interactions during transition */
        learnerInteractions: z.ZodNumber;
        /** When the transition completed */
        completedAt: z.ZodString;
      },
      'strip',
      z.ZodTypeAny,
      {
        learnerId?: string;
        sessionId?: string;
        outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
        completedAt?: string;
        transitionId?: string;
        fromActivityId?: string;
        toActivityId?: string;
        plannedDuration?: number;
        actualDuration?: number;
        warningsDelivered?: number;
        warningsAcknowledged?: number;
        routineStepsCompleted?: number;
        routineStepsTotal?: number;
        learnerInteractions?: number;
      },
      {
        learnerId?: string;
        sessionId?: string;
        outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
        completedAt?: string;
        transitionId?: string;
        fromActivityId?: string;
        toActivityId?: string;
        plannedDuration?: number;
        actualDuration?: number;
        warningsDelivered?: number;
        warningsAcknowledged?: number;
        routineStepsCompleted?: number;
        routineStepsTotal?: number;
        learnerInteractions?: number;
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
      outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
      completedAt?: string;
      transitionId?: string;
      fromActivityId?: string;
      toActivityId?: string;
      plannedDuration?: number;
      actualDuration?: number;
      warningsDelivered?: number;
      warningsAcknowledged?: number;
      routineStepsCompleted?: number;
      routineStepsTotal?: number;
      learnerInteractions?: number;
    };
    eventId?: string;
    eventType?: 'transition.completed';
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
      outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
      completedAt?: string;
      transitionId?: string;
      fromActivityId?: string;
      toActivityId?: string;
      plannedDuration?: number;
      actualDuration?: number;
      warningsDelivered?: number;
      warningsAcknowledged?: number;
      routineStepsCompleted?: number;
      routineStepsTotal?: number;
      learnerInteractions?: number;
    };
    eventId?: string;
    eventType?: 'transition.completed';
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
export type TransitionCompleted = z.infer<typeof TransitionCompletedSchema>;
export declare const TransitionEventSchema: z.ZodDiscriminatedUnion<
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
        eventType: z.ZodLiteral<'transition.started'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            transitionId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Activity being transitioned from (null for session start) */
            fromActivity: z.ZodOptional<
              z.ZodObject<
                {
                  id: z.ZodString;
                  title: z.ZodString;
                  type: z.ZodString;
                },
                'strip',
                z.ZodTypeAny,
                {
                  type?: string;
                  id?: string;
                  title?: string;
                },
                {
                  type?: string;
                  id?: string;
                  title?: string;
                }
              >
            >;
            /** Activity being transitioned to */
            toActivity: z.ZodObject<
              {
                id: z.ZodString;
                title: z.ZodString;
                type: z.ZodString;
              },
              'strip',
              z.ZodTypeAny,
              {
                type?: string;
                id?: string;
                title?: string;
              },
              {
                type?: string;
                id?: string;
                title?: string;
              }
            >;
            /** Transition plan configuration */
            plan: z.ZodObject<
              {
                totalDuration: z.ZodNumber;
                warningIntervals: z.ZodArray<z.ZodNumber, 'many'>;
                visualStyle: z.ZodString;
                colorScheme: z.ZodString;
                enableAudio: z.ZodBoolean;
                enableHaptic: z.ZodBoolean;
                hasRoutine: z.ZodBoolean;
                hasFirstThenBoard: z.ZodBoolean;
              },
              'strip',
              z.ZodTypeAny,
              {
                totalDuration?: number;
                warningIntervals?: number[];
                visualStyle?: string;
                colorScheme?: string;
                enableAudio?: boolean;
                enableHaptic?: boolean;
                hasRoutine?: boolean;
                hasFirstThenBoard?: boolean;
              },
              {
                totalDuration?: number;
                warningIntervals?: number[];
                visualStyle?: string;
                colorScheme?: string;
                enableAudio?: boolean;
                enableHaptic?: boolean;
                hasRoutine?: boolean;
                hasFirstThenBoard?: boolean;
              }
            >;
            /** When the transition was scheduled */
            scheduledAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            transitionId?: string;
            fromActivity?: {
              type?: string;
              id?: string;
              title?: string;
            };
            toActivity?: {
              type?: string;
              id?: string;
              title?: string;
            };
            plan?: {
              totalDuration?: number;
              warningIntervals?: number[];
              visualStyle?: string;
              colorScheme?: string;
              enableAudio?: boolean;
              enableHaptic?: boolean;
              hasRoutine?: boolean;
              hasFirstThenBoard?: boolean;
            };
            scheduledAt?: string;
          },
          {
            learnerId?: string;
            sessionId?: string;
            transitionId?: string;
            fromActivity?: {
              type?: string;
              id?: string;
              title?: string;
            };
            toActivity?: {
              type?: string;
              id?: string;
              title?: string;
            };
            plan?: {
              totalDuration?: number;
              warningIntervals?: number[];
              visualStyle?: string;
              colorScheme?: string;
              enableAudio?: boolean;
              enableHaptic?: boolean;
              hasRoutine?: boolean;
              hasFirstThenBoard?: boolean;
            };
            scheduledAt?: string;
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
          transitionId?: string;
          fromActivity?: {
            type?: string;
            id?: string;
            title?: string;
          };
          toActivity?: {
            type?: string;
            id?: string;
            title?: string;
          };
          plan?: {
            totalDuration?: number;
            warningIntervals?: number[];
            visualStyle?: string;
            colorScheme?: string;
            enableAudio?: boolean;
            enableHaptic?: boolean;
            hasRoutine?: boolean;
            hasFirstThenBoard?: boolean;
          };
          scheduledAt?: string;
        };
        eventId?: string;
        eventType?: 'transition.started';
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
          transitionId?: string;
          fromActivity?: {
            type?: string;
            id?: string;
            title?: string;
          };
          toActivity?: {
            type?: string;
            id?: string;
            title?: string;
          };
          plan?: {
            totalDuration?: number;
            warningIntervals?: number[];
            visualStyle?: string;
            colorScheme?: string;
            enableAudio?: boolean;
            enableHaptic?: boolean;
            hasRoutine?: boolean;
            hasFirstThenBoard?: boolean;
          };
          scheduledAt?: string;
        };
        eventId?: string;
        eventType?: 'transition.started';
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
        eventType: z.ZodLiteral<'transition.warning'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            transitionId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Which warning number this is (1st, 2nd, etc.) */
            warningNumber: z.ZodNumber;
            /** Seconds remaining until transition */
            secondsRemaining: z.ZodNumber;
            /** Whether a visual timer is being shown */
            isTimerVisible: z.ZodBoolean;
            /** Visual warning style */
            visualStyle: z.ZodEnum<['subtle', 'moderate', 'prominent']>;
            /** Audio warning type if applicable */
            audioType: z.ZodNullable<z.ZodEnum<['audio', 'spoken']>>;
            /** Haptic pattern if applicable */
            hapticPattern: z.ZodNullable<z.ZodEnum<['gentle', 'moderate', 'strong']>>;
            /** When the warning was delivered */
            timestamp: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            transitionId?: string;
            visualStyle?: 'subtle' | 'moderate' | 'prominent';
            warningNumber?: number;
            secondsRemaining?: number;
            isTimerVisible?: boolean;
            audioType?: 'audio' | 'spoken';
            hapticPattern?: 'moderate' | 'gentle' | 'strong';
          },
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            transitionId?: string;
            visualStyle?: 'subtle' | 'moderate' | 'prominent';
            warningNumber?: number;
            secondsRemaining?: number;
            isTimerVisible?: boolean;
            audioType?: 'audio' | 'spoken';
            hapticPattern?: 'moderate' | 'gentle' | 'strong';
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
          transitionId?: string;
          visualStyle?: 'subtle' | 'moderate' | 'prominent';
          warningNumber?: number;
          secondsRemaining?: number;
          isTimerVisible?: boolean;
          audioType?: 'audio' | 'spoken';
          hapticPattern?: 'moderate' | 'gentle' | 'strong';
        };
        eventId?: string;
        eventType?: 'transition.warning';
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
          transitionId?: string;
          visualStyle?: 'subtle' | 'moderate' | 'prominent';
          warningNumber?: number;
          secondsRemaining?: number;
          isTimerVisible?: boolean;
          audioType?: 'audio' | 'spoken';
          hapticPattern?: 'moderate' | 'gentle' | 'strong';
        };
        eventId?: string;
        eventType?: 'transition.warning';
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
        eventType: z.ZodLiteral<'transition.acknowledged'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            transitionId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** When the learner acknowledged */
            acknowledgedAt: z.ZodString;
            /** Seconds before transition start when acknowledged */
            secondsBeforeStart: z.ZodNumber;
            /** Learner's readiness state */
            readyState: z.ZodEnum<['ready', 'needs_more_time', 'skipped']>;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            transitionId?: string;
            acknowledgedAt?: string;
            secondsBeforeStart?: number;
            readyState?: 'ready' | 'skipped' | 'needs_more_time';
          },
          {
            learnerId?: string;
            sessionId?: string;
            transitionId?: string;
            acknowledgedAt?: string;
            secondsBeforeStart?: number;
            readyState?: 'ready' | 'skipped' | 'needs_more_time';
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
          transitionId?: string;
          acknowledgedAt?: string;
          secondsBeforeStart?: number;
          readyState?: 'ready' | 'skipped' | 'needs_more_time';
        };
        eventId?: string;
        eventType?: 'transition.acknowledged';
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
          transitionId?: string;
          acknowledgedAt?: string;
          secondsBeforeStart?: number;
          readyState?: 'ready' | 'skipped' | 'needs_more_time';
        };
        eventId?: string;
        eventType?: 'transition.acknowledged';
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
        eventType: z.ZodLiteral<'transition.routine.step'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            transitionId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** Index of the step in the routine */
            stepIndex: z.ZodNumber;
            /** Type of routine step (e.g., 'breathing', 'countdown', 'visual_cue') */
            stepType: z.ZodString;
            /** Expected duration in seconds */
            stepDuration: z.ZodNumber;
            /** Whether the step was completed */
            completed: z.ZodBoolean;
            /** Whether the step was skipped */
            skipped: z.ZodBoolean;
            /** When the step event occurred */
            timestamp: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            completed?: boolean;
            skipped?: boolean;
            transitionId?: string;
            stepIndex?: number;
            stepType?: string;
            stepDuration?: number;
          },
          {
            learnerId?: string;
            timestamp?: string;
            sessionId?: string;
            completed?: boolean;
            skipped?: boolean;
            transitionId?: string;
            stepIndex?: number;
            stepType?: string;
            stepDuration?: number;
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
          completed?: boolean;
          skipped?: boolean;
          transitionId?: string;
          stepIndex?: number;
          stepType?: string;
          stepDuration?: number;
        };
        eventId?: string;
        eventType?: 'transition.routine.step';
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
          completed?: boolean;
          skipped?: boolean;
          transitionId?: string;
          stepIndex?: number;
          stepType?: string;
          stepDuration?: number;
        };
        eventId?: string;
        eventType?: 'transition.routine.step';
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
        eventType: z.ZodLiteral<'transition.completed'>;
        eventVersion: z.ZodLiteral<'1.0.0'>;
        payload: z.ZodObject<
          {
            transitionId: z.ZodString;
            sessionId: z.ZodString;
            learnerId: z.ZodString;
            /** ID of the activity transitioned from */
            fromActivityId: z.ZodString;
            /** ID of the activity transitioned to */
            toActivityId: z.ZodString;
            /** Transition outcome classification */
            outcome: z.ZodEnum<['smooth', 'successful', 'struggled', 'refused', 'timed_out']>;
            /** Originally planned duration in seconds */
            plannedDuration: z.ZodNumber;
            /** Actual duration in seconds */
            actualDuration: z.ZodNumber;
            /** Number of warnings delivered */
            warningsDelivered: z.ZodNumber;
            /** Number of warnings acknowledged by learner */
            warningsAcknowledged: z.ZodNumber;
            /** Number of routine steps completed */
            routineStepsCompleted: z.ZodNumber;
            /** Total routine steps in the plan */
            routineStepsTotal: z.ZodNumber;
            /** Number of learner interactions during transition */
            learnerInteractions: z.ZodNumber;
            /** When the transition completed */
            completedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            learnerId?: string;
            sessionId?: string;
            outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
            completedAt?: string;
            transitionId?: string;
            fromActivityId?: string;
            toActivityId?: string;
            plannedDuration?: number;
            actualDuration?: number;
            warningsDelivered?: number;
            warningsAcknowledged?: number;
            routineStepsCompleted?: number;
            routineStepsTotal?: number;
            learnerInteractions?: number;
          },
          {
            learnerId?: string;
            sessionId?: string;
            outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
            completedAt?: string;
            transitionId?: string;
            fromActivityId?: string;
            toActivityId?: string;
            plannedDuration?: number;
            actualDuration?: number;
            warningsDelivered?: number;
            warningsAcknowledged?: number;
            routineStepsCompleted?: number;
            routineStepsTotal?: number;
            learnerInteractions?: number;
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
          outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
          completedAt?: string;
          transitionId?: string;
          fromActivityId?: string;
          toActivityId?: string;
          plannedDuration?: number;
          actualDuration?: number;
          warningsDelivered?: number;
          warningsAcknowledged?: number;
          routineStepsCompleted?: number;
          routineStepsTotal?: number;
          learnerInteractions?: number;
        };
        eventId?: string;
        eventType?: 'transition.completed';
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
          outcome?: 'timed_out' | 'smooth' | 'successful' | 'struggled' | 'refused';
          completedAt?: string;
          transitionId?: string;
          fromActivityId?: string;
          toActivityId?: string;
          plannedDuration?: number;
          actualDuration?: number;
          warningsDelivered?: number;
          warningsAcknowledged?: number;
          routineStepsCompleted?: number;
          routineStepsTotal?: number;
          learnerInteractions?: number;
        };
        eventId?: string;
        eventType?: 'transition.completed';
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
export type TransitionEvent = z.infer<typeof TransitionEventSchema>;
//# sourceMappingURL=transition.d.ts.map
