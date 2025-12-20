// Auth Provider (primary export)
export { AuthProvider, useAuth } from './auth-provider';

// Legacy context (for backward compatibility)
export * from './auth-context';

// Types
export * from './types';

// Utilities
export * from './utils';

// Re-export common types from lib/types
export type {
  User,
  Subscription,
  PlanType,
  BillingInterval,
  SubscriptionStatus,
  RegistrationParams,
  CheckoutParams,
} from '@/lib/types';
