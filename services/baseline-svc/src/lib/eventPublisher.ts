/**
 * Stub event publisher for Virtual Brain notifications.
 * Future: integrate with message bus (e.g., RabbitMQ, Kafka, or cloud pub/sub).
 */

export interface BaselineAcceptedEvent {
  type: 'BASELINE_ACCEPTED';
  tenantId: string;
  learnerId: string;
  profileId: string;
  attemptId: string;
  timestamp: string;
}

export async function publishBaselineAccepted(
  event: Omit<BaselineAcceptedEvent, 'type' | 'timestamp'>
): Promise<void> {
  const fullEvent: BaselineAcceptedEvent = {
    type: 'BASELINE_ACCEPTED',
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Stub: log event for now
  console.log('[EventPublisher] BASELINE_ACCEPTED event:', JSON.stringify(fullEvent));

  // Future implementation:
  // await messageBus.publish('baseline.accepted', fullEvent);
}
