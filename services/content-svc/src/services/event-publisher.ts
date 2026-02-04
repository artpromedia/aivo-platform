// =============================================================================
// content-svc Event Publisher Service
// =============================================================================
//
// Publishes content ingestion events to NATS JetStream.
// Falls back to logging when NATS is disabled or unavailable.

import { NatsTransport } from '@aivo/events';

import { config } from '../config.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FileIngestionJobData {
  jobId: string;
  tenantId: string | null;
  createdByUserId: string;
  fileUrl: string;
  fileType: 'csv' | 'json';
  mappings?: Record<string, string>;
  defaultSubject?: string;
  defaultGradeBand?: string;
  autoSubmitForReview: boolean;
}

export interface AiDraftJobData {
  jobId: string;
  tenantId: string | null;
  createdByUserId: string;
  subject: string;
  gradeBand: string;
  contentType: string;
  standards?: string[];
  targetSkills?: string[];
  promptSummary: string;
  difficulty?: number;
  estimatedMinutes?: number;
}

// -----------------------------------------------------------------------------
// Content Event Publisher Service
// -----------------------------------------------------------------------------

class ContentEventPublisherService {
  private publisher: NatsTransport | null = null;
  private isConnecting = false;
  private connected = false;
  private connectionError: Error | null = null;

  constructor() {
    if (config.nats.enabled) {
      this.initializePublisher();
    } else {
      console.log('[content-svc] NATS disabled, events will be logged only');
    }
  }

  private async initializePublisher(): Promise<void> {
    if (this.isConnecting || this.publisher) {
      return;
    }

    this.isConnecting = true;

    try {
      this.publisher = new NatsTransport({
        servers: config.nats.servers,
        serviceName: 'content-svc',
        serviceVersion: process.env.SERVICE_VERSION ?? process.env.npm_package_version ?? '0.1.0',
        name: 'content-svc',
        token: config.nats.token,
        user: config.nats.user,
        pass: config.nats.pass,
      });

      await this.publisher.connect();
      this.connected = true;
      console.log('[content-svc] Connected to NATS');
      this.connectionError = null;
    } catch (err) {
      this.connectionError = err instanceof Error ? err : new Error(String(err));
      console.error('[content-svc] Failed to connect to NATS:', err);
      this.publisher = null;
      this.connected = false;
    } finally {
      this.isConnecting = false;
    }
  }

  private async ensureConnected(): Promise<NatsTransport | null> {
    if (!config.nats.enabled) {
      return null;
    }

    if (this.publisher && this.connected) {
      return this.publisher;
    }

    // Try to reconnect
    await this.initializePublisher();
    return this.publisher;
  }

  // ---------------------------------------------------------------------------
  // File Ingestion Events
  // ---------------------------------------------------------------------------

  /**
   * Publish a file ingestion job event to trigger background processing.
   */
  async publishFileIngestionJob(
    data: FileIngestionJobData
  ): Promise<{ success: boolean; error?: string }> {
    const publisher = await this.ensureConnected();

    if (!data.tenantId) {
      console.log('[content-svc] Missing tenantId, skipping publish for file ingestion job');
      return { success: true };
    }

    const payload = {
      type: 'FILE_INGESTION_JOB_CREATED',
      jobId: data.jobId,
      tenantId: data.tenantId,
      createdByUserId: data.createdByUserId,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      mappings: data.mappings,
      defaultSubject: data.defaultSubject,
      defaultGradeBand: data.defaultGradeBand,
      autoSubmitForReview: data.autoSubmitForReview,
      createdAt: new Date().toISOString(),
    };

    if (publisher) {
      try {
        await publisher.publish({
          tenantId: data.tenantId,
          eventType: 'content.ingestion',
          eventVersion: '1.0.0',
          metadata: payload,
        });
        console.log(`[content-svc] Published file ingestion job: ${data.jobId}`);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[content-svc] Error publishing file ingestion job:`, err);
        this.connected = false; // Mark as disconnected on error
        return { success: false, error: errorMsg };
      }
    } else {
      // Log event when NATS is not available
      console.log('[content-svc] NATS unavailable, logging event:', payload);
      return { success: true }; // Return success since we logged it (for dev/test)
    }
  }

  // ---------------------------------------------------------------------------
  // AI Draft Events
  // ---------------------------------------------------------------------------

  /**
   * Publish an AI draft job event to trigger background processing.
   */
  async publishAiDraftJob(data: AiDraftJobData): Promise<{ success: boolean; error?: string }> {
    const publisher = await this.ensureConnected();

    if (!data.tenantId) {
      console.log('[content-svc] Missing tenantId, skipping publish for AI draft job');
      return { success: true };
    }

    const payload = {
      type: 'AI_DRAFT_JOB_CREATED',
      jobId: data.jobId,
      tenantId: data.tenantId,
      createdByUserId: data.createdByUserId,
      subject: data.subject,
      gradeBand: data.gradeBand,
      contentType: data.contentType,
      standards: data.standards,
      targetSkills: data.targetSkills,
      promptSummary: data.promptSummary,
      difficulty: data.difficulty,
      estimatedMinutes: data.estimatedMinutes,
      createdAt: new Date().toISOString(),
    };

    if (publisher) {
      try {
        await publisher.publish({
          tenantId: data.tenantId,
          eventType: 'content.ai_draft',
          eventVersion: '1.0.0',
          metadata: payload,
        });
        console.log(`[content-svc] Published AI draft job: ${data.jobId}`);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[content-svc] Error publishing AI draft job:`, err);
        this.connected = false; // Mark as disconnected on error
        return { success: false, error: errorMsg };
      }
    } else {
      // Log event when NATS is not available
      console.log('[content-svc] NATS unavailable, logging event:', payload);
      return { success: true }; // Return success since we logged it (for dev/test)
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    if (this.publisher) {
      await this.publisher.close();
      this.publisher = null;
      this.connected = false;
      console.log('[content-svc] Disconnected from NATS');
    }
  }

  isHealthy(): boolean {
    if (!config.nats.enabled) {
      return true; // Healthy when disabled
    }
    return this.connected;
  }
}

// -----------------------------------------------------------------------------
// Singleton Export
// -----------------------------------------------------------------------------

export const contentEventPublisher = new ContentEventPublisherService();
