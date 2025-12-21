/**
 * Plan Configuration
 *
 * Defines entitlements and limits for each subscription plan:
 * - FREE: Limited trial-like experience
 * - PRO: Full individual/family access
 * - PREMIUM: Enhanced features + priority support
 * - SCHOOL: School-wide licensing
 * - DISTRICT: District-wide licensing with admin features
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type Plan = 'FREE' | 'PRO' | 'PREMIUM' | 'SCHOOL' | 'DISTRICT';

export interface PlanFeatures {
  /** AI tutor with personalized assistance */
  aiTutor: boolean;
  /** Advanced analytics and reporting */
  advancedAnalytics: boolean;
  /** Custom curriculum creation */
  customCurriculum: boolean;
  /** Priority support (faster response times) */
  prioritySupport: boolean;
  /** API access for integrations */
  apiAccess: boolean;
  /** Single Sign-On (SSO) enabled */
  ssoEnabled: boolean;
  /** Custom branding options */
  customBranding: boolean;
  /** Data export capabilities */
  dataExport: boolean;
  /** IEP/504 plan integration */
  iepIntegration: boolean;
  /** Offline mode support */
  offlineMode: boolean;
  /** Parent dashboard access */
  parentDashboard: boolean;
  /** Teacher planning tools */
  teacherTools: boolean;
  /** Assessment creation */
  assessmentCreation: boolean;
  /** Progress monitoring */
  progressMonitoring: boolean;
  /** Collaboration features */
  collaboration: boolean;
  /** White-label options */
  whiteLabel: boolean;
  /** Dedicated support representative */
  dedicatedSupport: boolean;
}

export interface PlanLimits {
  /** Maximum sessions per month (null = unlimited) */
  sessionsPerMonth: number | null;
  /** Storage in GB */
  storageGb: number;
  /** API calls per month (null = unlimited) */
  apiCallsPerMonth: number | null;
  /** Max content items that can be created */
  contentItems: number | null;
  /** Max assessments that can be created */
  assessments: number | null;
  /** Data retention in days */
  dataRetentionDays: number;
}

export interface Entitlements {
  /** Plan identifier */
  plan: Plan;
  /** Maximum number of learners */
  maxLearners: number;
  /** Maximum number of teachers (0 for parent plans) */
  maxTeachers: number;
  /** Maximum number of admin users */
  maxAdmins: number;
  /** Available modules (ELA, MATH, SEL, SCIENCE, etc.) */
  modules: string[];
  /** Feature flags */
  features: PlanFeatures;
  /** Usage limits */
  limits: PlanLimits;
  /** Price in cents per month (for display purposes) */
  monthlyPriceCents: number;
  /** Price in cents per year (for display purposes) */
  annualPriceCents: number;
  /** Human-readable description */
  description: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAN DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Base modules included in all plans
 */
export const BASE_MODULES = ['ELA', 'MATH'] as const;

/**
 * Premium modules available in higher tier plans
 */
export const PREMIUM_MODULES = ['SEL', 'SCIENCE', 'SPEECH', 'EXECUTIVE_FUNCTION'] as const;

/**
 * All available modules
 */
export const ALL_MODULES = [...BASE_MODULES, ...PREMIUM_MODULES] as const;

/**
 * Default features (all disabled)
 */
const DEFAULT_FEATURES: PlanFeatures = {
  aiTutor: false,
  advancedAnalytics: false,
  customCurriculum: false,
  prioritySupport: false,
  apiAccess: false,
  ssoEnabled: false,
  customBranding: false,
  dataExport: false,
  iepIntegration: false,
  offlineMode: false,
  parentDashboard: false,
  teacherTools: false,
  assessmentCreation: false,
  progressMonitoring: false,
  collaboration: false,
  whiteLabel: false,
  dedicatedSupport: false,
};

/**
 * Plan entitlements configuration
 */
export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  // ══════════════════════════════════════════════════════════════════════════
  // FREE PLAN
  // ══════════════════════════════════════════════════════════════════════════
  FREE: {
    plan: 'FREE',
    maxLearners: 1,
    maxTeachers: 0,
    maxAdmins: 0,
    modules: [...BASE_MODULES], // ELA + MATH only
    features: {
      ...DEFAULT_FEATURES,
      parentDashboard: true,
      progressMonitoring: true,
    },
    limits: {
      sessionsPerMonth: 10,
      storageGb: 1,
      apiCallsPerMonth: null, // No API access
      contentItems: 10,
      assessments: 5,
      dataRetentionDays: 30,
    },
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    description: 'Free tier with limited access to core ELA and Math modules.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRO PLAN ($29.99/month or $299/year)
  // ══════════════════════════════════════════════════════════════════════════
  PRO: {
    plan: 'PRO',
    maxLearners: 5,
    maxTeachers: 1,
    maxAdmins: 1,
    modules: [...BASE_MODULES, 'SEL'], // ELA + MATH + SEL
    features: {
      ...DEFAULT_FEATURES,
      aiTutor: true,
      advancedAnalytics: true,
      dataExport: true,
      offlineMode: true,
      parentDashboard: true,
      progressMonitoring: true,
    },
    limits: {
      sessionsPerMonth: null, // Unlimited
      storageGb: 10,
      apiCallsPerMonth: null,
      contentItems: 100,
      assessments: 50,
      dataRetentionDays: 365,
    },
    monthlyPriceCents: 2999, // $29.99
    annualPriceCents: 29900, // $299.00 (2 months free)
    description: 'Full access for families with up to 5 learners. Includes AI tutor and advanced analytics.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PREMIUM PLAN ($49.99/month or $499/year)
  // ══════════════════════════════════════════════════════════════════════════
  PREMIUM: {
    plan: 'PREMIUM',
    maxLearners: 10,
    maxTeachers: 2,
    maxAdmins: 2,
    modules: [...ALL_MODULES], // All modules
    features: {
      ...DEFAULT_FEATURES,
      aiTutor: true,
      advancedAnalytics: true,
      customCurriculum: true,
      prioritySupport: true,
      dataExport: true,
      iepIntegration: true,
      offlineMode: true,
      parentDashboard: true,
      teacherTools: true,
      assessmentCreation: true,
      progressMonitoring: true,
      collaboration: true,
    },
    limits: {
      sessionsPerMonth: null,
      storageGb: 50,
      apiCallsPerMonth: null,
      contentItems: null, // Unlimited
      assessments: null, // Unlimited
      dataRetentionDays: 730, // 2 years
    },
    monthlyPriceCents: 4999, // $49.99
    annualPriceCents: 49900, // $499.00 (2 months free)
    description: 'Premium access with all modules, IEP integration, and priority support.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SCHOOL PLAN (Custom pricing, usage-based)
  // ══════════════════════════════════════════════════════════════════════════
  SCHOOL: {
    plan: 'SCHOOL',
    maxLearners: 500, // Per seat count
    maxTeachers: 50,
    maxAdmins: 5,
    modules: [...ALL_MODULES],
    features: {
      ...DEFAULT_FEATURES,
      aiTutor: true,
      advancedAnalytics: true,
      customCurriculum: true,
      prioritySupport: true,
      apiAccess: true,
      ssoEnabled: true,
      dataExport: true,
      iepIntegration: true,
      offlineMode: true,
      parentDashboard: true,
      teacherTools: true,
      assessmentCreation: true,
      progressMonitoring: true,
      collaboration: true,
    },
    limits: {
      sessionsPerMonth: null,
      storageGb: 500,
      apiCallsPerMonth: 100000,
      contentItems: null,
      assessments: null,
      dataRetentionDays: 1825, // 5 years
    },
    monthlyPriceCents: 0, // Custom pricing
    annualPriceCents: 0, // Per-seat annual contract
    description: 'School-wide licensing with SSO, API access, and dedicated support.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DISTRICT PLAN (Custom pricing, usage-based)
  // ══════════════════════════════════════════════════════════════════════════
  DISTRICT: {
    plan: 'DISTRICT',
    maxLearners: 10000, // Per seat count
    maxTeachers: 1000,
    maxAdmins: 50,
    modules: [...ALL_MODULES],
    features: {
      aiTutor: true,
      advancedAnalytics: true,
      customCurriculum: true,
      prioritySupport: true,
      apiAccess: true,
      ssoEnabled: true,
      customBranding: true,
      dataExport: true,
      iepIntegration: true,
      offlineMode: true,
      parentDashboard: true,
      teacherTools: true,
      assessmentCreation: true,
      progressMonitoring: true,
      collaboration: true,
      whiteLabel: true,
      dedicatedSupport: true,
    },
    limits: {
      sessionsPerMonth: null,
      storageGb: 5000,
      apiCallsPerMonth: null, // Unlimited
      contentItems: null,
      assessments: null,
      dataRetentionDays: 2555, // 7 years (FERPA compliance)
    },
    monthlyPriceCents: 0, // Custom pricing
    annualPriceCents: 0, // Multi-year contracts typical
    description: 'District-wide licensing with white-label, dedicated support, and full API access.',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get entitlements for a plan
 */
export function getEntitlements(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}

/**
 * Check if a plan has access to a specific feature
 */
export function hasFeature(plan: Plan, feature: keyof PlanFeatures): boolean {
  return PLAN_ENTITLEMENTS[plan].features[feature];
}

/**
 * Check if a plan has access to a specific module
 */
export function hasModule(plan: Plan, module: string): boolean {
  return PLAN_ENTITLEMENTS[plan].modules.includes(module);
}

/**
 * Get the limit value for a plan
 */
export function getLimit(plan: Plan, limit: keyof PlanLimits): number | null {
  return PLAN_ENTITLEMENTS[plan].limits[limit];
}

/**
 * Check if an upgrade is available from one plan to another
 */
export function canUpgrade(fromPlan: Plan, toPlan: Plan): boolean {
  const planOrder: Plan[] = ['FREE', 'PRO', 'PREMIUM', 'SCHOOL', 'DISTRICT'];
  return planOrder.indexOf(toPlan) > planOrder.indexOf(fromPlan);
}

/**
 * Get the next upgrade tier for a plan
 */
export function getUpgradePath(plan: Plan): Plan | null {
  switch (plan) {
    case 'FREE':
      return 'PRO';
    case 'PRO':
      return 'PREMIUM';
    case 'PREMIUM':
      return null; // Contact sales for SCHOOL/DISTRICT
    case 'SCHOOL':
      return 'DISTRICT';
    case 'DISTRICT':
      return null;
    default:
      return null;
  }
}

/**
 * Calculate prorated amount for mid-cycle plan change
 */
export function calculateProration(
  currentPlan: Plan,
  newPlan: Plan,
  daysRemaining: number,
  totalDays: number,
  isAnnual: boolean
): number {
  const current = PLAN_ENTITLEMENTS[currentPlan];
  const next = PLAN_ENTITLEMENTS[newPlan];
  
  const currentPrice = isAnnual ? current.annualPriceCents : current.monthlyPriceCents;
  const newPrice = isAnnual ? next.annualPriceCents : next.monthlyPriceCents;
  
  // Credit for unused portion of current plan
  const credit = Math.round((currentPrice * daysRemaining) / totalDays);
  
  // Charge for remaining portion of new plan
  const charge = Math.round((newPrice * daysRemaining) / totalDays);
  
  // Net amount (positive = charge, negative = credit)
  return charge - credit;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default PLAN_ENTITLEMENTS;
