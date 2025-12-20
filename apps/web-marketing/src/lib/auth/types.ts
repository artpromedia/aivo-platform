export interface User {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'teacher' | 'admin' | 'learner';
  avatar?: string;
  subscription?: SubscriptionInfo;
  createdAt: string;
}

export interface SubscriptionInfo {
  id: string;
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RegistrationContext {
  plan?: 'free' | 'pro' | 'premium';
  billingInterval?: 'monthly' | 'annual';
  referralCode?: string;
  source?: string;
  returnUrl?: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: string;
}

export type PlanId = 'free' | 'pro' | 'premium';
export type BillingInterval = 'monthly' | 'annual';
