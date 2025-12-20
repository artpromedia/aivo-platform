import type { RegistrationContext, PlanId, BillingInterval } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Build registration URL with context parameters
 */
export function buildRegistrationUrl(context?: RegistrationContext): string {
  const baseUrl = `${APP_URL}/register`;

  if (!context) return baseUrl;

  const params = new URLSearchParams();

  if (context.plan) params.set('plan', context.plan);
  if (context.billingInterval) params.set('interval', context.billingInterval);
  if (context.referralCode) params.set('ref', context.referralCode);
  if (context.source) params.set('source', context.source);
  if (context.returnUrl) params.set('returnUrl', context.returnUrl);

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Build login URL with return path
 */
export function buildLoginUrl(returnUrl?: string): string {
  const baseUrl = `${APP_URL}/login`;

  if (!returnUrl) return baseUrl;

  const params = new URLSearchParams({ returnUrl });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Build checkout URL for direct purchase
 */
export function buildCheckoutUrl(plan: PlanId, interval: BillingInterval, email?: string): string {
  const params = new URLSearchParams({
    plan,
    interval,
    source: 'marketing',
  });

  if (email) params.set('email', email);

  return `${APP_URL}/checkout?${params.toString()}`;
}

/**
 * Build dashboard URL
 */
export function buildDashboardUrl(path = ''): string {
  return `${APP_URL}/dashboard${path}`;
}

/**
 * Get plan display info
 */
export function getPlanInfo(plan: PlanId, interval: BillingInterval) {
  const plans = {
    free: {
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      features: ['Basic lessons', 'Core subjects', 'Community support'],
    },
    pro: {
      name: 'Pro',
      monthlyPrice: 29.99,
      annualPrice: 24.99,
      features: ['All lessons', 'AI tutor', 'IEP integration', 'Parent dashboard'],
    },
    premium: {
      name: 'Premium',
      monthlyPrice: 49.99,
      annualPrice: 41.99,
      features: ['Everything in Pro', 'Multiple profiles', '24/7 support', 'Custom plans'],
    },
  };

  const planInfo = plans[plan];
  const price = interval === 'annual' ? planInfo.annualPrice : planInfo.monthlyPrice;

  return {
    ...planInfo,
    price,
    interval,
    priceDisplay: price === 0 ? 'Free' : `$${price.toFixed(2)}/mo`,
  };
}

/**
 * Store registration context in session storage
 */
export function storeRegistrationContext(context: RegistrationContext): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('aivo_registration_context', JSON.stringify(context));
}

/**
 * Retrieve registration context from session storage
 */
export function getStoredRegistrationContext(): RegistrationContext | null {
  if (typeof window === 'undefined') return null;

  const stored = sessionStorage.getItem('aivo_registration_context');
  if (!stored) return null;

  try {
    return JSON.parse(stored) as RegistrationContext;
  } catch {
    return null;
  }
}

/**
 * Clear registration context
 */
export function clearRegistrationContext(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('aivo_registration_context');
}

/**
 * Parse URL parameters for registration context
 */
export function parseRegistrationParams(searchParams: URLSearchParams): RegistrationContext {
  const plan = searchParams.get('plan');
  const interval = searchParams.get('interval');
  const ref = searchParams.get('ref');
  const source = searchParams.get('source');
  const returnUrl = searchParams.get('returnUrl');

  return {
    plan: plan ? (plan as PlanId) : undefined,
    billingInterval: interval ? (interval as BillingInterval) : undefined,
    referralCode: ref ?? undefined,
    source: source ?? 'marketing',
    returnUrl: returnUrl ?? undefined,
  };
}

/**
 * Track conversion event
 */
export function trackConversion(event: string, data?: Record<string, unknown>): void {
  // Google Analytics
  if (typeof window !== 'undefined' && (window as Record<string, unknown>).gtag) {
    (
      window as Record<string, unknown> & {
        gtag: (type: string, event: string, data?: unknown) => void;
      }
    ).gtag('event', event, data);
  }

  // Vercel Analytics
  if (typeof window !== 'undefined' && (window as Record<string, unknown>).va) {
    (window as Record<string, unknown> & { va: (type: string, payload: unknown) => void }).va(
      'event',
      { name: event, data }
    );
  }

  console.log('[Conversion]', event, data);
}
