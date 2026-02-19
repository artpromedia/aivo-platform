/**
 * Breach Notification Service
 *
 * Handles data breach detection, assessment, notification, and remediation
 * in compliance with GDPR Art. 33-34, LGPD, CCPA, and other regulations.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export type BreachSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BreachStatus =
  | 'DETECTED'
  | 'ASSESSING'
  | 'CONTAINED'
  | 'NOTIFYING_AUTHORITY'
  | 'NOTIFYING_SUBJECTS'
  | 'REMEDIATING'
  | 'CLOSED';

export type BreachType =
  | 'CONFIDENTIALITY' // Unauthorized disclosure
  | 'INTEGRITY' // Unauthorized modification
  | 'AVAILABILITY' // Loss of access
  | 'MIXED';

export interface DataBreach {
  id: string;
  tenantId: string;

  // Breach identification
  title: string;
  description: string;
  type: BreachType;
  severity: BreachSeverity;
  status: BreachStatus;

  // Timeline
  occurredAt?: Date;
  discoveredAt: Date;
  containedAt?: Date;
  reportedToAuthorityAt?: Date;
  subjectsNotifiedAt?: Date;
  closedAt?: Date;

  // Impact
  affectedSystems: string[];
  affectedDataCategories: string[];
  affectedSubjectCount: number;
  affectedSubjectTypes: ('LEARNER' | 'PARENT' | 'TEACHER' | 'ADMIN')[];
  affectedRegions: string[];
  wasEncrypted: boolean;
  wasExfiltrated: boolean;
  wasExploited: boolean;

  // Risk assessment
  riskToSubjects: string;
  riskLevel: 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'CERTAIN';
  potentialHarm: string[];

  // Authority notification
  notifyAuthority: boolean;
  authorityNotificationDeadline?: Date;
  authorityReference?: string;
  authorityJurisdictions: string[];

  // Subject notification
  notifySubjects: boolean;
  subjectNotificationMethod?: 'EMAIL' | 'PORTAL' | 'BOTH';
  subjectNotificationTemplate?: string;

  // Remediation
  containmentMeasures: string;
  remediationPlan: string;
  preventionMeasures: string;
  lessonsLearned?: string;

  // Audit
  reportedBy: string;
  assignedTo?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreachNotification {
  id: string;
  breachId: string;
  tenantId: string;

  // Recipient
  recipientType: 'AUTHORITY' | 'SUBJECT';
  recipientId?: string;
  recipientEmail?: string;
  recipientJurisdiction?: string;

  // Content
  templateId: string;
  subject: string;
  content: string;
  attachments?: string[];

  // Delivery
  scheduledAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface BreachAssessment {
  breachId: string;
  assessedAt: Date;
  assessedBy: string;

  // Severity calculation
  severityFactors: SeverityFactor[];
  calculatedSeverity: BreachSeverity;

  // Notification requirements
  authorityNotificationRequired: boolean;
  authorityDeadlineHours: number;
  subjectNotificationRequired: boolean;
  subjectNotificationThreshold: string;

  // Regulatory requirements by jurisdiction
  jurisdictionRequirements: JurisdictionRequirement[];

  // Recommendations
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
}

export interface SeverityFactor {
  factor: string;
  weight: number;
  score: number;
  notes?: string;
}

export interface JurisdictionRequirement {
  jurisdiction: string;
  regulation: string;
  authorityName: string;
  authorityContact: string;
  notificationDeadlineHours: number;
  subjectNotificationRequired: boolean;
  specificRequirements: string[];
}

/* ==========================================================================
   Jurisdiction Requirements Database
   ========================================================================== */

const JURISDICTION_REQUIREMENTS: Record<string, JurisdictionRequirement> = {
  // GDPR (EU)
  EU: {
    jurisdiction: 'EU',
    regulation: 'GDPR',
    authorityName: 'Lead Supervisory Authority',
    authorityContact: 'Based on main establishment',
    notificationDeadlineHours: 72,
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify without undue delay',
      'Include nature of breach',
      'Include approximate number of subjects',
      'Include categories of data',
      'Include DPO contact',
      'Include likely consequences',
      'Include measures taken',
    ],
  },

  // UK
  GB: {
    jurisdiction: 'GB',
    regulation: 'UK GDPR',
    authorityName: 'Information Commissioner\'s Office (ICO)',
    authorityContact: 'https://ico.org.uk/make-a-complaint/data-protection-complaints/',
    notificationDeadlineHours: 72,
    subjectNotificationRequired: true,
    specificRequirements: [
      'Use ICO online reporting tool',
      'Include same information as GDPR',
    ],
  },

  // US - Federal
  US: {
    jurisdiction: 'US',
    regulation: 'Various (FERPA, COPPA, State laws)',
    authorityName: 'FTC, HHS, State AGs',
    authorityContact: 'Varies by regulation',
    notificationDeadlineHours: 72, // Most restrictive state law
    subjectNotificationRequired: true,
    specificRequirements: [
      'FERPA: Notify affected educational records',
      'COPPA: Notify parents of children\'s data',
      'Check state breach notification laws',
      'California: 72 hours if 500+ residents',
    ],
  },

  // California
  'US-CA': {
    jurisdiction: 'US-CA',
    regulation: 'CCPA/CPRA',
    authorityName: 'California Attorney General',
    authorityContact: 'https://oag.ca.gov/privacy/databreach/reporting',
    notificationDeadlineHours: 72,
    subjectNotificationRequired: true,
    specificRequirements: [
      'Submit sample notification letter',
      'Include types of information',
      'Notify AG if 500+ CA residents',
    ],
  },

  // Brazil
  BR: {
    jurisdiction: 'BR',
    regulation: 'LGPD',
    authorityName: 'ANPD (Autoridade Nacional de Proteção de Dados)',
    authorityContact: 'https://www.gov.br/anpd',
    notificationDeadlineHours: 48, // "Reasonable time" interpreted as 48h
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify within reasonable time',
      'Include nature of affected data',
      'Include technical and security measures',
      'Include risks and mitigation',
    ],
  },

  // Canada
  CA: {
    jurisdiction: 'CA',
    regulation: 'PIPEDA/CPPA',
    authorityName: 'Office of the Privacy Commissioner',
    authorityContact: 'https://www.priv.gc.ca/en/report-a-concern/',
    notificationDeadlineHours: 0, // "As soon as feasible"
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify OPC as soon as feasible',
      'Keep records of all breaches for 24 months',
      'Notify if real risk of significant harm',
    ],
  },

  // Australia
  AU: {
    jurisdiction: 'AU',
    regulation: 'Privacy Act (NDB scheme)',
    authorityName: 'OAIC (Office of the Australian Information Commissioner)',
    authorityContact: 'https://www.oaic.gov.au/privacy/notifiable-data-breaches/',
    notificationDeadlineHours: 720, // 30 days for assessment, then ASAP
    subjectNotificationRequired: true,
    specificRequirements: [
      'Assess within 30 days',
      'Notify OAIC and individuals ASAP after assessment',
      'Include kinds of information',
      'Include recommended steps for individuals',
    ],
  },

  // India
  IN: {
    jurisdiction: 'IN',
    regulation: 'DPDP Act 2023',
    authorityName: 'Data Protection Board of India',
    authorityContact: 'TBD - Board being established',
    notificationDeadlineHours: 72,
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify Board without delay',
      'Notify affected Data Principals',
    ],
  },

  // South Africa
  ZA: {
    jurisdiction: 'ZA',
    regulation: 'POPIA',
    authorityName: 'Information Regulator',
    authorityContact: 'https://www.justice.gov.za/inforeg/',
    notificationDeadlineHours: 0, // "As soon as reasonably possible"
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify as soon as reasonably possible',
      'Include identity and contact of responsible party',
      'Include description of possible consequences',
    ],
  },

  // Nigeria
  NG: {
    jurisdiction: 'NG',
    regulation: 'NDPR',
    authorityName: 'NITDA',
    authorityContact: 'https://nitda.gov.ng/',
    notificationDeadlineHours: 72,
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify within 72 hours',
      'Provide breach details and mitigation',
    ],
  },

  // Kenya
  KE: {
    jurisdiction: 'KE',
    regulation: 'Data Protection Act 2019',
    authorityName: 'ODPC',
    authorityContact: 'https://www.odpc.go.ke/',
    notificationDeadlineHours: 72,
    subjectNotificationRequired: true,
    specificRequirements: [
      'Notify Commissioner within 72 hours',
      'Notify data subjects if high risk',
    ],
  },
};

/**
 * Get jurisdiction requirements for affected regions
 */
export function getJurisdictionRequirements(regions: string[]): JurisdictionRequirement[] {
  const requirements: JurisdictionRequirement[] = [];

  for (const region of regions) {
    // Check direct match
    if (JURISDICTION_REQUIREMENTS[region]) {
      requirements.push(JURISDICTION_REQUIREMENTS[region]);
      continue;
    }

    // Check EU membership
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ];
    if (euCountries.includes(region)) {
      requirements.push(JURISDICTION_REQUIREMENTS['EU']);
    }
  }

  // Deduplicate by jurisdiction
  return requirements.filter(
    (req, index, self) => self.findIndex((r) => r.jurisdiction === req.jurisdiction) === index
  );
}

/* ==========================================================================
   Severity Assessment
   ========================================================================== */

const SEVERITY_FACTORS: {
  id: string;
  name: string;
  weight: number;
  evaluator: (breach: Partial<DataBreach>) => number;
}[] = [
  {
    id: 'subject_count',
    name: 'Number of affected subjects',
    weight: 20,
    evaluator: (b) => {
      const count = b.affectedSubjectCount || 0;
      if (count > 10000) return 100;
      if (count > 1000) return 75;
      if (count > 100) return 50;
      if (count > 10) return 25;
      return 10;
    },
  },
  {
    id: 'data_sensitivity',
    name: 'Sensitivity of data categories',
    weight: 25,
    evaluator: (b) => {
      const categories = b.affectedDataCategories || [];
      const sensitive = ['PAYMENT', 'IDENTITY', 'BEHAVIORAL', 'AI_INTERACTIONS', 'HEALTH'];
      const sensitiveCount = categories.filter((c) => sensitive.includes(c)).length;
      return Math.min(100, sensitiveCount * 25);
    },
  },
  {
    id: 'vulnerable_subjects',
    name: 'Vulnerable subjects affected',
    weight: 20,
    evaluator: (b) => {
      const types = b.affectedSubjectTypes || [];
      if (types.includes('LEARNER')) return 100; // Children
      return 25;
    },
  },
  {
    id: 'encryption_status',
    name: 'Data encryption status',
    weight: 15,
    evaluator: (b) => (b.wasEncrypted ? 20 : 100),
  },
  {
    id: 'exfiltration',
    name: 'Data exfiltration confirmed',
    weight: 15,
    evaluator: (b) => (b.wasExfiltrated ? 100 : 20),
  },
  {
    id: 'exploitation',
    name: 'Evidence of exploitation',
    weight: 5,
    evaluator: (b) => (b.wasExploited ? 100 : 0),
  },
];

/**
 * Calculate breach severity based on multiple factors
 */
export function calculateSeverity(breach: Partial<DataBreach>): {
  severity: BreachSeverity;
  score: number;
  factors: SeverityFactor[];
} {
  const factors: SeverityFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const factor of SEVERITY_FACTORS) {
    const score = factor.evaluator(breach);
    factors.push({
      factor: factor.name,
      weight: factor.weight,
      score,
    });
    totalScore += score * factor.weight;
    totalWeight += factor.weight;
  }

  const normalizedScore = totalScore / totalWeight;

  let severity: BreachSeverity;
  if (normalizedScore >= 80) {
    severity = 'CRITICAL';
  } else if (normalizedScore >= 60) {
    severity = 'HIGH';
  } else if (normalizedScore >= 40) {
    severity = 'MEDIUM';
  } else {
    severity = 'LOW';
  }

  return { severity, score: normalizedScore, factors };
}

/* ==========================================================================
   Notification Templates
   ========================================================================== */

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'AUTHORITY' | 'SUBJECT';
  language: string;
  subject: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'authority-gdpr-en',
    name: 'GDPR Authority Notification (English)',
    type: 'AUTHORITY',
    language: 'en',
    subject: 'Data Breach Notification - {{breachId}}',
    body: `
DATA BREACH NOTIFICATION
Article 33 GDPR

1. CONTROLLER DETAILS
Organization: {{organizationName}}
Contact: {{dpoName}}, {{dpoEmail}}
Reference: {{breachId}}

2. BREACH DESCRIPTION
Date/Time Discovered: {{discoveredAt}}
Date/Time Occurred: {{occurredAt}}
Nature of Breach: {{breachType}}
Description: {{description}}

3. DATA CATEGORIES AFFECTED
{{#each affectedDataCategories}}
- {{this}}
{{/each}}

4. DATA SUBJECTS
Approximate Number: {{affectedSubjectCount}}
Categories: {{#each affectedSubjectTypes}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

5. LIKELY CONSEQUENCES
{{riskToSubjects}}

6. MEASURES TAKEN
Containment: {{containmentMeasures}}
Remediation: {{remediationPlan}}
Prevention: {{preventionMeasures}}

7. COMMUNICATION TO DATA SUBJECTS
{{#if notifySubjects}}
Data subjects will be notified via {{subjectNotificationMethod}}.
{{else}}
Data subject notification not required as risk to rights and freedoms is not high.
{{/if}}

Submitted: {{submittedAt}}
    `.trim(),
  },
  {
    id: 'subject-breach-en',
    name: 'Data Subject Breach Notification (English)',
    type: 'SUBJECT',
    language: 'en',
    subject: 'Important Notice About Your Data',
    body: `
Dear {{recipientName}},

We are writing to inform you of a data security incident that may have affected your personal information.

WHAT HAPPENED
{{description}}

WHAT INFORMATION WAS INVOLVED
{{#each affectedDataCategories}}
- {{this}}
{{/each}}

WHAT WE ARE DOING
{{remediationPlan}}

WHAT YOU CAN DO
{{#each recommendedActions}}
- {{this}}
{{/each}}

FOR MORE INFORMATION
If you have questions, please contact our Data Protection Officer at {{dpoEmail}}.

We sincerely apologize for any concern this may cause.

{{organizationName}}
    `.trim(),
  },
  {
    id: 'subject-breach-es',
    name: 'Notificación de Violación de Datos (Spanish)',
    type: 'SUBJECT',
    language: 'es',
    subject: 'Aviso Importante Sobre Sus Datos',
    body: `
Estimado/a {{recipientName}},

Le escribimos para informarle sobre un incidente de seguridad de datos que puede haber afectado su información personal.

QUÉ OCURRIÓ
{{description}}

QUÉ INFORMACIÓN ESTUVO INVOLUCRADA
{{#each affectedDataCategories}}
- {{this}}
{{/each}}

QUÉ ESTAMOS HACIENDO
{{remediationPlan}}

QUÉ PUEDE HACER USTED
{{#each recommendedActions}}
- {{this}}
{{/each}}

PARA MÁS INFORMACIÓN
Si tiene preguntas, comuníquese con nuestro Oficial de Protección de Datos en {{dpoEmail}}.

Nos disculpamos sinceramente por cualquier preocupación que esto pueda causar.

{{organizationName}}
    `.trim(),
  },
];

/**
 * Get notification template by criteria
 */
export function getNotificationTemplate(
  type: 'AUTHORITY' | 'SUBJECT',
  language: string
): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES.find(
    (t) => t.type === type && t.language === language
  ) || NOTIFICATION_TEMPLATES.find(
    (t) => t.type === type && t.language === 'en'
  );
}

/**
 * Render notification template with data
 */
export function renderTemplate(
  template: NotificationTemplate,
  data: Record<string, unknown>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Simple template rendering (in production, use Handlebars or similar)
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    // Handle different value types - objects need JSON stringification
    const stringValue = typeof value === 'object' && value !== null 
      ? JSON.stringify(value) 
      : String(value as string | number | boolean);
    subject = subject.replace(placeholder, stringValue);
    body = body.replace(placeholder, stringValue);
  }

  // Handle arrays (simple implementation)
  body = body.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, arrayName, itemTemplate) => {
    const array = data[arrayName] as unknown[];
    if (!Array.isArray(array)) return '';
    return array.map((item, index) => {
      let rendered = itemTemplate;
      // Handle object items with JSON stringify, primitives with String()
      const itemString = typeof item === 'object' && item !== null
        ? JSON.stringify(item)
        : String(item as string | number | boolean);
      rendered = rendered.replace(/{{this}}/g, itemString);
      rendered = rendered.replace(/{{@last}}/g, String(index === array.length - 1));
      return rendered;
    }).join('');
  });

  // Handle conditionals
  body = body.replace(/{{#if (\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, (_, condition, ifContent, elseContent) => {
    return data[condition] ? ifContent : elseContent;
  });
  body = body.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, condition, content) => {
    return data[condition] ? content : '';
  });
  body = body.replace(/{{#unless @last}}, {{\/unless}}/g, '');

  return { subject, body };
}

/* ==========================================================================
   Breach Assessment Service
   ========================================================================== */

/**
 * Perform comprehensive breach assessment
 */
export function assessBreach(breach: DataBreach): BreachAssessment {
  const { severity, score: _score, factors } = calculateSeverity(breach);
  const jurisdictionRequirements = getJurisdictionRequirements(breach.affectedRegions);

  // Determine notification requirements
  const authorityNotificationRequired = severity !== 'LOW' || breach.affectedSubjectCount > 100;
  const subjectNotificationRequired = severity === 'HIGH' || severity === 'CRITICAL' || !breach.wasEncrypted;

  // Get most restrictive deadline
  const authorityDeadlineHours = jurisdictionRequirements.reduce(
    (min, req) => req.notificationDeadlineHours > 0 ? Math.min(min, req.notificationDeadlineHours) : min,
    72
  );

  // Generate action recommendations
  const immediateActions: string[] = [
    'Contain the breach to prevent further data loss',
    'Preserve evidence for investigation',
    'Assess scope and impact',
  ];

  const shortTermActions: string[] = [
    'Complete detailed investigation',
    'Prepare authority notification if required',
    'Prepare subject notifications if required',
    'Implement immediate security patches',
  ];

  const longTermActions: string[] = [
    'Conduct root cause analysis',
    'Update security policies and procedures',
    'Provide additional staff training',
    'Review and update incident response plan',
  ];

  if (severity === 'CRITICAL' || severity === 'HIGH') {
    immediateActions.push('Activate incident response team');
    immediateActions.push('Brief senior management and legal');
    shortTermActions.push('Engage external forensics if needed');
    shortTermActions.push('Consider credit monitoring for affected subjects');
  }

  return {
    breachId: breach.id,
    assessedAt: new Date(),
    assessedBy: 'SYSTEM',
    severityFactors: factors,
    calculatedSeverity: severity,
    authorityNotificationRequired,
    authorityDeadlineHours,
    subjectNotificationRequired,
    subjectNotificationThreshold: 'High risk to rights and freedoms',
    jurisdictionRequirements,
    immediateActions,
    shortTermActions,
    longTermActions,
  };
}

/* ==========================================================================
   Fastify Routes
   ========================================================================== */

export async function breachRoutes(fastify: FastifyInstance): Promise<void> {
  // Create breach report
  fastify.post('/breaches', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const tenantId = (request as any).tenantId || 'default';
    const userId = (request as any).userId;

    // Calculate severity from input
    const breachInput = {
      title: body.title as string,
      description: body.description as string,
      type: (body.type as BreachType) || 'CONFIDENTIALITY',
      affectedSystems: (body.affectedSystems as string[]) || [],
      affectedDataCategories: (body.affectedDataCategories as string[]) || [],
      affectedSubjectCount: (body.affectedSubjectCount as number) || 0,
      affectedSubjectTypes: (body.affectedSubjectTypes as any[]) || [],
      affectedRegions: (body.affectedRegions as string[]) || [],
      wasEncrypted: (body.wasEncrypted as boolean) || false,
      wasExfiltrated: (body.wasExfiltrated as boolean) || false,
      wasExploited: (body.wasExploited as boolean) || false,
      riskToSubjects: (body.riskToSubjects as string) || '',
      potentialHarm: (body.potentialHarm as string[]) || [],
      containmentMeasures: (body.containmentMeasures as string) || '',
      remediationPlan: (body.remediationPlan as string) || '',
      preventionMeasures: (body.preventionMeasures as string) || '',
    };

    // Calculate severity
    const { severity } = calculateSeverity(breachInput as any);

    // Perform assessment for notification requirements
    const tempBreach = {
      ...breachInput,
      severity,
      status: 'DETECTED' as const,
      discoveredAt: new Date(),
      notifyAuthority: false,
      authorityJurisdictions: [] as string[],
      notifySubjects: false,
      riskLevel: 'POSSIBLE' as const,
    };
    const assessment = assessBreach(tempBreach as any);

    // Import prisma client
    const { prisma } = await import('../prisma.js');

    // Create breach record in database
    const breach = await prisma.dataBreach.create({
      data: {
        tenantId,
        title: breachInput.title,
        description: breachInput.description,
        severity: severity as any,
        status: 'DETECTED',
        detectedAt: new Date(),
        occurredAt: body.occurredAt ? new Date(body.occurredAt as string) : null,
        affectedDataTypes: breachInput.affectedDataCategories,
        affectedRecordsCount: breachInput.affectedSubjectCount,
        affectedUsersCount: breachInput.affectedSubjectCount,
        affectedUserCategories: breachInput.affectedSubjectTypes,
        rootCause: body.rootCause as string || null,
        attackVector: body.attackVector as string || null,
        impactDescription: breachInput.riskToSubjects,
        notifyAuthority: assessment.authorityNotificationRequired,
        authorityNotificationDeadline: assessment.authorityNotificationRequired 
          ? new Date(Date.now() + assessment.authorityDeadlineHours * 60 * 60 * 1000)
          : null,
        authorityJurisdictions: assessment.jurisdictionRequirements.map((r) => r.jurisdiction),
        notifySubjects: assessment.subjectNotificationRequired,
        remediationSteps: breachInput.remediationPlan ? [breachInput.remediationPlan] : [],
        reportedByUserId: userId || null,
      },
    });

    // Create audit log entry
    await prisma.breachAuditLog.create({
      data: {
        breachId: breach.id,
        tenantId,
        action: 'CREATED',
        performedBy: userId || null,
        newValue: { title: breach.title, severity: breach.severity },
      },
    });

    reply.status(201).send({
      breach: {
        id: breach.id,
        tenantId: breach.tenantId,
        title: breach.title,
        description: breach.description,
        severity: breach.severity,
        status: breach.status,
        detectedAt: breach.detectedAt,
        notifyAuthority: breach.notifyAuthority,
        authorityNotificationDeadline: breach.authorityNotificationDeadline,
        authorityJurisdictions: breach.authorityJurisdictions,
        notifySubjects: breach.notifySubjects,
        createdAt: breach.createdAt,
      },
      assessment,
    });
  });

  // List breaches with pagination
  fastify.get('/breaches', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const tenantId = (request as any).tenantId || 'default';
    
    const page = parseInt(query.page as string) || 1;
    const limit = Math.min(parseInt(query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = query.status as string;
    const severity = query.severity as string;

    const { prisma } = await import('../prisma.js');

    const where: any = { tenantId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [breaches, total] = await Promise.all([
      prisma.dataBreach.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          detectedAt: true,
          affectedRecordsCount: true,
          notifyAuthority: true,
          authorityNotificationDeadline: true,
          notifySubjects: true,
          createdAt: true,
        },
      }),
      prisma.dataBreach.count({ where }),
    ]);

    reply.send({
      breaches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Get single breach by ID
  fastify.get('/breaches/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request as any).tenantId || 'default';

    const { prisma } = await import('../prisma.js');

    const breach = await prisma.dataBreach.findFirst({
      where: { id, tenantId },
      include: {
        notifications: {
          select: {
            id: true,
            notificationType: true,
            recipientType: true,
            status: true,
            sentAt: true,
            createdAt: true,
          },
        },
        auditLog: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!breach) {
      return reply.status(404).send({ error: 'Breach not found' });
    }

    return reply.send(breach);
  });

  // Get breach assessment
  fastify.get('/breaches/:id/assessment', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request as any).tenantId || 'default';

    const { prisma } = await import('../prisma.js');

    const breach = await prisma.dataBreach.findFirst({
      where: { id, tenantId },
    });

    if (!breach) {
      return reply.status(404).send({ error: 'Breach not found' });
    }

    // Build breach object for assessment
    const breachForAssessment = {
      affectedSubjectCount: breach.affectedUsersCount || 0,
      affectedDataCategories: breach.affectedDataTypes as string[] || [],
      affectedRegions: breach.authorityJurisdictions as string[] || [],
      wasEncrypted: false,
      wasExfiltrated: false,
      wasExploited: false,
    };

    const assessment = assessBreach(breachForAssessment as any);

    return reply.send({
      breachId: breach.id,
      severity: breach.severity,
      status: breach.status,
      assessment,
    });
  });

  // Generate notification
  fastify.post('/breaches/:id/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const tenantId = (request as any).tenantId || 'default';
    const userId = (request as any).userId;

    const type = body.type as 'AUTHORITY' | 'SUBJECT';
    const language = (body.language as string) || 'en';
    const recipientType = body.recipientType as string || (type === 'AUTHORITY' ? 'AUTHORITY' : 'INDIVIDUAL');
    const recipientEmail = body.recipientEmail as string || null;
    const recipientName = body.recipientName as string || null;
    const jurisdiction = body.jurisdiction as string || null;

    const template = getNotificationTemplate(type, language);
    if (!template) {
      return reply.status(400).send({ error: 'Template not found' });
    }

    const { prisma } = await import('../prisma.js');

    // Fetch breach from database
    const breach = await prisma.dataBreach.findFirst({
      where: { id, tenantId },
    });

    if (!breach) {
      return reply.status(404).send({ error: 'Breach not found' });
    }

    // Render template with breach data
    const renderedContent = template.body
      .replace(/\{\{breachTitle\}\}/g, breach.title)
      .replace(/\{\{breachDescription\}\}/g, breach.description || '')
      .replace(/\{\{detectedAt\}\}/g, breach.detectedAt?.toISOString() || '')
      .replace(/\{\{affectedRecordsCount\}\}/g, String(breach.affectedRecordsCount || 0))
      .replace(/\{\{organizationName\}\}/g, 'AIVO Learning Platform')
      .replace(/\{\{contactEmail\}\}/g, 'privacy@aivo.edu');

    // Create notification record
    const notification = await prisma.breachNotification.create({
      data: {
        breachId: breach.id,
        tenantId,
        recipientType,
        recipientEmail,
        recipientName,
        notificationType: type,
        templateId: template.id,
        subject: template.subject.replace(/\{\{breachTitle\}\}/g, breach.title),
        body: renderedContent,
        status: 'PENDING',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : null,
      },
    });

    // Create audit log entry
    await prisma.breachAuditLog.create({
      data: {
        breachId: breach.id,
        tenantId,
        action: 'NOTIFICATION_CREATED',
        performedBy: userId || null,
        newValue: { notificationId: notification.id, type, recipientType },
      },
    });

    return reply.status(201).send({
      id: notification.id,
      breachId: notification.breachId,
      templateId: notification.templateId,
      type: notification.notificationType,
      language,
      recipientType: notification.recipientType,
      recipientEmail: notification.recipientEmail,
      status: notification.status,
      subject: notification.subject,
      createdAt: notification.createdAt,
    });
  });

  // Get jurisdiction requirements
  fastify.get('/jurisdictions/:code/requirements', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };

    const requirements = getJurisdictionRequirements([code]);
    if (requirements.length === 0) {
      return reply.status(404).send({ error: 'Jurisdiction not found' });
    }

    return reply.send(requirements[0]);
  });

  // List all jurisdiction requirements
  fastify.get('/jurisdictions', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send(Object.values(JURISDICTION_REQUIREMENTS));
  });
}

/* ==========================================================================
   Exports
   ========================================================================== */

export const BreachNotificationService = {
  getJurisdictionRequirements,
  calculateSeverity,
  getNotificationTemplate,
  renderTemplate,
  assessBreach,
  breachRoutes,
};

export default BreachNotificationService;
