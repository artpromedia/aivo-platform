import { connect, NatsConnection, JSONCodec, Subscription } from 'nats';
import { config } from '../config.js';
import { CognitiveLoadManager } from '../cognitive/cognitive-load-manager.js';
import { EventAggregator } from '../coordination/event-aggregator.js';
import { MasteryTracker } from '../learning/mastery-tracker.js';
import type { LearningEvent } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

interface IncomingEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

let natsConnection: NatsConnection | null = null;
let subscriptions: Subscription[] = [];
const jsonCodec = JSONCodec<IncomingEvent>();

// Event handlers
const cognitiveManager = new CognitiveLoadManager();
const eventAggregator = new EventAggregator(cognitiveManager);
const masteryTracker = new MasteryTracker();

// Subjects to subscribe to
const SUBSCRIBED_SUBJECTS = [
  'aivo.lesson.completed',
  'aivo.assessment.submitted',
  'aivo.assessment.graded',
  'aivo.homework.completed',
  'aivo.focus.attention_changed',
  'aivo.focus.session_started',
  'aivo.focus.session_ended',
  'aivo.learner.skill_updated',
  'aivo.learner.profile_updated',
];

/**
 * Start the event subscriber
 */
export async function startEventSubscriber(): Promise<void> {
  if (natsConnection) {
    return;
  }

  try {
    natsConnection = await connect({
      servers: config.natsUrl,
      name: 'brain-orchestrator-svc-subscriber',
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });

    console.log('Event subscriber connected to NATS');

    // Subscribe to all relevant subjects
    for (const subject of SUBSCRIBED_SUBJECTS) {
      const subscription = natsConnection.subscribe(subject);
      subscriptions.push(subscription);

      // Process messages asynchronously
      processSubscription(subscription, subject);
    }

    // Also subscribe to wildcard for brain events (for internal coordination)
    const brainSubscription = natsConnection.subscribe('aivo.brain.>');
    subscriptions.push(brainSubscription);
    processSubscription(brainSubscription, 'aivo.brain.>');
  } catch (error) {
    console.error('Failed to start event subscriber:', error);
    throw error;
  }
}

/**
 * Process messages from a subscription
 */
async function processSubscription(subscription: Subscription, subject: string): Promise<void> {
  console.log(`Subscribed to: ${subject}`);

  for await (const msg of subscription) {
    try {
      const event = jsonCodec.decode(msg.data);
      await handleEvent(event, msg.subject);
    } catch (error) {
      console.error(`Error processing message from ${msg.subject}:`, error);
    }
  }
}

/**
 * Handle an incoming event
 */
async function handleEvent(event: IncomingEvent, subject: string): Promise<void> {
  console.log(`Received event: ${event.type} from ${subject}`);

  // Convert to internal LearningEvent format
  const learningEvent: LearningEvent = {
    id: uuidv4(),
    type: event.type,
    learnerId: event.data.learnerId as string ?? '',
    tenantId: event.data.tenantId as string ?? '',
    timestamp: new Date(event.timestamp),
    data: event.data,
    source: subject,
  };

  // Process through event aggregator
  await eventAggregator.processEvent(learningEvent);

  // Handle specific event types
  switch (event.type) {
    case 'lesson.completed':
      await handleLessonCompleted(event.data);
      break;

    case 'assessment.submitted':
    case 'assessment.graded':
      await handleAssessmentEvent(event.data);
      break;

    case 'homework.completed':
      await handleHomeworkCompleted(event.data);
      break;

    case 'focus.attention_changed':
      await handleAttentionChanged(event.data);
      break;

    case 'learner.skill_updated':
      await handleSkillUpdated(event.data);
      break;

    default:
      // Event is still processed by aggregator
      break;
  }
}

/**
 * Handle lesson completed event
 */
async function handleLessonCompleted(data: Record<string, unknown>): Promise<void> {
  const learnerId = data.learnerId as string;
  const skillIds = data.skillIds as string[] ?? [];
  const score = data.score as number | undefined;

  if (!learnerId || skillIds.length === 0) return;

  // Update mastery for each skill
  for (const skillId of skillIds) {
    await masteryTracker.updateMastery(learnerId, skillId, {
      activityId: data.lessonId as string,
      skillId,
      outcome: score && score >= 70 ? 'success' : score && score >= 50 ? 'partial' : 'failure',
      score,
      timeSpent: data.timeSpent as number ?? 0,
      attemptCount: 1,
      errorTypes: [],
    });
  }
}

/**
 * Handle assessment event
 */
async function handleAssessmentEvent(data: Record<string, unknown>): Promise<void> {
  const learnerId = data.learnerId as string;
  const skillResults = data.skillResults as Record<string, number> | undefined;

  if (!learnerId || !skillResults) return;

  // Update mastery for each skill in the assessment
  for (const [skillId, score] of Object.entries(skillResults)) {
    await masteryTracker.updateMastery(learnerId, skillId, {
      activityId: data.assessmentId as string,
      skillId,
      outcome: score >= 70 ? 'success' : score >= 50 ? 'partial' : 'failure',
      score,
      timeSpent: data.timeSpent as number ?? 0,
      attemptCount: data.attemptNumber as number ?? 1,
      errorTypes: data.errorTypes as string[] ?? [],
    });
  }
}

/**
 * Handle homework completed event
 */
async function handleHomeworkCompleted(data: Record<string, unknown>): Promise<void> {
  const learnerId = data.learnerId as string;
  const skillIds = data.skillIds as string[] ?? [];
  const score = data.score as number | undefined;

  if (!learnerId || skillIds.length === 0) return;

  for (const skillId of skillIds) {
    await masteryTracker.updateMastery(learnerId, skillId, {
      activityId: data.homeworkId as string,
      skillId,
      outcome: score && score >= 70 ? 'success' : score && score >= 50 ? 'partial' : 'failure',
      score,
      timeSpent: data.timeSpent as number ?? 0,
      attemptCount: 1,
      errorTypes: [],
    });
  }
}

/**
 * Handle attention changed event from focus-svc
 */
async function handleAttentionChanged(data: Record<string, unknown>): Promise<void> {
  const learnerId = data.learnerId as string;
  const sessionId = data.sessionId as string;
  const attentionScore = data.attentionScore as number;

  if (!learnerId) return;

  // Track as interaction for cognitive load assessment
  await cognitiveManager.trackInteraction({
    id: uuidv4(),
    learnerId,
    tenantId: data.tenantId as string ?? '',
    sessionId: sessionId ?? uuidv4(),
    type: 'focus_change',
    timestamp: new Date(),
    data: {
      metadata: { attentionScore },
    },
  });
}

/**
 * Handle skill updated event from learner-model-svc
 */
async function handleSkillUpdated(data: Record<string, unknown>): Promise<void> {
  // This is primarily for event aggregation and milestone tracking
  // The actual mastery update was already done by learner-model-svc
  const learnerId = data.learnerId as string;
  const skillId = data.skillId as string;
  const previousLevel = data.previousLevel as number;
  const newLevel = data.newLevel as number;

  if (!learnerId || !skillId) return;

  // Check for milestones
  const milestones = [25, 50, 75, 90, 100];
  for (const milestone of milestones) {
    if (previousLevel < milestone && newLevel >= milestone) {
      console.log(`Mastery milestone reached: ${skillId} at ${milestone}% for learner ${learnerId}`);
      // This triggers the mastery milestone event through the aggregator
      break;
    }
  }
}

/**
 * Stop the event subscriber
 */
export async function stopEventSubscriber(): Promise<void> {
  // Unsubscribe from all
  for (const subscription of subscriptions) {
    subscription.unsubscribe();
  }
  subscriptions = [];

  // Close connection
  if (natsConnection) {
    await natsConnection.drain();
    natsConnection = null;
  }
}

/**
 * Get subscriber status
 */
export function isSubscriberActive(): boolean {
  return natsConnection !== null && !natsConnection.isClosed();
}

/**
 * Get subscription count
 */
export function getSubscriptionCount(): number {
  return subscriptions.length;
}
