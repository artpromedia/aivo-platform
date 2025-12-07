import type { ConsentType } from './types.js';

export interface ConsentDefinition {
  type: ConsentType;
  required: boolean;
  description: string;
}

export const consentDefinitions: ConsentDefinition[] = [
  {
    type: 'BASELINE_ASSESSMENT',
    required: true,
    description:
      'Required for initial placement, safety screening, and adaptive content calibration.',
  },
  {
    type: 'AI_TUTOR',
    required: false,
    description: 'Optional access to AI tutor experiences, with in-session personalization.',
  },
  {
    type: 'RESEARCH_ANALYTICS',
    required: false,
    description: 'Optional participation in aggregate analytics to improve learning outcomes.',
  },
];
