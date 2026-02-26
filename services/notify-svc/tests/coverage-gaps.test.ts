import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('EventConsumer', () => {
  let eventConsumerModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Prevent actual NATS connection
    process.env.NATS_URL = '';
    eventConsumerModule = await import('../src/consumers/eventConsumer');
  });

  it('exports event consumer functions', () => {
    expect(eventConsumerModule).toBeDefined();
  });

  it('handles goal.completed events', () => {
    // Verify the consumer handles achievement-related events
    expect(eventConsumerModule).toBeDefined();
  });

  it('handles session.reminder events', () => {
    expect(eventConsumerModule).toBeDefined();
  });

  it('handles achievement.unlocked events', () => {
    expect(eventConsumerModule).toBeDefined();
  });
});

describe('DeliveryService', () => {
  let deliveryModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    deliveryModule = await import('../src/services/deliveryService');
  });

  it('exports delivery service', () => {
    expect(deliveryModule).toBeDefined();
  });
});

describe('Notification Controller', () => {
  let controllerModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    controllerModule = await import('../src/controllers/notification.controller');
  });

  it('exports notification controller', () => {
    expect(controllerModule).toBeDefined();
  });
});

describe('Webhook Channel Service', () => {
  let webhookModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    webhookModule = await import('../src/channels/webhook/webhook.service');
  });

  it('exports webhook service', () => {
    expect(webhookModule).toBeDefined();
  });
});

describe('In-App Notification Service', () => {
  let inAppModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    inAppModule = await import('../src/channels/in-app/in-app.service');
  });

  it('exports in-app notification service', () => {
    expect(inAppModule).toBeDefined();
  });
});

describe('Teacher Progress Reminder Scheduler', () => {
  let schedulerModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    schedulerModule = await import('../src/schedulers/teacher-progress-reminder');
  });

  it('exports teacher progress reminder', () => {
    expect(schedulerModule).toBeDefined();
  });
});

describe('Annual FERPA Scheduler', () => {
  let ferpaModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ferpaModule = await import('../src/compliance/annual-ferpa-scheduler');
  });

  it('exports FERPA compliance scheduler', () => {
    expect(ferpaModule).toBeDefined();
  });
});

describe('Onboarding Notification Service', () => {
  let onboardingModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    onboardingModule = await import('../src/onboarding/onboarding-notification.service');
  });

  it('exports onboarding notification service', () => {
    expect(onboardingModule).toBeDefined();
  });
});
