# Phase 5: Compliance Services (COPPA/FERPA/GDPR) - Detailed Chunks

## Chunk 5.1: Consent Service - Core

**Time Estimate:** 8-10 hours  
**Priority:** P0 - Critical  
**Dependencies:** Phase 3

### Files to Create

**Full implementation provided in original prompt.**

### Implementation Sub-tasks

#### 5.1.1: Types and Interfaces (1-2 hours)
```typescript
// Define ConsentRequest, ConsentRecord interfaces
// Define ConsentType, ConsentPurpose, VerificationMethod types
// Export all types
```

#### 5.1.2: Consent Request Workflow (3-4 hours)
```typescript
// requestConsent() method:
// - Check if user exists
// - Calculate age from DOB
// - Determine if parental consent required (COPPA < 13)
// - Create consent record in pending state
// - Generate verification URL if needed
// - Send notification to parent/guardian
// - Log consent event
```

#### 5.1.3: Consent Status Management (2-3 hours)
```typescript
// hasValidConsent() - Check if user has valid consent for purposes
// getConsentStatus() - Get all consent records for user
// calculateAge() - Helper for age calculation
// getDefaultExpiration() - Get expiration based on consent type
```

#### 5.1.4: Helper Methods (2-3 hours)
```typescript
// generateVerificationUrl() - Create secure verification token
// sendParentalConsentRequest() - Notify parent/guardian
// Age threshold constants
```

### Acceptance Criteria
- [ ] Consent request workflow implemented
- [ ] COPPA age threshold (13) enforced
- [ ] Parental consent required for minors
- [ ] Consent expiration handled
- [ ] Verification URL generation
- [ ] Parent notification integration

---

## Chunk 5.2: Consent Service - Verification

**Time Estimate:** 6-8 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 5.1

### Implementation: Extend `consent.service.ts`

#### 5.2.1: Verification Method Implementations (4-5 hours)

```typescript
// verifyParentalConsent() main method:
async verifyParentalConsent(
  consentId: string,
  verificationData: {
    method: VerificationMethod;
    data: Record<string, any>;
    ipAddress: string;
    userAgent: string;
  }
): Promise<{ success: boolean; message: string }> {
  // 1. Validate consent exists and is pending
  // 2. Call appropriate verification method
  // 3. Update consent status on success
  // 4. Log verification event
  // 5. Return result
}

// Verification methods:
private async verifyCreditCard(data: Record<string, any>): Promise<boolean>
private async verifyGovernmentId(data: Record<string, any>): Promise<boolean>
private async verifySignedForm(data: Record<string, any>): Promise<boolean>
private async verifyKnowledgeBased(userId: string, data: Record<string, any>): Promise<boolean>
private async verifyEmailPlus(userId: string, data: Record<string, any>): Promise<boolean>
```

#### 5.2.2: Verification Integrations Stubs (2-3 hours)

```typescript
// Credit Card Verification (Stripe integration)
private async verifyCreditCard(data: {
  token: string;
  amount?: number; // Small charge ($0.50-$1.00)
}): Promise<boolean> {
  // TODO: Integrate with Stripe
  // 1. Create a small charge
  // 2. Verify card holder name matches parent
  // 3. Refund the charge
  return true; // Placeholder
}

// Government ID Verification (Jumio/Onfido)
private async verifyGovernmentId(data: {
  documentType: 'drivers_license' | 'passport' | 'id_card';
  documentImage: string; // Base64 or URL
  selfieImage?: string;
}): Promise<boolean> {
  // TODO: Integrate with ID verification service
  // 1. Submit document for verification
  // 2. Match name with parent record
  // 3. Verify document authenticity
  return true; // Placeholder
}

// Signed Form Verification
private async verifySignedForm(data: {
  documentId: string;
  signatureData: string;
}): Promise<boolean> {
  // TODO: Integrate with e-signature service (DocuSign, etc.)
  // 1. Verify document was signed
  // 2. Verify signer matches parent
  return true; // Placeholder
}

// Knowledge-Based Authentication
private async verifyKnowledgeBased(
  userId: string,
  data: { answers: Record<string, string> }
): Promise<boolean> {
  // TODO: Integrate with KBA service
  // Questions based on credit history, public records
  return true; // Placeholder
}

// Email Plus Additional Factor
private async verifyEmailPlus(
  userId: string,
  data: { emailCode: string; additionalFactor: string }
): Promise<boolean> {
  // Verify email code
  const emailValid = await this.verifyEmailCode(userId, data.emailCode);
  
  // Verify additional factor (SMS, security question, etc.)
  const factorValid = await this.verifyAdditionalFactor(userId, data.additionalFactor);
  
  return emailValid && factorValid;
}
```

### Acceptance Criteria
- [ ] 5 verification methods implemented
- [ ] Credit card verification stub
- [ ] Government ID verification stub
- [ ] Signed form verification stub
- [ ] Knowledge-based auth stub
- [ ] Email-plus verification working
- [ ] Verification audit logging

---

## Chunk 5.3: Consent Service - Revocation & Deletion

**Time Estimate:** 4-6 hours  
**Priority:** P0 - Critical  
**Dependencies:** Chunk 5.1

### Implementation: Extend `consent.service.ts`

```typescript
/**
 * Revoke consent
 */
async revokeConsent(
  consentId: string,
  revokedBy: string,
  reason?: string
): Promise<{ success: boolean; dataDeleted: boolean }> {
  // 1. Validate consent exists
  // 2. Verify authorization to revoke
  // 3. Update consent status to 'revoked'
  // 4. For parental consent revocation, delete minor's data (COPPA)
  // 5. Log revocation event
  // 6. Return result
}

/**
 * COPPA-compliant data deletion for minors
 */
private async deleteMinorData(userId: string): Promise<void> {
  logger.info('Deleting minor data per COPPA requirements', { userId });

  await this.prisma.$transaction([
    // Delete learning data
    this.prisma.learningSession.deleteMany({ where: { studentId: userId } }),
    this.prisma.assessmentAttempt.deleteMany({ where: { studentId: userId } }),
    this.prisma.skillMastery.deleteMany({ where: { studentId: userId } }),
    
    // Delete profile data
    this.prisma.playerProfile.deleteMany({ where: { profile: { userId } } }),
    this.prisma.profile.deleteMany({ where: { userId } }),
    
    // Delete activity data
    this.prisma.activityLog.deleteMany({ where: { userId } }),
    this.prisma.notification.deleteMany({ where: { userId } }),
    
    // Delete media/uploads
    this.prisma.userUpload.deleteMany({ where: { userId } }),
    
    // Anonymize user record (keep for audit trail)
    this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.aivo.edu`,
        givenName: 'Deleted',
        familyName: 'User',
        dateOfBirth: null,
        phone: null,
        avatar: null,
        deletedAt: new Date(),
        status: 'deleted',
      },
    }),
  ]);

  // Delete from external systems
  await this.deleteFromExternalSystems(userId);
}

/**
 * Delete user data from external systems
 */
private async deleteFromExternalSystems(userId: string): Promise<void> {
  // Analytics services
  // await this.analytics.deleteUser(userId);
  
  // CDN/Storage
  // await this.storage.deleteUserFiles(userId);
  
  // Search indices
  // await this.search.removeUser(userId);
  
  // Third-party integrations
  // await this.integrations.deleteUserData(userId);
}
```

### Acceptance Criteria
- [ ] Consent revocation implemented
- [ ] Authorization check for revocation
- [ ] COPPA data deletion for minors
- [ ] Cascading deletion of all user data
- [ ] User record anonymization (not full delete)
- [ ] External system cleanup
- [ ] Revocation audit logging

---

## Chunk 5.4: GDPR Data Subject Request Handler

**Time Estimate:** 8-10 hours  
**Priority:** P0 - Critical  
**Dependencies:** Phase 4

### Files to Create

#### 1. `services/api-gateway/src/security/services/dsr.service.ts`

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import { EncryptionService } from './encryption.service';
import { DataClassificationService } from './data-classification.service';
import { QueueService } from '../../queue/queue.service';
import { logger } from '@aivo/ts-observability';
import { v4 as uuidv4 } from 'uuid';

export type DSRType = 
  | 'access'          // Article 15 - Right of access
  | 'rectification'   // Article 16 - Right to rectification
  | 'erasure'         // Article 17 - Right to erasure
  | 'portability'     // Article 20 - Right to data portability
  | 'restriction'     // Article 18 - Right to restriction
  | 'objection';      // Article 21 - Right to object

export interface DSRRequest {
  id: string;
  type: DSRType;
  dataSubjectId: string;
  requesterId: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  submittedAt: Date;
  dueDate: Date;
  completedAt?: Date;
  result?: Record<string, any>;
  notes?: string;
}

@Injectable()
export class DSRService {
  private readonly SLA_DAYS = 30; // GDPR 30-day requirement

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private encryption: EncryptionService,
    private classification: DataClassificationService,
    private queue: QueueService,
  ) {}

  /**
   * Submit a new DSR
   */
  async submitRequest(
    type: DSRType,
    dataSubjectId: string,
    requesterId: string,
    options?: { notes?: string; scope?: string[] }
  ): Promise<DSRRequest> {
    // Verify requester is authorized
    await this.verifyAuthorization(dataSubjectId, requesterId);

    const request: DSRRequest = {
      id: uuidv4(),
      type,
      dataSubjectId,
      requesterId,
      status: 'pending',
      submittedAt: new Date(),
      dueDate: new Date(Date.now() + this.SLA_DAYS * 24 * 60 * 60 * 1000),
      notes: options?.notes,
    };

    await this.prisma.dataSubjectRequest.create({
      data: request as any,
    });

    // Queue for processing
    await this.queue.add('dsr-processing', {
      requestId: request.id,
      type,
    });

    // Audit log
    await this.auditLog.logPrivacyRequest(
      `data_${type === 'erasure' ? 'deletion' : type === 'access' ? 'request' : 'export'}`,
      { id: requesterId, type: 'user' },
      { status: 'success' },
      {
        requesterId,
        dataSubjectId,
        requestType: type,
        scope: options?.scope || ['all'],
      }
    );

    return request;
  }

  /**
   * Process Access Request (Article 15)
   */
  async processAccessRequest(requestId: string): Promise<Record<string, any>> {
    const request = await this.getRequest(requestId);
    const userId = request.dataSubjectId;

    // Collect all user data
    const userData = await this.collectUserData(userId);

    // Classify and organize data
    const organizedData = this.organizeDataByCategory(userData);

    // Update request status
    await this.updateRequestStatus(requestId, 'completed', organizedData);

    return organizedData;
  }

  /**
   * Process Erasure Request (Article 17)
   */
  async processErasureRequest(requestId: string): Promise<{ success: boolean; retainedData?: string[] }> {
    const request = await this.getRequest(requestId);
    const userId = request.dataSubjectId;

    // Check for legal retention requirements
    const retentionCheck = await this.checkRetentionRequirements(userId);

    if (retentionCheck.mustRetain.length > 0) {
      logger.info('Some data must be retained per legal requirements', {
        userId,
        retainedTypes: retentionCheck.mustRetain,
      });
    }

    // Delete data that can be deleted
    await this.deleteUserData(userId, retentionCheck.canDelete);

    // Anonymize retained data
    await this.anonymizeRetainedData(userId, retentionCheck.mustRetain);

    await this.updateRequestStatus(requestId, 'completed', {
      deleted: retentionCheck.canDelete,
      retained: retentionCheck.mustRetain,
    });

    return {
      success: true,
      retainedData: retentionCheck.mustRetain,
    };
  }

  /**
   * Process Portability Request (Article 20)
   */
  async processPortabilityRequest(requestId: string): Promise<{ downloadUrl: string }> {
    const request = await this.getRequest(requestId);
    const userId = request.dataSubjectId;

    // Collect portable data (user-provided data only)
    const portableData = await this.collectPortableData(userId);

    // Generate machine-readable format (JSON)
    const exportData = {
      exportDate: new Date().toISOString(),
      format: 'GDPR_ARTICLE_20_EXPORT',
      version: '1.0',
      dataSubject: {
        id: userId,
      },
      data: portableData,
    };

    // Store encrypted export file
    const downloadUrl = await this.createSecureDownload(userId, exportData);

    await this.updateRequestStatus(requestId, 'completed', { downloadUrl });

    return { downloadUrl };
  }

  /**
   * Process Rectification Request (Article 16)
   */
  async processRectificationRequest(
    requestId: string,
    corrections: Record<string, any>
  ): Promise<{ success: boolean; updated: string[] }> {
    const request = await this.getRequest(requestId);
    const userId = request.dataSubjectId;

    const updated: string[] = [];

    // Apply corrections to user data
    for (const [field, value] of Object.entries(corrections)) {
      try {
        await this.updateUserField(userId, field, value);
        updated.push(field);
      } catch (error) {
        logger.error('Failed to update field', { userId, field, error });
      }
    }

    await this.updateRequestStatus(requestId, 'completed', { updated });

    return { success: true, updated };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async getRequest(requestId: string): Promise<DSRRequest> {
    const request = await this.prisma.dataSubjectRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request as unknown as DSRRequest;
  }

  private async verifyAuthorization(dataSubjectId: string, requesterId: string): Promise<void> {
    // Requester must be the data subject or an authorized representative
    if (dataSubjectId !== requesterId) {
      // Check for parent/guardian relationship (for minors)
      const relationship = await this.prisma.guardianship.findFirst({
        where: {
          childId: dataSubjectId,
          guardianId: requesterId,
          status: 'active',
        },
      });

      if (!relationship) {
        throw new BadRequestException('Not authorized to make this request');
      }
    }
  }

  private async collectUserData(userId: string): Promise<Record<string, any>> {
    const [user, profile, sessions, assessments, consents] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.learningSession.findMany({ where: { studentId: userId } }),
      this.prisma.assessmentAttempt.findMany({ where: { studentId: userId } }),
      this.prisma.consent.findMany({ where: { userId } }),
    ]);

    return {
      user,
      profile,
      learningSessions: sessions,
      assessments,
      consents,
    };
  }

  private async collectPortableData(userId: string): Promise<Record<string, any>> {
    // Only collect data provided by the user (not derived/inferred data)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        givenName: true,
        familyName: true,
        dateOfBirth: true,
        phone: true,
        profile: {
          select: {
            bio: true,
            preferences: true,
          },
        },
      },
    });

    return {
      personalInformation: user,
      // Add other user-provided data categories
    };
  }

  private organizeDataByCategory(data: Record<string, any>): Record<string, any> {
    return {
      identity: {
        name: `${data.user?.givenName} ${data.user?.familyName}`,
        email: data.user?.email,
        dateOfBirth: data.user?.dateOfBirth,
      },
      profile: data.profile,
      education: {
        sessions: data.learningSessions?.length || 0,
        assessments: data.assessments?.length || 0,
      },
      consent: data.consents,
      dataProcessing: {
        purposes: ['Educational services', 'Personalization'],
        legalBasis: 'Consent and Contract',
      },
    };
  }

  private async checkRetentionRequirements(userId: string): Promise<{
    canDelete: string[];
    mustRetain: string[];
  }> {
    // Check legal retention requirements
    const retentionRules = {
      // Educational records - FERPA requires retention
      educationalRecords: 7 * 365, // 7 years
      // Financial records - Tax requirements
      financialRecords: 7 * 365,
      // Audit logs - Compliance
      auditLogs: 2 * 365,
    };

    const canDelete = ['profile', 'preferences', 'uploads', 'notifications'];
    const mustRetain = ['grades', 'transcripts', 'financialRecords', 'auditLogs'];

    return { canDelete, mustRetain };
  }

  private async deleteUserData(userId: string, categories: string[]): Promise<void> {
    for (const category of categories) {
      switch (category) {
        case 'profile':
          await this.prisma.profile.deleteMany({ where: { userId } });
          break;
        case 'preferences':
          await this.prisma.userPreference.deleteMany({ where: { userId } });
          break;
        case 'uploads':
          await this.prisma.userUpload.deleteMany({ where: { userId } });
          break;
        case 'notifications':
          await this.prisma.notification.deleteMany({ where: { userId } });
          break;
      }
    }
  }

  private async anonymizeRetainedData(userId: string, categories: string[]): Promise<void> {
    // Anonymize retained data by removing identifiers
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `anonymized_${userId}@deleted.aivo.edu`,
        givenName: 'Anonymized',
        familyName: 'User',
        phone: null,
        avatar: null,
      },
    });
  }

  private async createSecureDownload(
    userId: string,
    data: Record<string, any>
  ): Promise<string> {
    // Encrypt and store data export
    const encrypted = await this.encryption.encrypt(JSON.stringify(data));
    
    // Generate secure download token
    const token = this.encryption.generateSecureToken(32);
    
    // Store with expiration (7 days)
    await this.prisma.secureDownload.create({
      data: {
        id: uuidv4(),
        userId,
        token,
        data: encrypted as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    });

    return `/api/privacy/download?token=${token}`;
  }

  private async updateUserField(
    userId: string,
    field: string,
    value: any
  ): Promise<void> {
    const allowedFields = ['givenName', 'familyName', 'phone', 'email'];
    
    if (!allowedFields.includes(field)) {
      throw new BadRequestException(`Field ${field} cannot be updated`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { [field]: value },
    });
  }

  private async updateRequestStatus(
    requestId: string,
    status: DSRRequest['status'],
    result?: Record<string, any>
  ): Promise<void> {
    await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : undefined,
        result: result as any,
      },
    });
  }
}
```

#### 2. `services/api-gateway/src/security/controllers/dsr.controller.ts`

```typescript
import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DSRService, DSRType } from '../services/dsr.service';
import { AuthenticationGuard } from '../guards/authentication.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Privacy')
@Controller('privacy')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DSRController {
  constructor(private dsrService: DSRService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Submit a data subject request' })
  async submitRequest(
    @CurrentUser() user: any,
    @Body() body: { type: DSRType; dataSubjectId?: string; notes?: string }
  ) {
    return this.dsrService.submitRequest(
      body.type,
      body.dataSubjectId || user.sub,
      user.sub,
      { notes: body.notes }
    );
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get my data subject requests' })
  async getMyRequests(@CurrentUser() user: any) {
    // Implementation to fetch user's requests
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get request status' })
  async getRequestStatus(@Param('id') id: string) {
    // Implementation
  }

  @Get('download')
  @ApiOperation({ summary: 'Download data export' })
  async downloadExport(@Query('token') token: string) {
    // Verify token and return download
  }
}
```

### Acceptance Criteria
- [ ] Access request (Article 15) implemented
- [ ] Rectification request (Article 16) implemented
- [ ] Erasure request (Article 17) implemented
- [ ] Portability request (Article 20) implemented
- [ ] 30-day SLA tracking
- [ ] Authorization verification
- [ ] Legal retention requirements honored
- [ ] Secure download generation
- [ ] Audit logging

---

## Chunk 5.5: Privacy Request Workflow

**Time Estimate:** 4-6 hours  
**Priority:** P1 - High  
**Dependencies:** Chunk 5.4

### Files to Create

#### 1. `services/api-gateway/src/security/services/privacy-workflow.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { NotificationService } from '../../notification/notification.service';
import { DSRService, DSRRequest, DSRType } from './dsr.service';
import { logger } from '@aivo/ts-observability';

@Injectable()
export class PrivacyWorkflowService {
  private readonly SLA_DAYS = 30;
  private readonly WARNING_DAYS = 7; // Warn 7 days before SLA

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private notification: NotificationService,
    private dsrService: DSRService,
  ) {}

  /**
   * Check for requests approaching SLA deadline
   */
  async checkSLACompliance(): Promise<void> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + this.WARNING_DAYS);

    const approachingDeadline = await this.prisma.dataSubjectRequest.findMany({
      where: {
        status: { in: ['pending', 'processing'] },
        dueDate: { lte: warningDate },
      },
    });

    for (const request of approachingDeadline) {
      await this.sendSLAWarning(request as unknown as DSRRequest);
    }
  }

  /**
   * Process pending requests
   */
  async processPendingRequests(): Promise<void> {
    const pending = await this.prisma.dataSubjectRequest.findMany({
      where: { status: 'pending' },
      orderBy: { submittedAt: 'asc' },
      take: 10,
    });

    for (const request of pending) {
      await this.queue.add('dsr-processing', {
        requestId: request.id,
        type: request.type,
      });

      await this.prisma.dataSubjectRequest.update({
        where: { id: request.id },
        data: { status: 'processing' },
      });
    }
  }

  /**
   * Handle DSR processing job
   */
  async processRequest(requestId: string, type: DSRType): Promise<void> {
    try {
      switch (type) {
        case 'access':
          await this.dsrService.processAccessRequest(requestId);
          break;
        case 'erasure':
          await this.dsrService.processErasureRequest(requestId);
          break;
        case 'portability':
          await this.dsrService.processPortabilityRequest(requestId);
          break;
        case 'rectification':
          // Requires manual intervention for data correction
          await this.assignToPrivacyTeam(requestId);
          break;
        default:
          logger.warn('Unknown DSR type', { requestId, type });
      }

      await this.sendCompletionNotification(requestId);
    } catch (error) {
      logger.error('DSR processing failed', { requestId, type, error });
      await this.handleProcessingError(requestId, error);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalRequests: number;
    byType: Record<DSRType, number>;
    completedOnTime: number;
    completedLate: number;
    pending: number;
    averageCompletionDays: number;
  }> {
    const requests = await this.prisma.dataSubjectRequest.findMany({
      where: {
        submittedAt: { gte: startDate, lte: endDate },
      },
    });

    const byType: Record<string, number> = {};
    let completedOnTime = 0;
    let completedLate = 0;
    let pending = 0;
    let totalDays = 0;
    let completedCount = 0;

    for (const request of requests) {
      byType[request.type] = (byType[request.type] || 0) + 1;

      if (request.status === 'completed' && request.completedAt) {
        completedCount++;
        const days = Math.ceil(
          (request.completedAt.getTime() - request.submittedAt.getTime()) / 
          (24 * 60 * 60 * 1000)
        );
        totalDays += days;

        if (request.completedAt <= request.dueDate) {
          completedOnTime++;
        } else {
          completedLate++;
        }
      } else if (['pending', 'processing'].includes(request.status)) {
        pending++;
      }
    }

    return {
      totalRequests: requests.length,
      byType: byType as Record<DSRType, number>,
      completedOnTime,
      completedLate,
      pending,
      averageCompletionDays: completedCount > 0 ? totalDays / completedCount : 0,
    };
  }

  private async sendSLAWarning(request: DSRRequest): Promise<void> {
    const daysRemaining = Math.ceil(
      (request.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    await this.notification.send({
      type: 'dsr.sla_warning',
      recipients: [{ email: 'privacy@aivo.edu', role: 'privacy_team' }],
      data: {
        requestId: request.id,
        type: request.type,
        daysRemaining,
        dueDate: request.dueDate,
      },
      priority: 'high',
    });
  }

  private async assignToPrivacyTeam(requestId: string): Promise<void> {
    await this.notification.send({
      type: 'dsr.manual_review',
      recipients: [{ email: 'privacy@aivo.edu', role: 'privacy_team' }],
      data: { requestId },
      priority: 'high',
    });
  }

  private async sendCompletionNotification(requestId: string): Promise<void> {
    const request = await this.prisma.dataSubjectRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) return;

    await this.notification.send({
      type: 'dsr.completed',
      recipients: [{ userId: request.requesterId, email: request.user?.email }],
      data: {
        requestId,
        type: request.type,
        downloadUrl: (request.result as any)?.downloadUrl,
      },
      priority: 'normal',
    });
  }

  private async handleProcessingError(requestId: string, error: any): Promise<void> {
    await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending',
        notes: `Processing failed: ${error.message}. Will retry.`,
      },
    });

    // Notify privacy team
    await this.notification.send({
      type: 'dsr.error',
      recipients: [{ email: 'privacy@aivo.edu', role: 'privacy_team' }],
      data: { requestId, error: error.message },
      priority: 'high',
    });
  }
}
```

### Acceptance Criteria
- [ ] SLA compliance checking
- [ ] Automatic request processing
- [ ] Manual review workflow
- [ ] Completion notifications
- [ ] Error handling and retry
- [ ] Compliance reporting

---

## Phase 5 Database Schema

```prisma
model Consent {
  id                String    @id @default(uuid())
  userId            String
  consentType       String
  purposes          String[]
  status            String    @default("pending")
  grantedBy         String
  grantedAt         DateTime?
  expiresAt         DateTime?
  revokedAt         DateTime?
  revokedBy         String?
  revocationReason  String?
  parentGuardianId  String?
  verificationMethod String?
  verifiedAt        DateTime?
  ipAddress         String?
  userAgent         String?
  version           Int       @default(1)
  metadata          Json?
  createdAt         DateTime  @default(now())
  
  user              User      @relation(fields: [userId], references: [id])
}

model DataSubjectRequest {
  id            String    @id @default(uuid())
  type          String
  dataSubjectId String
  requesterId   String
  status        String    @default("pending")
  submittedAt   DateTime  @default(now())
  dueDate       DateTime
  completedAt   DateTime?
  result        Json?
  notes         String?
  
  user          User      @relation(fields: [dataSubjectId], references: [id])
}

model SecureDownload {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  data      Json
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```
