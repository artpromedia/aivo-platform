/**
 * Cross-Border Data Transfer Validator
 *
 * Validates and enforces data transfer rules across international boundaries.
 * Implements GDPR Chapter V, LGPD Chapter V, and other regional requirements.
 */

import type { FastifyRequest } from 'fastify';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export interface TransferRequest {
  id: string;
  tenantId: string;

  // Transfer details
  sourceRegion: string;
  destinationRegion: string;
  dataClassification: DataClassification;
  dataCategories: string[];
  subjectCount: number;
  subjectAgeRange?: AgeRange;

  // Legal basis
  legalBasis: TransferLegalBasis;
  consentReference?: string;
  sccReference?: string;
  bcrReference?: string;
  adequacyDecision?: string;

  // Processing
  purpose: string;
  processorName?: string;
  recipientType: RecipientType;

  // Assessment
  assessedAt?: Date;
  assessedBy?: string;
  riskLevel?: RiskLevel;
  decision?: TransferDecision;
  conditions?: string[];
  blockers?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'SPECIAL_CATEGORY';

export type TransferLegalBasis =
  | 'ADEQUACY_DECISION'
  | 'STANDARD_CONTRACTUAL_CLAUSES'
  | 'BINDING_CORPORATE_RULES'
  | 'EXPLICIT_CONSENT'
  | 'CONTRACT_NECESSITY'
  | 'PUBLIC_INTEREST'
  | 'LEGAL_CLAIMS'
  | 'VITAL_INTERESTS'
  | 'PUBLIC_REGISTER';

export type RecipientType =
  | 'PROCESSOR'
  | 'JOINT_CONTROLLER'
  | 'INDEPENDENT_CONTROLLER'
  | 'SUBPROCESSOR';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TransferDecision =
  | 'APPROVED'
  | 'APPROVED_WITH_CONDITIONS'
  | 'REQUIRES_ADDITIONAL_SAFEGUARDS'
  | 'BLOCKED';

export interface AgeRange {
  minAge?: number;
  maxAge?: number;
  includesChildren: boolean;
}

/* ==========================================================================
   Adequacy Decisions Database
   ========================================================================== */

export interface AdequacyDecision {
  country: string;
  countryCode: string;
  decisionType: 'FULL' | 'PARTIAL' | 'SECTORAL';
  effectiveDate: Date;
  expiryDate?: Date;
  scope?: string;
  notes?: string;
}

const ADEQUACY_DECISIONS: AdequacyDecision[] = [
  // Full adequacy
  { country: 'Andorra', countryCode: 'AD', decisionType: 'FULL', effectiveDate: new Date('2010-10-21') },
  { country: 'Argentina', countryCode: 'AR', decisionType: 'FULL', effectiveDate: new Date('2003-06-30') },
  { country: 'Canada', countryCode: 'CA', decisionType: 'PARTIAL', effectiveDate: new Date('2001-12-20'), scope: 'Commercial organizations under PIPEDA' },
  { country: 'Faroe Islands', countryCode: 'FO', decisionType: 'FULL', effectiveDate: new Date('2010-03-05') },
  { country: 'Guernsey', countryCode: 'GG', decisionType: 'FULL', effectiveDate: new Date('2003-11-21') },
  { country: 'Israel', countryCode: 'IL', decisionType: 'FULL', effectiveDate: new Date('2011-01-31') },
  { country: 'Isle of Man', countryCode: 'IM', decisionType: 'FULL', effectiveDate: new Date('2004-04-28') },
  { country: 'Japan', countryCode: 'JP', decisionType: 'FULL', effectiveDate: new Date('2019-01-23') },
  { country: 'Jersey', countryCode: 'JE', decisionType: 'FULL', effectiveDate: new Date('2008-05-08') },
  { country: 'New Zealand', countryCode: 'NZ', decisionType: 'FULL', effectiveDate: new Date('2013-01-01') },
  { country: 'South Korea', countryCode: 'KR', decisionType: 'FULL', effectiveDate: new Date('2021-12-17') },
  { country: 'Switzerland', countryCode: 'CH', decisionType: 'FULL', effectiveDate: new Date('2000-08-26') },
  { country: 'United Kingdom', countryCode: 'GB', decisionType: 'FULL', effectiveDate: new Date('2021-06-28'), expiryDate: new Date('2025-06-27') },
  { country: 'Uruguay', countryCode: 'UY', decisionType: 'FULL', effectiveDate: new Date('2012-08-17') },

  // US - Partial (Data Privacy Framework)
  {
    country: 'United States',
    countryCode: 'US',
    decisionType: 'PARTIAL',
    effectiveDate: new Date('2023-07-10'),
    scope: 'Organizations certified under EU-US Data Privacy Framework',
    notes: 'Recipients must be DPF-certified',
  },
];

/**
 * Check if country has adequacy decision
 */
export function hasAdequacyDecision(countryCode: string): AdequacyDecision | null {
  const decision = ADEQUACY_DECISIONS.find((d) => d.countryCode === countryCode);
  if (!decision) return null;

  // Check expiry
  if (decision.expiryDate && decision.expiryDate < new Date()) {
    return null;
  }

  return decision;
}

/* ==========================================================================
   Regional Data Restrictions
   ========================================================================== */

export interface RegionalRestriction {
  region: string;
  countries: string[];
  restriction: RestrictionType;
  scope: string;
  legalBasis: string;
}

export type RestrictionType =
  | 'NO_TRANSFER'
  | 'TRANSFER_WITH_APPROVAL'
  | 'TRANSFER_WITH_SAFEGUARDS'
  | 'DATA_LOCALIZATION_REQUIRED';

const REGIONAL_RESTRICTIONS: RegionalRestriction[] = [
  // Russia - Data localization
  {
    region: 'Russia',
    countries: ['RU'],
    restriction: 'DATA_LOCALIZATION_REQUIRED',
    scope: 'Personal data of Russian citizens must be stored on servers in Russia',
    legalBasis: 'Federal Law No. 242-FZ',
  },
  // China - Cross-border restrictions
  {
    region: 'China',
    countries: ['CN'],
    restriction: 'TRANSFER_WITH_APPROVAL',
    scope: 'Critical data and large volumes require security assessment',
    legalBasis: 'Personal Information Protection Law (PIPL)',
  },
  // India - Draft localization
  {
    region: 'India',
    countries: ['IN'],
    restriction: 'TRANSFER_WITH_SAFEGUARDS',
    scope: 'Sensitive personal data requires explicit consent for transfer',
    legalBasis: 'Digital Personal Data Protection Act 2023',
  },
  // Vietnam - Localization
  {
    region: 'Vietnam',
    countries: ['VN'],
    restriction: 'DATA_LOCALIZATION_REQUIRED',
    scope: 'Important data must have a copy stored locally',
    legalBasis: 'Cybersecurity Law',
  },
  // Indonesia - Registration required
  {
    region: 'Indonesia',
    countries: ['ID'],
    restriction: 'TRANSFER_WITH_SAFEGUARDS',
    scope: 'Must coordinate with Ministry of Communication and Information',
    legalBasis: 'Government Regulation No. 71/2019',
  },
];

/**
 * Get regional restrictions for a country
 */
export function getRegionalRestrictions(countryCode: string): RegionalRestriction[] {
  return REGIONAL_RESTRICTIONS.filter((r) => r.countries.includes(countryCode));
}

/* ==========================================================================
   Transfer Impact Assessment
   ========================================================================== */

export interface TransferImpactAssessment {
  requestId: string;
  assessedAt: Date;

  // Destination assessment
  destinationLegalFramework: string;
  governmentAccessRisk: RiskLevel;
  judicialRemedyAvailable: boolean;
  dataProtectionAuthority: boolean;

  // Safeguards assessment
  technicalSafeguards: string[];
  organizationalSafeguards: string[];
  contractualSafeguards: string[];

  // Supplementary measures
  supplementaryMeasuresRequired: boolean;
  recommendedMeasures: string[];

  // Overall assessment
  overallRisk: RiskLevel;
  recommendation: TransferDecision;
  validUntil: Date;
}

/**
 * Perform Transfer Impact Assessment (TIA)
 */
export function performTransferImpactAssessment(request: TransferRequest): TransferImpactAssessment {
  const destinationCountry = request.destinationRegion;
  const technicalSafeguards: string[] = [];
  const organizationalSafeguards: string[] = [];
  const contractualSafeguards: string[] = [];
  const recommendedMeasures: string[] = [];

  // Assess destination legal framework
  let governmentAccessRisk: RiskLevel = 'LOW';
  let judicialRemedyAvailable = true;
  let dataProtectionAuthority = true;

  // High-risk countries for government access
  const highAccessRiskCountries = ['CN', 'RU', 'SA', 'AE', 'EG'];
  if (highAccessRiskCountries.includes(destinationCountry)) {
    governmentAccessRisk = 'HIGH';
    judicialRemedyAvailable = false;
    recommendedMeasures.push('Implement end-to-end encryption');
    recommendedMeasures.push('Consider data minimization');
  }

  // Medium-risk countries
  const mediumAccessRiskCountries = ['US', 'AU', 'IN', 'BR'];
  if (mediumAccessRiskCountries.includes(destinationCountry)) {
    governmentAccessRisk = 'MEDIUM';
    recommendedMeasures.push('Review surveillance laws');
    recommendedMeasures.push('Implement robust access controls');
  }

  // Required safeguards based on data classification
  if (request.dataClassification === 'SPECIAL_CATEGORY' || request.dataClassification === 'RESTRICTED') {
    technicalSafeguards.push('AES-256 encryption at rest');
    technicalSafeguards.push('TLS 1.3 encryption in transit');
    technicalSafeguards.push('Hardware Security Module (HSM) key management');
    technicalSafeguards.push('Pseudonymization where possible');
  } else {
    technicalSafeguards.push('AES-256 encryption at rest');
    technicalSafeguards.push('TLS 1.2+ encryption in transit');
  }

  // Organizational safeguards
  organizationalSafeguards.push('Staff training on data protection');
  organizationalSafeguards.push('Access logging and monitoring');
  organizationalSafeguards.push('Regular security audits');

  if (request.recipientType === 'PROCESSOR' || request.recipientType === 'SUBPROCESSOR') {
    organizationalSafeguards.push('Processor due diligence completed');
    organizationalSafeguards.push('Sub-processor approval process');
  }

  // Contractual safeguards
  if (request.legalBasis === 'STANDARD_CONTRACTUAL_CLAUSES') {
    contractualSafeguards.push('EU SCCs (June 2021) executed');
    contractualSafeguards.push('UK IDTA addendum (if UK data)');
  }
  contractualSafeguards.push('Data processing agreement in place');
  contractualSafeguards.push('Incident notification provisions');
  contractualSafeguards.push('Audit rights');

  // Calculate overall risk
  let overallRisk: RiskLevel;
  let recommendation: TransferDecision;

  const riskFactors = [
    governmentAccessRisk === 'HIGH',
    !judicialRemedyAvailable,
    request.dataClassification === 'SPECIAL_CATEGORY',
    request.subjectAgeRange?.includesChildren,
    getRegionalRestrictions(destinationCountry).length > 0,
  ].filter(Boolean).length;

  if (riskFactors >= 3) {
    overallRisk = 'CRITICAL';
    recommendation = 'BLOCKED';
  } else if (riskFactors >= 2) {
    overallRisk = 'HIGH';
    recommendation = 'REQUIRES_ADDITIONAL_SAFEGUARDS';
  } else if (riskFactors >= 1) {
    overallRisk = 'MEDIUM';
    recommendation = 'APPROVED_WITH_CONDITIONS';
  } else {
    overallRisk = 'LOW';
    recommendation = 'APPROVED';
  }

  return {
    requestId: request.id,
    assessedAt: new Date(),
    destinationLegalFramework: destinationCountry,
    governmentAccessRisk,
    judicialRemedyAvailable,
    dataProtectionAuthority,
    technicalSafeguards,
    organizationalSafeguards,
    contractualSafeguards,
    supplementaryMeasuresRequired: overallRisk !== 'LOW',
    recommendedMeasures,
    overallRisk,
    recommendation,
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  };
}

/* ==========================================================================
   Transfer Validation Engine
   ========================================================================== */

export interface ValidationResult {
  allowed: boolean;
  decision: TransferDecision;
  conditions: string[];
  blockers: string[];
  warnings: string[];
  requiredDocumentation: string[];
  tiaRequired: boolean;
}

/**
 * Main validation function for cross-border transfers
 */
export function validateTransfer(request: TransferRequest): ValidationResult {
  const conditions: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const requiredDocumentation: string[] = [];

  const sourceCountry = request.sourceRegion;
  const destCountry = request.destinationRegion;

  // Same country - no restrictions
  if (sourceCountry === destCountry) {
    return {
      allowed: true,
      decision: 'APPROVED',
      conditions: [],
      blockers: [],
      warnings: [],
      requiredDocumentation: [],
      tiaRequired: false,
    };
  }

  // EEA to EEA - no restrictions
  const eeaCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  ];

  if (eeaCountries.includes(sourceCountry) && eeaCountries.includes(destCountry)) {
    return {
      allowed: true,
      decision: 'APPROVED',
      conditions: [],
      blockers: [],
      warnings: [],
      requiredDocumentation: [],
      tiaRequired: false,
    };
  }

  // Check adequacy decision
  const adequacy = hasAdequacyDecision(destCountry);
  if (adequacy) {
    if (adequacy.decisionType === 'PARTIAL') {
      conditions.push(`Transfer must comply with: ${adequacy.scope}`);
      if (adequacy.notes) {
        warnings.push(adequacy.notes);
      }
    }

    // Adequacy expiring soon
    if (adequacy.expiryDate) {
      const daysUntilExpiry = Math.floor(
        (adequacy.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 180) {
        warnings.push(`Adequacy decision expires in ${daysUntilExpiry} days`);
      }
    }
  }

  // Check regional restrictions
  const restrictions = getRegionalRestrictions(destCountry);
  for (const restriction of restrictions) {
    if (restriction.restriction === 'NO_TRANSFER') {
      blockers.push(`Transfer blocked: ${restriction.scope} (${restriction.legalBasis})`);
    } else if (restriction.restriction === 'DATA_LOCALIZATION_REQUIRED') {
      blockers.push(`Data localization required: ${restriction.scope}`);
    } else if (restriction.restriction === 'TRANSFER_WITH_APPROVAL') {
      conditions.push(`Requires regulatory approval: ${restriction.scope}`);
      requiredDocumentation.push('Regulatory approval documentation');
    }
  }

  // Validate legal basis
  switch (request.legalBasis) {
    case 'ADEQUACY_DECISION':
      if (!adequacy) {
        blockers.push('No adequacy decision exists for destination country');
      }
      break;

    case 'STANDARD_CONTRACTUAL_CLAUSES':
      if (!request.sccReference) {
        blockers.push('SCC reference required but not provided');
      }
      requiredDocumentation.push('Signed Standard Contractual Clauses (EU June 2021)');
      requiredDocumentation.push('Transfer Impact Assessment');
      conditions.push('SCCs must be reviewed if circumstances change');
      break;

    case 'BINDING_CORPORATE_RULES':
      if (!request.bcrReference) {
        blockers.push('BCR reference required but not provided');
      }
      requiredDocumentation.push('Approved Binding Corporate Rules');
      break;

    case 'EXPLICIT_CONSENT':
      if (!request.consentReference) {
        blockers.push('Consent reference required but not provided');
      }
      conditions.push('Consent must be freely given, specific, informed, and unambiguous');
      conditions.push('Data subjects must be informed of risks');
      requiredDocumentation.push('Consent records');
      break;

    case 'CONTRACT_NECESSITY':
      conditions.push('Transfer must be strictly necessary for contract performance');
      warnings.push('Contract necessity cannot be used for systematic transfers');
      break;

    default:
      warnings.push(`Legal basis "${request.legalBasis}" may have limited applicability`);
  }

  // Special category data
  if (request.dataClassification === 'SPECIAL_CATEGORY') {
    if (request.legalBasis !== 'EXPLICIT_CONSENT') {
      conditions.push('Special category data requires explicit consent or Article 9 condition');
    }
    requiredDocumentation.push('Special category data transfer justification');
  }

  // Children's data
  if (request.subjectAgeRange?.includesChildren) {
    conditions.push('Parental consent required for children under applicable age threshold');
    requiredDocumentation.push('Parental consent verification records');

    // Extra restrictions for certain countries
    if (['CN', 'RU', 'SA'].includes(destCountry)) {
      blockers.push('Children\'s data transfer to high-risk jurisdictions not permitted');
    }
  }

  // Determine TIA requirement
  const tiaRequired = !adequacy ||
    request.dataClassification === 'SPECIAL_CATEGORY' ||
    request.dataClassification === 'RESTRICTED' ||
    request.subjectAgeRange?.includesChildren === true;

  // Calculate decision
  let decision: TransferDecision;
  if (blockers.length > 0) {
    decision = 'BLOCKED';
  } else if (conditions.length > 3 || warnings.length > 2) {
    decision = 'REQUIRES_ADDITIONAL_SAFEGUARDS';
  } else if (conditions.length > 0) {
    decision = 'APPROVED_WITH_CONDITIONS';
  } else {
    decision = 'APPROVED';
  }

  return {
    allowed: blockers.length === 0,
    decision,
    conditions,
    blockers,
    warnings,
    requiredDocumentation,
    tiaRequired,
  };
}

/* ==========================================================================
   Route Helpers
   ========================================================================== */

/**
 * Extract transfer request from API payload
 */
export function parseTransferRequest(body: Record<string, unknown>): Partial<TransferRequest> {
  return {
    sourceRegion: body.sourceRegion as string,
    destinationRegion: body.destinationRegion as string,
    dataClassification: body.dataClassification as DataClassification,
    dataCategories: body.dataCategories as string[],
    subjectCount: body.subjectCount as number,
    subjectAgeRange: body.subjectAgeRange as AgeRange | undefined,
    legalBasis: body.legalBasis as TransferLegalBasis,
    consentReference: body.consentReference as string | undefined,
    sccReference: body.sccReference as string | undefined,
    bcrReference: body.bcrReference as string | undefined,
    purpose: body.purpose as string,
    processorName: body.processorName as string | undefined,
    recipientType: body.recipientType as RecipientType,
  };
}

/**
 * Get country from request headers or geolocation
 */
export function getSourceCountry(request: FastifyRequest): string {
  return (
    (request.headers['cf-ipcountry'] as string) ||
    (request.headers['x-country'] as string) ||
    (request.headers['x-source-country'] as string) ||
    'US'
  );
}

/* ==========================================================================
   Exports
   ========================================================================== */

export const CrossBorderValidator = {
  hasAdequacyDecision,
  getRegionalRestrictions,
  performTransferImpactAssessment,
  validateTransfer,
  parseTransferRequest,
  getSourceCountry,
};

export default CrossBorderValidator;
