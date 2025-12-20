/**
 * Shared Types for Marketing Website
 *
 * These types should match the types in libs/ts-shared and the main app.
 * If possible, import directly from @aivo/ts-shared instead.
 */

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'parent' | 'teacher' | 'admin' | 'learner';
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanType = 'free' | 'pro' | 'premium';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';

export type BillingInterval = 'monthly' | 'annual';

// ============================================
// AUTH TYPES
// ============================================

export interface AuthSession {
  user: User;
  subscription: Subscription | null;
  accessToken?: string;
}

export interface RegistrationParams {
  plan?: PlanType;
  interval?: BillingInterval;
  ref?: string;
  source?: string;
  returnUrl?: string;
}

export interface CheckoutParams {
  plan: 'pro' | 'premium';
  interval: BillingInterval;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// ============================================
// PLAN CONFIGURATION
// ============================================

export interface PlanConfig {
  id: PlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  trialDays: number;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    monthlyPrice: 0,
    annualPrice: 0,
    features: ['Basic lessons', 'Core subjects', 'Community support'],
    trialDays: 0,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Perfect for individual learners',
    monthlyPrice: parseFloat(process.env.NEXT_PUBLIC_PLAN_PRO_MONTHLY_PRICE || '29.99'),
    annualPrice: parseFloat(process.env.NEXT_PUBLIC_PLAN_PRO_ANNUAL_PRICE || '24.99'),
    features: [
      'All lessons',
      'AI tutor (Virtual Brain)',
      'IEP integration',
      'Parent dashboard',
      'Progress reports',
      'Email support',
    ],
    popular: true,
    trialDays: parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || '14', 10),
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For families with multiple learners',
    monthlyPrice: parseFloat(process.env.NEXT_PUBLIC_PLAN_PREMIUM_MONTHLY_PRICE || '49.99'),
    annualPrice: parseFloat(process.env.NEXT_PUBLIC_PLAN_PREMIUM_ANNUAL_PRICE || '41.99'),
    features: [
      'Everything in Pro',
      'Up to 5 learner profiles',
      '24/7 priority support',
      'Custom learning plans',
      'Teacher collaboration',
      'Advanced analytics',
    ],
    trialDays: parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || '14', 10),
  },
};

/**
 * Get plan price based on billing interval
 */
export function getPlanPrice(plan: PlanType, interval: BillingInterval): number {
  const config = PLAN_CONFIGS[plan];
  return interval === 'annual' ? config.annualPrice : config.monthlyPrice;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
}

/**
 * Calculate annual savings
 */
export function calculateAnnualSavings(plan: PlanType): number {
  const config = PLAN_CONFIGS[plan];
  const monthlyTotal = config.monthlyPrice * 12;
  const annualTotal = config.annualPrice * 12;
  return monthlyTotal - annualTotal;
}
