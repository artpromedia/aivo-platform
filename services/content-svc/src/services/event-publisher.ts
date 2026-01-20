// =============================================================================
// content-svc Event Publisher Service
// =============================================================================
//
// Publishes content ingestion events to NATS JetStream.
// Falls back to logging when NATS is disabled or unavailable.

import { EventPublisher, createEventPublisher } from '@aivo/events';
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
  private publisher: EventPublisher | null = null;
  private isConnecting = false;
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
      this.publisher = createEventPublisher({
        servers: config.nats.servers,
        serviceName: 'content-svc',
        serviceVersion: '0.1.0',
        name: 'content-svc-publisher',
        token: config.nats.token,
        user: config.nats.user,
        pass: config.nats.pass,
      });

      await this.publisher.connect();
      console.log('[content-svc] Connected to NATS');
      this.connectionError = null;
    } catch (err) {
      this.connectionError = err instanceof Error ? err : new Error(String(err));
      console.error('[content-svc] Failed to connect to NATS:', err);
      this.publisher = null;
    } finally {
      this.isConnecting = false;
    }
  }

  private async ensureConnected(): Promise<EventPublisher | null> {
    if (!config.nats.enabled) {
      return null;
    }

    if (this.publisher?.isConnected()) {
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
  async publishFileIngestionJob(data: FileIngestionJobData): Promise<{ success: boolean; error?: string }> {
    const publisher = await this.ensureConnected();

    const subject = `content.ingestion.file.${data.jobId}`;
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
        // Use the generic publish method for custom events
        const result = await publisher.publish(subject, payload);

        if (result.success) {
          console.log(`[content-svc] Published file ingestion job: ${data.jobId}`);
          return { success: true };
        } else {
          console.error(`[content-svc] Failed to publish file ingestion job: ${result.error?.message}`);
          return { success: false, error: result.error?.message };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[content-svc] Error publishing file ingestion job:`, err);
        return { success: false, error: errorMsg };
      }
    } else {
      // Log event when NATS is not available
      console.log('[content-svc] NATS unavailable, logging event:', {
        subject,
        payload,
      });
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

    const subject = `content.ingestion.ai-draft.${data.jobId}`;
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
        const result = await publisher.publish(subject, payload);

        if (result.success) {
          console.log(`[content-svc] Published AI draft job: ${data.jobId}`);
          return { success: true };
        } else {
          console.error(`[content-svc] Failed to publish AI draft job: ${result.error?.message}`);
          return { success: false, error: result.error?.message };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[content-svc] Error publishing AI draft job:`, err);
        return { success: false, error: errorMsg };
      }
    } else {
      // Log event when NATS is not available
      console.log('[content-svc] NATS unavailable, logging event:', {
        subject,
        payload,
      });
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
      console.log('[content-svc] Disconnected from NATS');
    }
  }

  isHealthy(): boolean {
    if (!config.nats.enabled) {
      return true; // Healthy when disabled
    }
    return this.publisher?.isConnected() ?? false;
  }
}

// -----------------------------------------------------------------------------
// Singleton Export
// -----------------------------------------------------------------------------

export const contentEventPublisher = new ContentEventPublisherService();
