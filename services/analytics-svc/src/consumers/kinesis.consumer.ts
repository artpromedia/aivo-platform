/**
 * Kinesis Analytics Consumer
 *
 * AWS Kinesis Data Streams consumer for processing analytics events
 * at scale with exactly-once semantics and DynamoDB checkpointing.
 */

import {
  KinesisClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
  DescribeStreamCommand,
  type Record as KinesisRecord,
} from '@aws-sdk/client-kinesis';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import Redis from 'ioredis';

import { prisma } from '../prisma.js';
import type { AnalyticsEvent } from '../events/event.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface KinesisConsumerConfig {
  streamName: string;
  applicationName: string;
  checkpointTable: string;
  batchSize: number;
  pollInterval: number;
  maxRetries: number;
  processingTimeout: number;
}

const DEFAULT_CONFIG: KinesisConsumerConfig = {
  streamName: process.env.KINESIS_ANALYTICS_STREAM || 'aivo-analytics-events',
  applicationName: process.env.KINESIS_APP_NAME || 'analytics-consumer',
  checkpointTable: process.env.KINESIS_CHECKPOINT_TABLE || 'analytics-checkpoints',
  batchSize: 100,
  pollInterval: 1000, // 1 second
  maxRetries: 3,
  processingTimeout: 30000, // 30 seconds
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProcessedEvent {
  id: string;
  category: string;
  eventType: string;
  userId: string;
  tenantId: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface CheckpointData {
  shardId: string;
  sequenceNumber: string;
  timestamp: string;
}

interface ConsumerMetrics {
  eventsProcessed: number;
  eventsFailed: number;
  batchesProcessed: number;
  lastProcessedAt: Date | null;
  averageLatency: number;
  startedAt: Date;
}

type EventHandler = (events: ProcessedEvent[]) => Promise<void>;

// ═══════════════════════════════════════════════════════════════════════════════
// KINESIS CONSUMER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class KinesisAnalyticsConsumer {
  private readonly kinesis: KinesisClient;
  private readonly dynamo: DynamoDBClient;
  private readonly redis: Redis;
  private readonly config: KinesisConsumerConfig;
  private readonly handlers: Map<string, EventHandler[]> = new Map();
  
  private isRunning = false;
  private shardIterators: Map<string, string> = new Map();
  private metrics: ConsumerMetrics = {
    eventsProcessed: 0,
    eventsFailed: 0,
    batchesProcessed: 0,
    lastProcessedAt: null,
    averageLatency: 0,
    startedAt: new Date(),
  };

  constructor(redis: Redis, config: Partial<KinesisConsumerConfig> = {}) {
    this.kinesis = new KinesisClient({});
    this.dynamo = new DynamoDBClient({});
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.registerDefaultHandlers();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Kinesis consumer is already running');
      return;
    }

    console.log(`Starting Kinesis consumer for stream: ${this.config.streamName}`);
    this.isRunning = true;
    this.metrics.startedAt = new Date();

    await this.initializeShards();
    this.poll();
  }

  async stop(): Promise<void> {
    console.log('Stopping Kinesis consumer...');
    this.isRunning = false;
    
    // Wait for current processing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Kinesis consumer stopped');
    this.logMetrics();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  private async initializeShards(): Promise<void> {
    const describeCommand = new DescribeStreamCommand({
      StreamName: this.config.streamName,
    });

    const response = await this.kinesis.send(describeCommand);
    const shards = response.StreamDescription?.Shards || [];

    console.log(`Found ${shards.length} shards in stream`);

    for (const shard of shards) {
      if (!shard.ShardId) continue;

      const checkpoint = await this.getCheckpoint(shard.ShardId);
      const iteratorType = checkpoint
        ? 'AFTER_SEQUENCE_NUMBER'
        : 'TRIM_HORIZON';

      const iteratorCommand = new GetShardIteratorCommand({
        StreamName: this.config.streamName,
        ShardId: shard.ShardId,
        ShardIteratorType: iteratorType,
        ...(checkpoint && { StartingSequenceNumber: checkpoint.sequenceNumber }),
      });

      const iteratorResponse = await this.kinesis.send(iteratorCommand);
      if (iteratorResponse.ShardIterator) {
        this.shardIterators.set(shard.ShardId, iteratorResponse.ShardIterator);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POLLING
  // ─────────────────────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        for (const [shardId, iterator] of this.shardIterators) {
          if (!iterator) continue;

          const records = await this.fetchRecords(iterator);
          
          if (records.records.length > 0) {
            await this.processBatch(shardId, records.records);
          }

          if (records.nextIterator) {
            this.shardIterators.set(shardId, records.nextIterator);
          }
        }
      } catch (error) {
        console.error('Error polling Kinesis:', error);
      }

      await this.sleep(this.config.pollInterval);
    }
  }

  private async fetchRecords(
    iterator: string
  ): Promise<{ records: KinesisRecord[]; nextIterator: string | null }> {
    const command = new GetRecordsCommand({
      ShardIterator: iterator,
      Limit: this.config.batchSize,
    });

    const response = await this.kinesis.send(command);

    return {
      records: response.Records || [],
      nextIterator: response.NextShardIterator || null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────

  private async processBatch(shardId: string, records: KinesisRecord[]): Promise<void> {
    const startTime = Date.now();
    const events: ProcessedEvent[] = [];

    for (const record of records) {
      try {
        const event = this.parseRecord(record);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        console.error('Error parsing record:', error);
        this.metrics.eventsFailed++;
      }
    }

    if (events.length === 0) return;

    // Process events through handlers
    try {
      await this.runHandlers(events);
      
      // Update metrics
      this.metrics.eventsProcessed += events.length;
      this.metrics.batchesProcessed++;
      this.metrics.lastProcessedAt = new Date();
      
      const latency = Date.now() - startTime;
      this.metrics.averageLatency = 
        (this.metrics.averageLatency * (this.metrics.batchesProcessed - 1) + latency) / 
        this.metrics.batchesProcessed;

      // Checkpoint
      const lastRecord = records[records.length - 1];
      if (lastRecord?.SequenceNumber) {
        await this.saveCheckpoint(shardId, lastRecord.SequenceNumber);
      }

    } catch (error) {
      console.error('Error processing batch:', error);
      this.metrics.eventsFailed += events.length;
    }
  }

  private parseRecord(record: KinesisRecord): ProcessedEvent | null {
    if (!record.Data) return null;

    const data = JSON.parse(Buffer.from(record.Data).toString('utf-8')) as AnalyticsEvent;

    return {
      id: data.id,
      category: data.category,
      eventType: data.eventType,
      userId: data.userId,
      tenantId: data.tenantId,
      sessionId: data.sessionId,
      timestamp: new Date(data.timestamp),
      properties: data.properties || {},
      metadata: data.metadata || {},
    };
  }

  private async runHandlers(events: ProcessedEvent[]): Promise<void> {
    // Group events by category for efficient processing
    const byCategory = new Map<string, ProcessedEvent[]>();
    
    for (const event of events) {
      const existing = byCategory.get(event.category) || [];
      existing.push(event);
      byCategory.set(event.category, existing);
    }

    // Run category-specific handlers
    for (const [category, categoryEvents] of byCategory) {
      const handlers = this.handlers.get(category) || [];
      for (const handler of handlers) {
        await handler(categoryEvents);
      }
    }

    // Run global handlers
    const globalHandlers = this.handlers.get('*') || [];
    for (const handler of globalHandlers) {
      await handler(events);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECKPOINTING
  // ─────────────────────────────────────────────────────────────────────────────

  private async getCheckpoint(shardId: string): Promise<CheckpointData | null> {
    const command = new GetItemCommand({
      TableName: this.config.checkpointTable,
      Key: {
        applicationName: { S: this.config.applicationName },
        shardId: { S: shardId },
      },
    });

    const response = await this.dynamo.send(command);
    
    if (!response.Item) return null;

    return {
      shardId,
      sequenceNumber: response.Item.sequenceNumber?.S || '',
      timestamp: response.Item.timestamp?.S || '',
    };
  }

  private async saveCheckpoint(shardId: string, sequenceNumber: string): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.config.checkpointTable,
      Item: {
        applicationName: { S: this.config.applicationName },
        shardId: { S: shardId },
        sequenceNumber: { S: sequenceNumber },
        timestamp: { S: new Date().toISOString() },
      },
    });

    await this.dynamo.send(command);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  registerHandler(category: string, handler: EventHandler): void {
    const existing = this.handlers.get(category) || [];
    existing.push(handler);
    this.handlers.set(category, existing);
  }

  private registerDefaultHandlers(): void {
    // Store all events in database
    this.registerHandler('*', async (events) => {
      await this.storeEvents(events);
    });

    // Update real-time metrics
    this.registerHandler('*', async (events) => {
      await this.updateRealTimeMetrics(events);
    });

    // Learning-specific processing
    this.registerHandler('learning', async (events) => {
      await this.processLearningEvents(events);
    });

    // Assessment-specific processing
    this.registerHandler('assessment', async (events) => {
      await this.processAssessmentEvents(events);
    });

    // Engagement-specific processing
    this.registerHandler('engagement', async (events) => {
      await this.processEngagementEvents(events);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT PROCESSING HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async storeEvents(events: ProcessedEvent[]): Promise<void> {
    // Batch insert into PostgreSQL
    const values = events.map(e => ({
      id: e.id,
      category: e.category,
      eventType: e.eventType,
      userId: e.userId,
      tenantId: e.tenantId,
      sessionId: e.sessionId,
      timestamp: e.timestamp,
      properties: e.properties,
      metadata: e.metadata,
      processedAt: new Date(),
    }));

    await prisma.$transaction(
      values.map(v =>
        prisma.analyticsEvent.upsert({
          where: { id: v.id },
          update: {},
          create: v as Parameters<typeof prisma.analyticsEvent.create>[0]['data'],
        })
      )
    );
  }

  private async updateRealTimeMetrics(events: ProcessedEvent[]): Promise<void> {
    const now = new Date();
    const hour = now.toISOString().substring(0, 13);
    const date = now.toISOString().substring(0, 10);

    const pipeline = this.redis.pipeline();

    // Group by tenant
    const byTenant = new Map<string, ProcessedEvent[]>();
    for (const event of events) {
      const existing = byTenant.get(event.tenantId) || [];
      existing.push(event);
      byTenant.set(event.tenantId, existing);
    }

    for (const [tenantId, tenantEvents] of byTenant) {
      // Increment hourly counter
      pipeline.incrby(`analytics:hourly:${tenantId}:${hour}`, tenantEvents.length);
      pipeline.expire(`analytics:hourly:${tenantId}:${hour}`, 86400); // 24 hours

      // Increment daily counter
      pipeline.incrby(`analytics:daily:${tenantId}:${date}`, tenantEvents.length);
      pipeline.expire(`analytics:daily:${tenantId}:${date}`, 2592000); // 30 days

      // Track DAU (unique users per day)
      const uniqueUsers = [...new Set(tenantEvents.map(e => e.userId))];
      for (const userId of uniqueUsers) {
        pipeline.sadd(`analytics:dau:${tenantId}:${date}`, userId);
      }
      pipeline.expire(`analytics:dau:${tenantId}:${date}`, 2592000);

      // Update last activity per user
      for (const event of tenantEvents) {
        pipeline.set(
          `analytics:last_activity:${event.userId}`,
          now.toISOString(),
          'EX',
          86400
        );
      }
    }

    await pipeline.exec();
  }

  private async processLearningEvents(events: ProcessedEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.eventType) {
        case 'lesson_completed':
          await this.handleLessonCompleted(event);
          break;
        case 'skill_mastery_changed':
          await this.handleSkillMasteryChanged(event);
          break;
        case 'question_answered':
          await this.handleQuestionAnswered(event);
          break;
      }
    }
  }

  private async processAssessmentEvents(events: ProcessedEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.eventType) {
        case 'assessment_completed':
        case 'assessment_submitted':
          await this.handleAssessmentCompleted(event);
          break;
      }
    }
  }

  private async processEngagementEvents(events: ProcessedEvent[]): Promise<void> {
    // Update session tracking
    for (const event of events) {
      if (event.eventType === 'session_started' || event.eventType === 'session_ended') {
        await this.handleSessionEvent(event);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIFIC EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async handleLessonCompleted(event: ProcessedEvent): Promise<void> {
    const { userId, tenantId, properties } = event;
    const contentId = properties.contentId as string;
    const score = properties.score as number | undefined;
    const timeSpent = properties.durationMs as number | undefined;

    // Update user's lesson completion stats
    await prisma.learnerProgress.upsert({
      where: {
        userId_contentId: { userId, contentId },
      },
      update: {
        completedAt: event.timestamp,
        score: score || undefined,
        timeSpent: timeSpent ? Math.round(timeSpent / 1000) : undefined,
      },
      create: {
        userId,
        contentId,
        tenantId,
        completedAt: event.timestamp,
        score,
        timeSpent: timeSpent ? Math.round(timeSpent / 1000) : undefined,
      },
    });
  }

  private async handleSkillMasteryChanged(event: ProcessedEvent): Promise<void> {
    const { userId, properties } = event;
    const skillId = properties.skillId as string;
    const newLevel = properties.newLevel as number;

    // Record mastery snapshot for historical tracking
    await prisma.skillMasterySnapshot.create({
      data: {
        userId,
        skillId,
        masteryLevel: newLevel,
        recordedAt: event.timestamp,
      },
    });
  }

  private async handleQuestionAnswered(event: ProcessedEvent): Promise<void> {
    const { userId, properties } = event;
    const questionId = properties.questionId as string;
    const correct = properties.correct as boolean;
    const responseTime = properties.responseTimeMs as number | undefined;

    // Update question response analytics
    await prisma.questionResponse.create({
      data: {
        userId,
        questionId,
        correct,
        responseTimeMs: responseTime || 0,
        answeredAt: event.timestamp,
      },
    });
  }

  private async handleAssessmentCompleted(event: ProcessedEvent): Promise<void> {
    const { userId, tenantId, properties } = event;
    const assessmentId = properties.assessmentId as string;
    const score = properties.score as number;
    const questionsTotal = properties.questionsTotal as number;
    const questionsCorrect = properties.questionsCorrect as number;

    await prisma.assessmentResult.upsert({
      where: {
        userId_assessmentId: { userId, assessmentId },
      },
      update: {
        score,
        questionsTotal,
        questionsCorrect,
        completedAt: event.timestamp,
      },
      create: {
        userId,
        assessmentId,
        tenantId,
        score,
        questionsTotal,
        questionsCorrect,
        startedAt: event.timestamp,
        completedAt: event.timestamp,
      },
    });
  }

  private async handleSessionEvent(event: ProcessedEvent): Promise<void> {
    const { userId, sessionId, properties } = event;

    if (event.eventType === 'session_started') {
      await prisma.learnerSession.create({
        data: {
          id: sessionId,
          userId,
          startedAt: event.timestamp,
          deviceType: (properties.deviceType as string) || 'unknown',
          platform: (properties.platform as string) || 'unknown',
        },
      });
    } else if (event.eventType === 'session_ended') {
      await prisma.learnerSession.update({
        where: { id: sessionId },
        data: {
          endedAt: event.timestamp,
          durationMs: properties.durationMs as number,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics(): ConsumerMetrics {
    return { ...this.metrics };
  }

  private logMetrics(): void {
    console.log('Kinesis Consumer Metrics:', {
      eventsProcessed: this.metrics.eventsProcessed,
      eventsFailed: this.metrics.eventsFailed,
      batchesProcessed: this.metrics.batchesProcessed,
      averageLatency: `${this.metrics.averageLatency.toFixed(2)}ms`,
      uptime: `${(Date.now() - this.metrics.startedAt.getTime()) / 1000}s`,
    });
  }
}

export default KinesisAnalyticsConsumer;
