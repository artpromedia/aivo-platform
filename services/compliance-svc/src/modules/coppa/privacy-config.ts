/**
 * COPPA/Consent Module — Privacy Configuration
 * Migrated from consent-svc
 */

import type { ConsentTypeValue } from './types.js';

export interface ConsentDefinition {
  type: ConsentTypeValue;
  required: boolean;
  description: string;
  category: 'essential' | 'learning' | 'research' | 'marketing';
  coppaRequired: boolean;
  defaultExpirationDays: number | null;
}

export const consentDefinitions: ConsentDefinition[] = [
  {
    type: 'BASELINE_ASSESSMENT',
    required: true,
    description:
      "Required for initial placement, safety screening, and adaptive content calibration. This assessment helps us understand your child's current skill levels to provide appropriate learning materials.",
    category: 'essential',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
  {
    type: 'DATA_PROCESSING',
    required: true,
    description:
      "Required to process your child's learning data to provide the core educational service. Without this consent, we cannot deliver personalized learning experiences.",
    category: 'essential',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
  {
    type: 'AI_PERSONALIZATION',
    required: false,
    description:
      "Enables AI-powered personalization of learning content and recommendations. This allows our system to adapt in real-time to your child's learning needs and pace.",
    category: 'learning',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
  {
    type: 'AI_TUTOR',
    required: false,
    description:
      'Optional access to AI-powered tutoring and homework assistance. Your child can ask questions and receive explanations tailored to their understanding level.',
    category: 'learning',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
  {
    type: 'VOICE_RECORDING',
    required: false,
    description:
      'Allows voice-based interactions for learning activities such as reading practice, pronunciation feedback, and verbal question answering.',
    category: 'learning',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
  {
    type: 'RESEARCH',
    required: false,
    description:
      'Optional participation in aggregated, anonymized educational research to improve learning outcomes for all students. Individual data is never shared.',
    category: 'research',
    coppaRequired: false,
    defaultExpirationDays: 365,
  },
  {
    type: 'MARKETING',
    required: false,
    description:
      'Receive updates about new educational features, content, and products. We never sell your information to third parties.',
    category: 'marketing',
    coppaRequired: false,
    defaultExpirationDays: null,
  },
  {
    type: 'THIRD_PARTY_SHARING',
    required: false,
    description:
      'Allow sharing of learning progress with authorized educational partners such as your school district or tutoring services you use.',
    category: 'research',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
  {
    type: 'BIOMETRIC_DATA',
    required: false,
    description:
      'Collection of biometric data such as typing patterns for enhanced engagement detection and accessibility features.',
    category: 'learning',
    coppaRequired: true,
    defaultExpirationDays: 365,
  },
];

export function getConsentDefinition(type: ConsentTypeValue): ConsentDefinition | undefined {
  return consentDefinitions.find((d) => d.type === type);
}

export function getRequiredConsents(): ConsentTypeValue[] {
  return consentDefinitions.filter((d) => d.required).map((d) => d.type);
}

export function getOptionalConsents(): ConsentTypeValue[] {
  return consentDefinitions.filter((d) => !d.required).map((d) => d.type);
}

export function getCoppaRequiredConsents(): ConsentTypeValue[] {
  return consentDefinitions.filter((d) => d.coppaRequired).map((d) => d.type);
}

export function getConsentsByCategory(category: ConsentDefinition['category']): ConsentTypeValue[] {
  return consentDefinitions.filter((d) => d.category === category).map((d) => d.type);
}

export const CONSENT_TEXT_VERSION = '2024.12.1';

export const consentTextHistory = [
  {
    version: '2024.12.1',
    date: '2024-12-13',
    changes: 'Added AI_PERSONALIZATION, VOICE_RECORDING, BIOMETRIC_DATA consent types',
  },
  { version: '2024.06.1', date: '2024-06-01', changes: 'Initial consent text version' },
];
