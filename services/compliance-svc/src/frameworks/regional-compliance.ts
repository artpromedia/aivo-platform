/**
 * AIVO Regional Compliance Framework
 *
 * This module provides comprehensive regional compliance configurations for:
 * - GDPR (European Union)
 * - COPPA (United States - Children's Online Privacy)
 * - CCPA/CPRA (California)
 * - LGPD (Brazil)
 * - PIPEDA (Canada)
 * - PDPA (Singapore)
 * - POPIA (South Africa)
 * - APPs (Australia)
 * - NDPR (Nigeria)
 * - DPDP (India)
 * - PIPL (China)
 * - KPIPA (South Korea)
 * - APPI (Japan)
 * - PDPL (Saudi Arabia)
 * - TDPF (Thailand)
 * - Privacy Shield framework for cross-border transfers
 */

import type { FastifyRequest } from 'fastify';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export type ComplianceRegime =
  | 'GDPR'
  | 'COPPA'
  | 'CCPA'
  | 'LGPD'
  | 'PIPEDA'
  | 'PDPA'
  | 'POPIA'
  | 'APPS'
  | 'NDPR'
  | 'DPDP'
  | 'PIPL'
  | 'KPIPA'
  | 'APPI'
  | 'PDPL'
  | 'TDPF';

export type DataSubjectRight =
  | 'ACCESS'
  | 'DELETION'
  | 'RECTIFICATION'
  | 'PORTABILITY'
  | 'RESTRICT_PROCESSING'
  | 'OBJECT_PROCESSING'
  | 'WITHDRAW_CONSENT'
  | 'NOT_BE_PROFILED'
  | 'OPT_OUT_SALE'
  | 'KNOW_CATEGORIES'
  | 'KNOW_SOURCES'
  | 'KNOW_PURPOSES'
  | 'KNOW_THIRD_PARTIES';

export type LawfulBasis =
  | 'CONSENT'
  | 'CONTRACT'
  | 'LEGAL_OBLIGATION'
  | 'VITAL_INTERESTS'
  | 'PUBLIC_TASK'
  | 'LEGITIMATE_INTERESTS';

export type DataCategory =
  | 'PERSONAL'
  | 'SENSITIVE'
  | 'BIOMETRIC'
  | 'HEALTH'
  | 'EDUCATION'
  | 'FINANCIAL'
  | 'CHILDREN'
  | 'BEHAVIORAL'
  | 'LOCATION'
  | 'COMMUNICATION';

export interface ComplianceFramework {
  code: ComplianceRegime;
  name: string;
  jurisdiction: string[];
  countryCode: string[];
  applicableRegions: string[];
  dataSubjectRights: DataSubjectRight[];
  lawfulBases: LawfulBasis[];
  specialCategories: DataCategory[];
  ageOfConsent: number;
  parentalConsentRequired: boolean;
  parentalConsentAgeThreshold: number;
  breachNotificationHours: number;
  dsrResponseDays: number;
  dataRetentionRequired: boolean;
  dpoRequired: boolean;
  crossBorderRestrictions: boolean;
  adequacyDecisions: string[];
  penaltyMaxPercent?: number;
  penaltyMaxFixed?: number;
  penaltyCurrency?: string;
  effectiveDate: string;
  regulatoryAuthority: string;
  regulatoryAuthorityUrl: string;
}

export interface ConsentRequirement {
  type: string;
  required: boolean;
  parentRequired: boolean;
  canWithdraw: boolean;
  expirationDays?: number;
  renewalPromptDays?: number;
  documentationRequired: boolean;
  languageOptions: string[];
}

export interface ComplianceCheck {
  framework: ComplianceRegime;
  passed: boolean;
  violations: ComplianceViolation[];
  warnings: string[];
  recommendations: string[];
  checkedAt: Date;
}

export interface ComplianceViolation {
  code: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  regulation: string;
  article?: string;
  remediation: string;
}

/* ==========================================================================
   Compliance Framework Definitions
   ========================================================================== */

export const COMPLIANCE_FRAMEWORKS: Record<ComplianceRegime, ComplianceFramework> = {
  GDPR: {
    code: 'GDPR',
    name: 'General Data Protection Regulation',
    jurisdiction: ['EU', 'EEA'],
    countryCode: [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
    ],
    applicableRegions: ['eu-west-1', 'eu-central-1', 'eu-north-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'RESTRICT_PROCESSING', 'OBJECT_PROCESSING', 'WITHDRAW_CONSENT', 'NOT_BE_PROFILED',
    ],
    lawfulBases: [
      'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION',
      'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS',
    ],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH', 'CHILDREN'],
    ageOfConsent: 16,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 16,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: ['AD', 'AR', 'CA', 'FO', 'GG', 'IL', 'IM', 'JP', 'JE', 'NZ', 'KR', 'CH', 'GB', 'UY', 'US'],
    penaltyMaxPercent: 4,
    penaltyMaxFixed: 20000000,
    penaltyCurrency: 'EUR',
    effectiveDate: '2018-05-25',
    regulatoryAuthority: 'European Data Protection Board',
    regulatoryAuthorityUrl: 'https://edpb.europa.eu/',
  },

  COPPA: {
    code: 'COPPA',
    name: "Children's Online Privacy Protection Act",
    jurisdiction: ['US'],
    countryCode: ['US'],
    applicableRegions: ['us-east-1', 'us-west-1', 'us-west-2'],
    dataSubjectRights: ['ACCESS', 'DELETION', 'WITHDRAW_CONSENT'],
    lawfulBases: ['CONSENT'],
    specialCategories: ['CHILDREN', 'EDUCATION'],
    ageOfConsent: 13,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 13,
    breachNotificationHours: 0, // State laws vary
    dsrResponseDays: 30,
    dataRetentionRequired: false,
    dpoRequired: false,
    crossBorderRestrictions: false,
    adequacyDecisions: [],
    penaltyMaxFixed: 50120, // Per violation
    penaltyCurrency: 'USD',
    effectiveDate: '2000-04-21',
    regulatoryAuthority: 'Federal Trade Commission',
    regulatoryAuthorityUrl: 'https://www.ftc.gov/',
  },

  CCPA: {
    code: 'CCPA',
    name: 'California Consumer Privacy Act / CPRA',
    jurisdiction: ['US-CA'],
    countryCode: ['US'],
    applicableRegions: ['us-west-1', 'us-west-2'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'PORTABILITY', 'OPT_OUT_SALE',
      'KNOW_CATEGORIES', 'KNOW_SOURCES', 'KNOW_PURPOSES', 'KNOW_THIRD_PARTIES',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT'],
    specialCategories: ['SENSITIVE', 'CHILDREN'],
    ageOfConsent: 16,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 13,
    breachNotificationHours: 0,
    dsrResponseDays: 45,
    dataRetentionRequired: false,
    dpoRequired: false,
    crossBorderRestrictions: false,
    adequacyDecisions: [],
    penaltyMaxFixed: 7500, // Per intentional violation
    penaltyCurrency: 'USD',
    effectiveDate: '2020-01-01',
    regulatoryAuthority: 'California Privacy Protection Agency',
    regulatoryAuthorityUrl: 'https://cppa.ca.gov/',
  },

  LGPD: {
    code: 'LGPD',
    name: 'Lei Geral de Proteção de Dados',
    jurisdiction: ['BR'],
    countryCode: ['BR'],
    applicableRegions: ['sa-east-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'WITHDRAW_CONSENT', 'OBJECT_PROCESSING',
    ],
    lawfulBases: [
      'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION',
      'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS',
    ],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH', 'CHILDREN'],
    ageOfConsent: 18,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 18,
    breachNotificationHours: 48,
    dsrResponseDays: 15,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxPercent: 2,
    penaltyMaxFixed: 50000000,
    penaltyCurrency: 'BRL',
    effectiveDate: '2020-09-18',
    regulatoryAuthority: 'Autoridade Nacional de Proteção de Dados',
    regulatoryAuthorityUrl: 'https://www.gov.br/anpd/',
  },

  PIPEDA: {
    code: 'PIPEDA',
    name: 'Personal Information Protection and Electronic Documents Act',
    jurisdiction: ['CA'],
    countryCode: ['CA'],
    applicableRegions: ['ca-central-1'],
    dataSubjectRights: ['ACCESS', 'RECTIFICATION', 'WITHDRAW_CONSENT'],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION'],
    specialCategories: ['SENSITIVE', 'HEALTH', 'CHILDREN'],
    ageOfConsent: 13,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 13,
    breachNotificationHours: 0, // "As soon as feasible"
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: false,
    crossBorderRestrictions: false,
    adequacyDecisions: [],
    penaltyMaxFixed: 100000,
    penaltyCurrency: 'CAD',
    effectiveDate: '2000-01-01',
    regulatoryAuthority: 'Office of the Privacy Commissioner of Canada',
    regulatoryAuthorityUrl: 'https://www.priv.gc.ca/',
  },

  PDPA: {
    code: 'PDPA',
    name: 'Personal Data Protection Act',
    jurisdiction: ['SG'],
    countryCode: ['SG'],
    applicableRegions: ['ap-southeast-1'],
    dataSubjectRights: ['ACCESS', 'RECTIFICATION', 'WITHDRAW_CONSENT', 'PORTABILITY'],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'LEGITIMATE_INTERESTS'],
    specialCategories: ['SENSITIVE', 'HEALTH'],
    ageOfConsent: 0, // Not specified, context-dependent
    parentalConsentRequired: false,
    parentalConsentAgeThreshold: 0,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxFixed: 1000000,
    penaltyCurrency: 'SGD',
    effectiveDate: '2012-10-15',
    regulatoryAuthority: 'Personal Data Protection Commission',
    regulatoryAuthorityUrl: 'https://www.pdpc.gov.sg/',
  },

  POPIA: {
    code: 'POPIA',
    name: 'Protection of Personal Information Act',
    jurisdiction: ['ZA'],
    countryCode: ['ZA'],
    applicableRegions: ['af-south-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'OBJECT_PROCESSING', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH', 'CHILDREN'],
    ageOfConsent: 18,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 18,
    breachNotificationHours: 0, // "As soon as reasonably possible"
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxFixed: 10000000,
    penaltyCurrency: 'ZAR',
    effectiveDate: '2021-07-01',
    regulatoryAuthority: 'Information Regulator',
    regulatoryAuthorityUrl: 'https://inforegulator.org.za/',
  },

  APPS: {
    code: 'APPS',
    name: 'Australian Privacy Principles',
    jurisdiction: ['AU'],
    countryCode: ['AU'],
    applicableRegions: ['ap-southeast-2'],
    dataSubjectRights: ['ACCESS', 'RECTIFICATION', 'OBJECT_PROCESSING'],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION'],
    specialCategories: ['SENSITIVE', 'HEALTH'],
    ageOfConsent: 15,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 15,
    breachNotificationHours: 720, // 30 days
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: false,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxFixed: 2220000,
    penaltyCurrency: 'AUD',
    effectiveDate: '2014-03-12',
    regulatoryAuthority: 'Office of the Australian Information Commissioner',
    regulatoryAuthorityUrl: 'https://www.oaic.gov.au/',
  },

  NDPR: {
    code: 'NDPR',
    name: 'Nigeria Data Protection Regulation',
    jurisdiction: ['NG'],
    countryCode: ['NG'],
    applicableRegions: ['af-south-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'OBJECT_PROCESSING', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH', 'CHILDREN'],
    ageOfConsent: 0, // Not specified
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 0,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxPercent: 2,
    penaltyMaxFixed: 10000000,
    penaltyCurrency: 'NGN',
    effectiveDate: '2019-01-25',
    regulatoryAuthority: 'National Information Technology Development Agency',
    regulatoryAuthorityUrl: 'https://nitda.gov.ng/',
  },

  DPDP: {
    code: 'DPDP',
    name: 'Digital Personal Data Protection Act',
    jurisdiction: ['IN'],
    countryCode: ['IN'],
    applicableRegions: ['ap-south-1', 'ap-south-2'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS'],
    specialCategories: ['CHILDREN'],
    ageOfConsent: 18,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 18,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxFixed: 2500000000, // 250 crore INR
    penaltyCurrency: 'INR',
    effectiveDate: '2023-08-11',
    regulatoryAuthority: 'Data Protection Board of India',
    regulatoryAuthorityUrl: 'https://www.meity.gov.in/',
  },

  PIPL: {
    code: 'PIPL',
    name: 'Personal Information Protection Law',
    jurisdiction: ['CN'],
    countryCode: ['CN'],
    applicableRegions: ['cn-north-1', 'cn-northwest-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'RESTRICT_PROCESSING', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH', 'FINANCIAL', 'LOCATION', 'CHILDREN'],
    ageOfConsent: 14,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 14,
    breachNotificationHours: 0, // "Immediately"
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxPercent: 5,
    penaltyMaxFixed: 50000000,
    penaltyCurrency: 'CNY',
    effectiveDate: '2021-11-01',
    regulatoryAuthority: 'Cyberspace Administration of China',
    regulatoryAuthorityUrl: 'http://www.cac.gov.cn/',
  },

  KPIPA: {
    code: 'KPIPA',
    name: 'Personal Information Protection Act (Korea)',
    jurisdiction: ['KR'],
    countryCode: ['KR'],
    applicableRegions: ['ap-northeast-2'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'RESTRICT_PROCESSING', 'OBJECT_PROCESSING', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH'],
    ageOfConsent: 14,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 14,
    breachNotificationHours: 72,
    dsrResponseDays: 10,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxPercent: 3,
    penaltyCurrency: 'KRW',
    effectiveDate: '2011-09-30',
    regulatoryAuthority: 'Personal Information Protection Commission',
    regulatoryAuthorityUrl: 'https://www.pipc.go.kr/',
  },

  APPI: {
    code: 'APPI',
    name: 'Act on the Protection of Personal Information',
    jurisdiction: ['JP'],
    countryCode: ['JP'],
    applicableRegions: ['ap-northeast-1'],
    dataSubjectRights: ['ACCESS', 'DELETION', 'RECTIFICATION', 'WITHDRAW_CONSENT'],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH'],
    ageOfConsent: 0, // Context-dependent
    parentalConsentRequired: false,
    parentalConsentAgeThreshold: 0,
    breachNotificationHours: 0, // "Promptly"
    dsrResponseDays: 14,
    dataRetentionRequired: true,
    dpoRequired: false,
    crossBorderRestrictions: true,
    adequacyDecisions: ['EU'],
    penaltyMaxFixed: 100000000,
    penaltyCurrency: 'JPY',
    effectiveDate: '2003-05-30',
    regulatoryAuthority: 'Personal Information Protection Commission',
    regulatoryAuthorityUrl: 'https://www.ppc.go.jp/',
  },

  PDPL: {
    code: 'PDPL',
    name: 'Personal Data Protection Law',
    jurisdiction: ['SA'],
    countryCode: ['SA'],
    applicableRegions: ['me-south-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'OBJECT_PROCESSING', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH'],
    ageOfConsent: 18,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 18,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxFixed: 5000000,
    penaltyCurrency: 'SAR',
    effectiveDate: '2023-09-14',
    regulatoryAuthority: 'Saudi Data & AI Authority',
    regulatoryAuthorityUrl: 'https://sdaia.gov.sa/',
  },

  TDPF: {
    code: 'TDPF',
    name: 'Thailand Personal Data Protection Act',
    jurisdiction: ['TH'],
    countryCode: ['TH'],
    applicableRegions: ['ap-southeast-1'],
    dataSubjectRights: [
      'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY',
      'RESTRICT_PROCESSING', 'OBJECT_PROCESSING', 'WITHDRAW_CONSENT',
    ],
    lawfulBases: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'],
    specialCategories: ['SENSITIVE', 'BIOMETRIC', 'HEALTH'],
    ageOfConsent: 20,
    parentalConsentRequired: true,
    parentalConsentAgeThreshold: 20,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    dataRetentionRequired: true,
    dpoRequired: true,
    crossBorderRestrictions: true,
    adequacyDecisions: [],
    penaltyMaxFixed: 5000000,
    penaltyCurrency: 'THB',
    effectiveDate: '2022-06-01',
    regulatoryAuthority: 'Personal Data Protection Committee',
    regulatoryAuthorityUrl: 'https://www.pdpc.or.th/',
  },
};

/* ==========================================================================
   Consent Requirements by Framework
   ========================================================================== */

export const CONSENT_REQUIREMENTS: Record<ComplianceRegime, ConsentRequirement[]> = {
  GDPR: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: false, documentationRequired: true, languageOptions: [] },
    { type: 'ANALYTICS', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: [] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: [] },
    { type: 'AI_PERSONALIZATION', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: [] },
    { type: 'THIRD_PARTY', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: [] },
    { type: 'PROFILING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: [] },
  ],
  COPPA: [
    { type: 'COPPA_VERIFIABLE', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'es'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'es'] },
    { type: 'THIRD_PARTY', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'es'] },
  ],
  CCPA: [
    { type: 'ESSENTIAL', required: true, parentRequired: false, canWithdraw: false, documentationRequired: false, languageOptions: ['en', 'es'] },
    { type: 'SALE_OF_DATA', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'es'] },
    { type: 'SENSITIVE_DATA', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'es'] },
  ],
  LGPD: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: false, documentationRequired: true, languageOptions: ['pt-BR'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['pt-BR'] },
    { type: 'PROFILING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['pt-BR'] },
    { type: 'INTERNATIONAL_TRANSFER', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['pt-BR'] },
  ],
  PIPEDA: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'fr'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'fr'] },
  ],
  PDPA: [
    { type: 'ESSENTIAL', required: true, parentRequired: false, canWithdraw: true, documentationRequired: true, languageOptions: ['en'] },
    { type: 'MARKETING', required: false, parentRequired: false, canWithdraw: true, documentationRequired: true, languageOptions: ['en'] },
  ],
  POPIA: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'af', 'zu'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'af', 'zu'] },
  ],
  APPS: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en'] },
  ],
  NDPR: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en'] },
  ],
  DPDP: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'hi'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['en', 'hi'] },
  ],
  PIPL: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['zh'] },
    { type: 'SENSITIVE', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['zh'] },
    { type: 'CROSS_BORDER', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['zh'] },
    { type: 'AUTOMATED_DECISION', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['zh'] },
  ],
  KPIPA: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['ko'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['ko'] },
  ],
  APPI: [
    { type: 'ESSENTIAL', required: true, parentRequired: false, canWithdraw: true, documentationRequired: true, languageOptions: ['ja'] },
    { type: 'THIRD_PARTY', required: false, parentRequired: false, canWithdraw: true, documentationRequired: true, languageOptions: ['ja'] },
  ],
  PDPL: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['ar', 'en'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['ar', 'en'] },
  ],
  TDPF: [
    { type: 'ESSENTIAL', required: true, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['th', 'en'] },
    { type: 'MARKETING', required: false, parentRequired: true, canWithdraw: true, documentationRequired: true, languageOptions: ['th', 'en'] },
  ],
};

/* ==========================================================================
   Compliance Detection and Checking
   ========================================================================== */

/**
 * Detect applicable compliance frameworks based on user's country
 */
export function detectApplicableFrameworks(countryCode: string): ComplianceRegime[] {
  const frameworks: ComplianceRegime[] = [];

  for (const [code, framework] of Object.entries(COMPLIANCE_FRAMEWORKS)) {
    if (framework.countryCode.includes(countryCode)) {
      frameworks.push(code as ComplianceRegime);
    }
  }

  // US always requires COPPA for children's educational apps
  if (countryCode === 'US') {
    if (!frameworks.includes('COPPA')) {
      frameworks.push('COPPA');
    }
  }

  return frameworks;
}

/**
 * Get the most restrictive age of consent for a set of frameworks
 */
export function getMostRestrictiveAgeOfConsent(frameworks: ComplianceRegime[]): number {
  let maxAge = 0;
  for (const code of frameworks) {
    const framework = COMPLIANCE_FRAMEWORKS[code];
    if (framework && framework.parentalConsentAgeThreshold > maxAge) {
      maxAge = framework.parentalConsentAgeThreshold;
    }
  }
  return maxAge || 13; // Default to COPPA age
}

/**
 * Check if parental consent is required
 */
export function isParentalConsentRequired(
  frameworks: ComplianceRegime[],
  userAge: number
): boolean {
  for (const code of frameworks) {
    const framework = COMPLIANCE_FRAMEWORKS[code];
    if (framework?.parentalConsentRequired && userAge < framework.parentalConsentAgeThreshold) {
      return true;
    }
  }
  return false;
}

/**
 * Get DSR response deadline for applicable frameworks
 */
export function getDsrResponseDeadline(frameworks: ComplianceRegime[]): number {
  let minDays = Number.MAX_SAFE_INTEGER;
  for (const code of frameworks) {
    const framework = COMPLIANCE_FRAMEWORKS[code];
    if (framework && framework.dsrResponseDays < minDays) {
      minDays = framework.dsrResponseDays;
    }
  }
  return minDays === Number.MAX_SAFE_INTEGER ? 30 : minDays;
}

/**
 * Check if cross-border data transfer is restricted
 */
export function isCrossBorderRestricted(
  sourceCountry: string,
  destinationCountry: string,
  frameworks: ComplianceRegime[]
): { restricted: boolean; requiresAdequacy: boolean; requiresConsent: boolean } {
  if (sourceCountry === destinationCountry) {
    return { restricted: false, requiresAdequacy: false, requiresConsent: false };
  }

  for (const code of frameworks) {
    const framework = COMPLIANCE_FRAMEWORKS[code];
    if (framework?.crossBorderRestrictions) {
      const hasAdequacy = framework.adequacyDecisions.includes(destinationCountry);
      return {
        restricted: !hasAdequacy,
        requiresAdequacy: true,
        requiresConsent: !hasAdequacy,
      };
    }
  }

  return { restricted: false, requiresAdequacy: false, requiresConsent: false };
}

/**
 * Get breach notification deadline in hours
 */
export function getBreachNotificationDeadline(frameworks: ComplianceRegime[]): number {
  let minHours = Number.MAX_SAFE_INTEGER;
  for (const code of frameworks) {
    const framework = COMPLIANCE_FRAMEWORKS[code];
    if (framework && framework.breachNotificationHours > 0 && framework.breachNotificationHours < minHours) {
      minHours = framework.breachNotificationHours;
    }
  }
  return minHours === Number.MAX_SAFE_INTEGER ? 72 : minHours; // Default to GDPR
}

/* ==========================================================================
   Request Helpers
   ========================================================================== */

/**
 * Extract country code from Fastify request
 */
export function extractCountryFromRequest(request: FastifyRequest): string {
  // Try CloudFlare header
  const cfCountry = request.headers['cf-ipcountry'];
  if (cfCountry && typeof cfCountry === 'string' && cfCountry.length === 2) {
    return cfCountry.toUpperCase();
  }

  // Try X-Country header (from geolocation service)
  const xCountry = request.headers['x-country'];
  if (xCountry && typeof xCountry === 'string' && xCountry.length === 2) {
    return xCountry.toUpperCase();
  }

  // Try Accept-Language header
  const acceptLang = request.headers['accept-language'];
  if (acceptLang && typeof acceptLang === 'string') {
    const match = acceptLang.match(/-([A-Z]{2})/i);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  // Default to US
  return 'US';
}

/* ==========================================================================
   Exports
   ========================================================================== */

export default {
  COMPLIANCE_FRAMEWORKS,
  CONSENT_REQUIREMENTS,
  detectApplicableFrameworks,
  getMostRestrictiveAgeOfConsent,
  isParentalConsentRequired,
  getDsrResponseDeadline,
  isCrossBorderRestricted,
  getBreachNotificationDeadline,
  extractCountryFromRequest,
};
