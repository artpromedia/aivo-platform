/**
 * Audit Log Service
 * Comprehensive audit logging for security and compliance
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KinesisClient,
  PutRecordsCommand,
  PutRecordsRequestEntry,
} from '@aws-sdk/client-kinesis';
import { AuditEvent, AuditEventType, AuditEventCategory, AuditSeverity } from '../types';
import { AUDIT } from '../constants';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditLogService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly kinesisClient: KinesisClient;
  private readonly streamName: string;
  private buffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor(private readonly configService: ConfigService) {
    this.kinesisClient = new KinesisClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    });
    this.streamName = this.configService.get(
      'KINESIS_AUDIT_STREAM',
      'aivo-audit-logs'
    );
    
    // Start flush timer
    this.startFlushTimer();
  }
  
  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AuditEvent = {
      id: randomUUID(),
      timestamp: new Date(),
      ...event,
    };
    
    // Add to buffer
    this.buffer.push(fullEvent);
    
    // Check if immediate flush is needed
    if (
      AUDIT.IMMEDIATE_FLUSH_SEVERITY.includes(fullEvent.severity) ||
      this.buffer.length >= AUDIT.BUFFER_SIZE
    ) {
      await this.flush();
    }
  }
  
  /**
   * Log authentication event
   */
  async logAuth(
    eventType: 'login' | 'logout' | 'failed' | 'mfa_challenge',
    userId: string,
    details: {
      ip: string;
      userAgent?: string;
      sessionId?: string;
      success: boolean;
      errorMessage?: string;
      correlationId: string;
    }
  ): Promise<void> {
    const eventTypeMap: Record<string, AuditEventType> = {
      login: 'authentication.login',
      logout: 'authentication.logout',
      failed: 'authentication.failed',
      mfa_challenge: 'authentication.mfa_challenge',
    };
    
    await this.log({
      eventType: eventTypeMap[eventType],
      eventCategory: 'authentication',
      severity: details.success ? 'low' : 'medium',
      actor: {
        id: userId,
        type: 'user',
        ip: details.ip,
        userAgent: details.userAgent,
        sessionId: details.sessionId,
      },
      action: {
        name: eventType,
      },
      result: {
        status: details.success ? 'success' : 'failure',
        errorMessage: details.errorMessage,
      },
      context: {
        correlationId: details.correlationId,
        requestId: randomUUID(),
        environment: process.env.NODE_ENV || 'development',
        service: 'api-gateway',
      },
    });
  }
  
  /**
   * Log data access event
   */
  async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete' | 'export',
    resource: {
      type: string;
      id: string;
      name?: string;
    },
    actor: {
      userId: string;
      ip: string;
      sessionId?: string;
    },
    details: {
      method: string;
      path: string;
      success: boolean;
      correlationId: string;
      tenantId?: string;
      changes?: { before?: any; after?: any };
    }
  ): Promise<void> {
    const eventTypeMap: Record<string, AuditEventType> = {
      read: 'data.read',
      create: 'data.create',
      update: 'data.update',
      delete: 'data.delete',
      export: 'data.export',
    };
    
    await this.log({
      eventType: eventTypeMap[action],
      eventCategory: action === 'read' ? 'data_access' : 'data_modification',
      severity: action === 'delete' ? 'medium' : 'low',
      actor: {
        id: actor.userId,
        type: 'user',
        ip: actor.ip,
        sessionId: actor.sessionId,
      },
      resource: {
        type: resource.type,
        id: resource.id,
        name: resource.name,
        tenantId: details.tenantId,
      },
      action: {
        name: action,
        method: details.method,
        path: details.path,
      },
      result: {
        status: details.success ? 'success' : 'failure',
      },
      context: {
        correlationId: details.correlationId,
        requestId: randomUUID(),
        environment: process.env.NODE_ENV || 'development',
        service: 'api-gateway',
      },
      changes: details.changes,
    });
  }
  
  /**
   * Log security threat
   */
  async logSecurityThreat(
    threatType: string,
    severity: AuditSeverity,
    details: {
      ip: string;
      userId?: string;
      sessionId?: string;
      indicators: string[];
      blocked: boolean;
      correlationId: string;
    }
  ): Promise<void> {
    await this.log({
      eventType: 'security.threat_detected',
      eventCategory: 'security',
      severity,
      actor: {
        id: details.userId || 'anonymous',
        type: details.userId ? 'user' : 'anonymous',
        ip: details.ip,
        sessionId: details.sessionId,
      },
      action: {
        name: `threat_detected:${threatType}`,
      },
      result: {
        status: details.blocked ? 'success' : 'failure',
        errorMessage: details.indicators.join('; '),
      },
      context: {
        correlationId: details.correlationId,
        requestId: randomUUID(),
        environment: process.env.NODE_ENV || 'development',
        service: 'api-gateway',
      },
    });
  }
  
  /**
   * Log consent event
   */
  async logConsent(
    action: 'granted' | 'revoked',
    userId: string,
    details: {
      consentType: string;
      purposes: string[];
      ip: string;
      correlationId: string;
    }
  ): Promise<void> {
    const eventType: AuditEventType =
      action === 'granted' ? 'consent.granted' : 'consent.revoked';
    
    await this.log({
      eventType,
      eventCategory: 'consent_management',
      severity: 'medium',
      actor: {
        id: userId,
        type: 'user',
        ip: details.ip,
      },
      action: {
        name: `consent_${action}`,
      },
      result: {
        status: 'success',
      },
      context: {
        correlationId: details.correlationId,
        requestId: randomUUID(),
        environment: process.env.NODE_ENV || 'development',
        service: 'api-gateway',
      },
      compliance: {
        regulations: this.getRelevantRegulations(details.purposes),
      },
    });
  }
  
  /**
   * Flush buffered events to Kinesis
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    
    const events = [...this.buffer];
    this.buffer = [];
    
    try {
      const records: PutRecordsRequestEntry[] = events.map(event => ({
        Data: Buffer.from(JSON.stringify(event)),
        PartitionKey: event.actor?.id || 'system',
      }));
      
      // Kinesis has a limit of 500 records per batch
      const batches = this.chunkArray(records, 500);
      
      for (const batch of batches) {
        const command = new PutRecordsCommand({
          Records: batch,
          StreamName: this.streamName,
        });
        
        const response = await this.kinesisClient.send(command);
        
        if (response.FailedRecordCount && response.FailedRecordCount > 0) {
          this.logger.warn('Some audit records failed to send', {
            failedCount: response.FailedRecordCount,
          });
        }
      }
      
      this.logger.debug('Flushed audit events', { count: events.length });
    } catch (error) {
      this.logger.error('Failed to flush audit events', {
        error: error.message,
        eventCount: events.length,
      });
      
      // Re-add failed events to buffer (with limit)
      const remaining = AUDIT.BUFFER_SIZE - this.buffer.length;
      if (remaining > 0) {
        this.buffer.unshift(...events.slice(0, remaining));
      }
    }
  }
  
  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(
      () => this.flush(),
      AUDIT.FLUSH_INTERVAL_MS
    );
  }
  
  /**
   * Get relevant regulations for consent purposes
   */
  private getRelevantRegulations(purposes: string[]): string[] {
    const regulations: Set<string> = new Set();
    
    purposes.forEach(purpose => {
      if (['educational_services', 'personalization'].includes(purpose)) {
        regulations.add('FERPA');
      }
      if (['marketing', 'third_party_sharing'].includes(purpose)) {
        regulations.add('COPPA');
        regulations.add('GDPR');
      }
      if (purposes.includes('ai_processing')) {
        regulations.add('GDPR');
      }
    });
    
    return Array.from(regulations);
  }
  
  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    await this.flush();
  }
}
