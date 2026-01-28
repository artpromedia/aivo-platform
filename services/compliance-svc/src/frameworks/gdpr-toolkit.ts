/**
 * GDPR Compliance Toolkit
 *
 * Comprehensive toolkit for GDPR compliance including:
 * - Data Subject Rights (DSR) handling
 * - Privacy Impact Assessment (PIA) automation
 * - Breach notification management
 * - Data Processing Register (ROPA)
 * - Consent management integration
 * - Cross-border transfer validation
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export type DsrRequestType =
  | 'ACCESS'
  | 'DELETION'
  | 'RECTIFICATION'
  | 'PORTABILITY'
  | 'RESTRICTION'
  | 'OBJECTION'
  | 'WITHDRAW_CONSENT'
  | 'NOT_BE_PROFILED';

export type DsrStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXTENSION_REQUESTED';

export interface DataSubjectRequest {
  id: string;
  tenantId: string;
  requestType: DsrRequestType;
  status: DsrStatus;

  // Subject information
  subjectId: string;
  subjectType: 'LEARNER' | 'PARENT' | 'TEACHER' | 'ADMIN';
  subjectEmail: string;

  // Requester information (may differ from subject for parents)
  requesterId: string;
  requesterEmail: string;
  requesterRelationship: 'SELF' | 'PARENT' | 'GUARDIAN' | 'LEGAL_REP';

  // Request details
  description?: string;
  scope?: DataCategory[];
  specificData?: string[];

  // Identity verification
  verificationMethod?: 'EMAIL' | 'PHONE' | 'ID_DOCUMENT' | 'KNOWLEDGE_BASED';
  verifiedAt?: Date;
  verifiedBy?: string;

  // Processing
  assignedTo?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate: Date;
  extensionReason?: string;
  extensionApprovedBy?: string;

  // Completion
  completedAt?: Date;
  completedBy?: string;
  rejectionReason?: string;
  responseNotes?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export type DataCategory =
  | 'IDENTITY'
  | 'CONTACT'
  | 'EDUCATION'
  | 'LEARNING_PROGRESS'
  | 'ASSESSMENT_DATA'
  | 'BEHAVIORAL'
  | 'COMMUNICATIONS'
  | 'PAYMENT'
  | 'TECHNICAL'
  | 'AI_INTERACTIONS';

export interface DataExport {
  requestId: string;
  format: 'JSON' | 'CSV' | 'PDF';
  categories: DataCategory[];
  data: Record<string, unknown>;
  exportedAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
  checksum: string;
}

export interface BreachNotification {
  id: string;
  tenantId: string;

  // Breach details
  title: string;
  description: string;
  discoveredAt: Date;
  occurredAt?: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Impact
  affectedDataCategories: DataCategory[];
  affectedSubjectCount: number;
  affectedSubjectTypes: string[];
  riskAssessment: string;

  // Notifications
  notifyAuthority: boolean;
  authorityNotifiedAt?: Date;
  authorityReference?: string;
  notifySubjects: boolean;
  subjectsNotifiedAt?: Date;

  // Remediation
  containmentMeasures: string;
  remediationSteps: string;
  preventionMeasures: string;

  // Status
  status: 'DETECTED' | 'ASSESSING' | 'CONTAINED' | 'NOTIFYING' | 'REMEDIATED' | 'CLOSED';
  closedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingActivity {
  id: string;
  tenantId: string;

  // Activity details
  name: string;
  description: string;
  purpose: string;
  lawfulBasis: LawfulBasis;
  lawfulBasisDetails?: string;

  // Data involved
  dataCategories: DataCategory[];
  specialCategories: string[];
  dataSubjectTypes: string[];

  // Processing details
  processorName?: string;
  processorContact?: string;
  jointControllers?: string[];
  subProcessors?: string[];

  // Retention
  retentionPeriod: string;
  retentionJustification?: string;

  // Transfers
  crossBorderTransfers: boolean;
  transferDestinations?: string[];
  transferSafeguards?: string;

  // Security
  securityMeasures: string[];
  dpiaRequired: boolean;
  dpiaCompleted?: boolean;
  dpiaDate?: Date;

  // Status
  isActive: boolean;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type LawfulBasis =
  | 'CONSENT'
  | 'CONTRACT'
  | 'LEGAL_OBLIGATION'
  | 'VITAL_INTERESTS'
  | 'PUBLIC_TASK'
  | 'LEGITIMATE_INTERESTS';

/* ==========================================================================
   DSR Processing Service
   ========================================================================== */

export interface DsrServiceConfig {
  defaultResponseDays: number;
  maxExtensionDays: number;
  verificationRequired: boolean;
  autoExportFormats: ('JSON' | 'CSV' | 'PDF')[];
  notificationEmails: string[];
  webhookUrl?: string;
}

const DEFAULT_DSR_CONFIG: DsrServiceConfig = {
  defaultResponseDays: 30,
  maxExtensionDays: 60,
  verificationRequired: true,
  autoExportFormats: ['JSON'],
  notificationEmails: [],
};

/**
 * Calculate DSR due date based on applicable regulations
 */
export function calculateDsrDueDate(
  createdAt: Date,
  regulations: string[],
  hasExtension: boolean = false
): Date {
  let baseDays = 30; // GDPR default

  // Adjust based on regulation
  if (regulations.includes('KPIPA')) {
    baseDays = Math.min(baseDays, 10); // Korea: 10 days
  } else if (regulations.includes('APPI')) {
    baseDays = Math.min(baseDays, 14); // Japan: 14 days
  } else if (regulations.includes('LGPD')) {
    baseDays = Math.min(baseDays, 15); // Brazil: 15 days
  } else if (regulations.includes('CCPA')) {
    baseDays = Math.min(baseDays, 45); // California: 45 days
  }

  // Add extension if approved
  if (hasExtension) {
    baseDays += 30; // GDPR allows 2-month extension
  }

  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + baseDays);
  return dueDate;
}

/**
 * Get data export schema for a subject
 */
export function getDataExportSchema(categories: DataCategory[]): Record<string, string[]> {
  const schema: Record<string, string[]> = {};

  const categoryFields: Record<DataCategory, string[]> = {
    IDENTITY: ['name', 'dateOfBirth', 'grade', 'schoolId', 'profilePhoto'],
    CONTACT: ['email', 'parentEmail', 'phone', 'address'],
    EDUCATION: ['enrollmentDate', 'gradeLevel', 'curriculum', 'subjects', 'iepStatus'],
    LEARNING_PROGRESS: ['lessonHistory', 'skillMastery', 'xpEarned', 'achievements', 'streaks'],
    ASSESSMENT_DATA: ['assessmentResults', 'diagnosticScores', 'performanceMetrics'],
    BEHAVIORAL: ['focusMetrics', 'engagementScores', 'learningStyle', 'preferredTimes'],
    COMMUNICATIONS: ['messages', 'notifications', 'parentComms', 'teacherNotes'],
    PAYMENT: ['subscriptionHistory', 'paymentMethods', 'invoices', 'refunds'],
    TECHNICAL: ['deviceIds', 'loginHistory', 'ipAddresses', 'sessionData'],
    AI_INTERACTIONS: ['tutorConversations', 'homeworkHelp', 'recommendations', 'adaptiveSettings'],
  };

  for (const category of categories) {
    schema[category] = categoryFields[category] || [];
  }

  return schema;
}

/**
 * Validate DSR request
 */
export function validateDsrRequest(request: Partial<DataSubjectRequest>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.requestType) {
    errors.push('Request type is required');
  }

  if (!request.subjectEmail) {
    errors.push('Subject email is required');
  }

  if (!request.requesterEmail) {
    errors.push('Requester email is required');
  }

  if (request.requesterRelationship === 'PARENT' || request.requesterRelationship === 'GUARDIAN') {
    if (request.subjectType !== 'LEARNER') {
      errors.push('Parent/guardian can only request on behalf of learners');
    }
  }

  // ACCESS requests should specify scope
  if (request.requestType === 'ACCESS' && (!request.scope || request.scope.length === 0)) {
    errors.push('Access requests should specify data categories');
  }

  // RECTIFICATION requires specific data
  if (request.requestType === 'RECTIFICATION' && !request.description) {
    errors.push('Rectification requests must describe what data needs correction');
  }

  return { valid: errors.length === 0, errors };
}

/* ==========================================================================
   Breach Notification Service
   ========================================================================== */

/**
 * Assess breach severity and notification requirements
 */
export function assessBreachSeverity(breach: {
  affectedSubjectCount: number;
  affectedDataCategories: DataCategory[];
  isEncrypted: boolean;
  wasExfiltrated: boolean;
}): {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notifyAuthority: boolean;
  notifySubjects: boolean;
  notificationDeadlineHours: number;
} {
  const sensitiveCategories: DataCategory[] = ['PAYMENT', 'IDENTITY', 'BEHAVIORAL', 'AI_INTERACTIONS'];
  const hasSensitiveData = breach.affectedDataCategories.some((c) => sensitiveCategories.includes(c));

  let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  let notifyAuthority = false;
  let notifySubjects = false;

  // Assess severity
  if (breach.wasExfiltrated && hasSensitiveData) {
    severity = 'CRITICAL';
    notifyAuthority = true;
    notifySubjects = true;
  } else if (breach.affectedSubjectCount > 1000 || (hasSensitiveData && !breach.isEncrypted)) {
    severity = 'HIGH';
    notifyAuthority = true;
    notifySubjects = true;
  } else if (breach.affectedSubjectCount > 100 || hasSensitiveData) {
    severity = 'MEDIUM';
    notifyAuthority = true;
    notifySubjects = !breach.isEncrypted;
  } else {
    severity = 'LOW';
    notifyAuthority = breach.affectedSubjectCount > 10;
    notifySubjects = false;
  }

  // GDPR requires 72-hour notification
  const notificationDeadlineHours = 72;

  return { severity, notifyAuthority, notifySubjects, notificationDeadlineHours };
}

/**
 * Generate breach notification template for authority
 */
export function generateAuthorityNotification(breach: BreachNotification): string {
  return `
DATA BREACH NOTIFICATION TO SUPERVISORY AUTHORITY
==================================================

Reference: ${breach.id}
Date of Notification: ${new Date().toISOString()}

1. NATURE OF THE BREACH
-----------------------
Title: ${breach.title}
Description: ${breach.description}
Date Discovered: ${breach.discoveredAt.toISOString()}
${breach.occurredAt ? `Date Occurred: ${breach.occurredAt.toISOString()}` : ''}

2. CATEGORIES OF DATA AFFECTED
------------------------------
${breach.affectedDataCategories.join('\n')}

3. APPROXIMATE NUMBER OF DATA SUBJECTS
--------------------------------------
Count: ${breach.affectedSubjectCount}
Types: ${breach.affectedSubjectTypes.join(', ')}

4. DATA PROTECTION OFFICER CONTACT
----------------------------------
[To be filled by tenant DPO information]

5. LIKELY CONSEQUENCES
----------------------
${breach.riskAssessment}

6. MEASURES TAKEN
-----------------
Containment: ${breach.containmentMeasures}
Remediation: ${breach.remediationSteps}
Prevention: ${breach.preventionMeasures}

7. COMMUNICATION TO DATA SUBJECTS
---------------------------------
${breach.notifySubjects ? 'Data subjects will be notified' : 'Notification to subjects not required'}
${breach.subjectsNotifiedAt ? `Notified on: ${breach.subjectsNotifiedAt.toISOString()}` : ''}
`.trim();
}

/* ==========================================================================
   Data Processing Register (ROPA)
   ========================================================================== */

/**
 * Validate processing activity against GDPR requirements
 */
export function validateProcessingActivity(activity: ProcessingActivity): {
  compliant: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check lawful basis documentation
  if (activity.lawfulBasis === 'LEGITIMATE_INTERESTS' && !activity.lawfulBasisDetails) {
    issues.push('Legitimate interests requires documented balancing test');
  }

  if (activity.lawfulBasis === 'CONSENT' && !activity.lawfulBasisDetails) {
    recommendations.push('Document how consent is obtained and managed');
  }

  // Check retention
  if (!activity.retentionPeriod) {
    issues.push('Retention period must be documented');
  }

  // Check special categories
  if (activity.specialCategories.length > 0) {
    if (activity.lawfulBasis !== 'CONSENT' && !activity.lawfulBasisDetails) {
      issues.push('Special category data requires explicit consent or other Article 9 condition');
    }
  }

  // Check cross-border transfers
  if (activity.crossBorderTransfers) {
    if (!activity.transferDestinations || activity.transferDestinations.length === 0) {
      issues.push('Transfer destinations must be documented');
    }
    if (!activity.transferSafeguards) {
      issues.push('Transfer safeguards (SCCs, adequacy decisions) must be documented');
    }
  }

  // Check DPIA requirements
  const dpiaRequired =
    activity.specialCategories.length > 0 ||
    activity.dataSubjectTypes.includes('CHILDREN') ||
    activity.crossBorderTransfers;

  if (dpiaRequired && !activity.dpiaCompleted) {
    issues.push('Data Protection Impact Assessment (DPIA) is required but not completed');
  }

  // Security recommendations
  if (!activity.securityMeasures.includes('ENCRYPTION_AT_REST')) {
    recommendations.push('Consider implementing encryption at rest');
  }
  if (!activity.securityMeasures.includes('ENCRYPTION_IN_TRANSIT')) {
    recommendations.push('Consider implementing encryption in transit');
  }

  return {
    compliant: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Generate ROPA export for regulatory submission
 */
export function generateRopaExport(activities: ProcessingActivity[]): Record<string, unknown> {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    totalActivities: activities.length,
    activities: activities.map((a) => ({
      name: a.name,
      purpose: a.purpose,
      lawfulBasis: a.lawfulBasis,
      dataCategories: a.dataCategories,
      specialCategories: a.specialCategories,
      dataSubjects: a.dataSubjectTypes,
      retention: a.retentionPeriod,
      transfers: a.crossBorderTransfers
        ? {
            destinations: a.transferDestinations,
            safeguards: a.transferSafeguards,
          }
        : null,
      security: a.securityMeasures,
      dpia: a.dpiaCompleted ? { completed: a.dpiaDate } : null,
      lastReviewed: a.lastReviewedAt,
    })),
  };
}

/* ==========================================================================
   DPIA (Data Protection Impact Assessment) Automation
   ========================================================================== */

export interface DpiaQuestion {
  id: string;
  category: string;
  question: string;
  guidance: string;
  riskIndicators: string[];
  required: boolean;
}

export const DPIA_QUESTIONS: DpiaQuestion[] = [
  {
    id: 'purpose',
    category: 'Purpose',
    question: 'What is the purpose of this processing activity?',
    guidance: 'Describe the specific, explicit and legitimate purpose',
    riskIndicators: [],
    required: true,
  },
  {
    id: 'necessity',
    category: 'Necessity',
    question: 'Is this processing necessary for the stated purpose?',
    guidance: 'Could the purpose be achieved with less data or different means?',
    riskIndicators: ['excessive data collection', 'alternative methods available'],
    required: true,
  },
  {
    id: 'proportionality',
    category: 'Proportionality',
    question: 'Is the processing proportionate to the purpose?',
    guidance: 'Does the benefit justify the privacy impact?',
    riskIndicators: ['disproportionate impact', 'vulnerable groups affected'],
    required: true,
  },
  {
    id: 'data_minimization',
    category: 'Data Minimization',
    question: 'Are you only collecting data that is strictly necessary?',
    guidance: 'List all data fields and justify each one',
    riskIndicators: ['unnecessary fields', 'excessive retention'],
    required: true,
  },
  {
    id: 'special_categories',
    category: 'Special Categories',
    question: 'Does this involve special category data or children?',
    guidance: 'Special categories include health, biometrics, religious beliefs',
    riskIndicators: ['children under 13', 'health data', 'biometric data'],
    required: true,
  },
  {
    id: 'automated_decisions',
    category: 'Automated Decisions',
    question: 'Are automated decisions made with legal or significant effects?',
    guidance: 'Consider profiling, AI recommendations, access decisions',
    riskIndicators: ['no human review', 'significant impact', 'opaque algorithms'],
    required: true,
  },
  {
    id: 'cross_border',
    category: 'Cross-Border',
    question: 'Is data transferred outside the EEA?',
    guidance: 'Include cloud services, support centers, subprocessors',
    riskIndicators: ['non-adequate countries', 'no SCCs', 'uncertain legal framework'],
    required: true,
  },
  {
    id: 'data_subjects_rights',
    category: 'Data Subject Rights',
    question: 'How will data subjects exercise their rights?',
    guidance: 'Describe processes for access, deletion, portability requests',
    riskIndicators: ['no clear process', 'excessive barriers'],
    required: true,
  },
  {
    id: 'security_measures',
    category: 'Security',
    question: 'What security measures protect this data?',
    guidance: 'Include encryption, access controls, monitoring',
    riskIndicators: ['no encryption', 'weak access controls', 'no monitoring'],
    required: true,
  },
  {
    id: 'breach_response',
    category: 'Breach Response',
    question: 'What is the breach response plan?',
    guidance: 'Describe detection, notification, remediation procedures',
    riskIndicators: ['no detection capability', 'unclear notification process'],
    required: true,
  },
];

/**
 * Score DPIA responses and identify risks
 */
export function scoreDpiaResponses(
  responses: Record<string, { answer: string; mitigations?: string[] }>
): {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNACCEPTABLE';
  score: number;
  riskFactors: string[];
  requiredMitigations: string[];
  canProceed: boolean;
} {
  let riskScore = 0;
  const riskFactors: string[] = [];
  const requiredMitigations: string[] = [];

  // Score each question
  for (const q of DPIA_QUESTIONS) {
    const response = responses[q.id];
    if (!response) {
      riskScore += 10;
      riskFactors.push(`Missing response: ${q.category}`);
      continue;
    }

    // Check for risk indicators in answer
    for (const indicator of q.riskIndicators) {
      if (response.answer.toLowerCase().includes(indicator.toLowerCase())) {
        riskScore += 5;
        riskFactors.push(`${q.category}: ${indicator}`);
      }
    }

    // Reduce score if mitigations provided
    if (response.mitigations && response.mitigations.length > 0) {
      riskScore -= Math.min(response.mitigations.length * 2, 8);
    }
  }

  // Determine risk level
  let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNACCEPTABLE';
  if (riskScore <= 10) {
    overallRisk = 'LOW';
  } else if (riskScore <= 30) {
    overallRisk = 'MEDIUM';
  } else if (riskScore <= 50) {
    overallRisk = 'HIGH';
    requiredMitigations.push('Implement additional technical safeguards');
    requiredMitigations.push('Conduct regular security reviews');
  } else {
    overallRisk = 'UNACCEPTABLE';
    requiredMitigations.push('Fundamentally redesign the processing activity');
    requiredMitigations.push('Consult with supervisory authority before proceeding');
  }

  return {
    overallRisk,
    score: Math.max(0, 100 - riskScore),
    riskFactors,
    requiredMitigations,
    canProceed: overallRisk !== 'UNACCEPTABLE',
  };
}

/* ==========================================================================
   Cross-Border Transfer Validation
   ========================================================================== */

export interface TransferAssessment {
  sourceJurisdiction: string;
  destinationJurisdiction: string;
  dataCategories: DataCategory[];
  hasAdequacy: boolean;
  requiresSCC: boolean;
  requiresConsent: boolean;
  additionalSafeguards: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  canTransfer: boolean;
  blockers: string[];
}

// EU Adequacy decisions (as of 2024)
const ADEQUACY_DECISIONS = [
  'AD', 'AR', 'CA', 'FO', 'GG', 'IL', 'IM', 'JP', 'JE', 'NZ',
  'KR', 'CH', 'GB', 'UY', 'US', // US has partial adequacy via DPF
];

/**
 * Assess cross-border data transfer requirements
 */
export function assessCrossBorderTransfer(params: {
  sourceCountry: string;
  destinationCountry: string;
  dataCategories: DataCategory[];
  hasConsent: boolean;
  hasSCC: boolean;
  subjectAge?: number;
}): TransferAssessment {
  const blockers: string[] = [];
  const additionalSafeguards: string[] = [];

  // Same country = no issue
  if (params.sourceCountry === params.destinationCountry) {
    return {
      sourceJurisdiction: params.sourceCountry,
      destinationJurisdiction: params.destinationCountry,
      dataCategories: params.dataCategories,
      hasAdequacy: true,
      requiresSCC: false,
      requiresConsent: false,
      additionalSafeguards: [],
      riskLevel: 'LOW',
      canTransfer: true,
      blockers: [],
    };
  }

  // Check adequacy
  const hasAdequacy = ADEQUACY_DECISIONS.includes(params.destinationCountry);

  // Determine requirements
  let requiresSCC = !hasAdequacy;
  let requiresConsent = false;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

  // Special handling for US (partial adequacy via DPF)
  if (params.destinationCountry === 'US') {
    additionalSafeguards.push('Verify recipient participates in EU-US Data Privacy Framework');
    riskLevel = 'MEDIUM';
  }

  // Check for sensitive data
  const sensitiveCategories: DataCategory[] = ['PAYMENT', 'BEHAVIORAL', 'AI_INTERACTIONS'];
  const hasSensitive = params.dataCategories.some((c) => sensitiveCategories.includes(c));

  if (hasSensitive) {
    requiresConsent = true;
    riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
    additionalSafeguards.push('Implement supplementary technical measures');
    additionalSafeguards.push('Conduct Transfer Impact Assessment');
  }

  // Check for children's data
  if (params.subjectAge !== undefined && params.subjectAge < 18) {
    requiresConsent = true;
    additionalSafeguards.push('Obtain verifiable parental consent');
    riskLevel = 'HIGH';
  }

  // Non-adequate country without SCC
  if (!hasAdequacy && !params.hasSCC) {
    blockers.push('Standard Contractual Clauses (SCCs) required but not in place');
  }

  // Consent required but not obtained
  if (requiresConsent && !params.hasConsent) {
    blockers.push('Explicit consent required for this transfer');
  }

  return {
    sourceJurisdiction: params.sourceCountry,
    destinationJurisdiction: params.destinationCountry,
    dataCategories: params.dataCategories,
    hasAdequacy,
    requiresSCC,
    requiresConsent,
    additionalSafeguards,
    riskLevel,
    canTransfer: blockers.length === 0,
    blockers,
  };
}

/* ==========================================================================
   Fastify Middleware
   ========================================================================== */

/**
 * Middleware to attach compliance context to requests
 */
export async function complianceMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const country = extractCountryFromHeader(request);
  const frameworks = detectFrameworks(country);

  // Attach compliance context
  (request as any).complianceContext = {
    country,
    frameworks,
    requiresParentalConsent: frameworks.includes('COPPA'),
    dsrDeadlineDays: calculateDeadline(frameworks),
  };
}

function extractCountryFromHeader(request: FastifyRequest): string {
  return (
    (request.headers['cf-ipcountry'] as string) ||
    (request.headers['x-country'] as string) ||
    'US'
  );
}

function detectFrameworks(country: string): string[] {
  const frameworks: string[] = [];

  // EU countries
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ];

  if (euCountries.includes(country)) {
    frameworks.push('GDPR');
  }

  if (country === 'US') {
    frameworks.push('COPPA');
    frameworks.push('FERPA');
  }

  if (country === 'BR') {
    frameworks.push('LGPD');
  }

  if (country === 'CA') {
    frameworks.push('PIPEDA');
  }

  return frameworks;
}

function calculateDeadline(frameworks: string[]): number {
  if (frameworks.includes('LGPD')) return 15;
  if (frameworks.includes('CCPA')) return 45;
  return 30; // GDPR default
}

/* ==========================================================================
   Exports
   ========================================================================== */

export default {
  // DSR
  calculateDsrDueDate,
  getDataExportSchema,
  validateDsrRequest,

  // Breach
  assessBreachSeverity,
  generateAuthorityNotification,

  // ROPA
  validateProcessingActivity,
  generateRopaExport,

  // DPIA
  DPIA_QUESTIONS,
  scoreDpiaResponses,

  // Cross-border
  assessCrossBorderTransfer,

  // Middleware
  complianceMiddleware,
};
