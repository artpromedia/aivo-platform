import { describe, it, expect } from 'vitest';

import type {
  User,
  RegistrationContext,
  SubscriptionInfo,
  AuthState,
  CheckoutSession,
  PlanId,
  BillingInterval,
} from '../src/lib/auth/types';

// ── User interface ───────────────────────────────────────────────

describe('User interface', () => {
  it('constructs a minimal user', () => {
    const user: User = {
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'parent',
      createdAt: '2024-01-01T00:00:00Z',
    };
    expect(user.role).toBe('parent');
    expect(user.avatar).toBeUndefined();
    expect(user.subscription).toBeUndefined();
  });

  it('supports all role values', () => {
    const roles: User['role'][] = ['parent', 'teacher', 'admin', 'learner'];
    expect(roles).toHaveLength(4);
  });

  it('accepts optional avatar and subscription', () => {
    const user: User = {
      id: 'u2',
      email: 'user@test.com',
      name: 'Full User',
      role: 'teacher',
      avatar: 'https://img.example.com/avatar.png',
      subscription: {
        id: 's1',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: '2025-01-01T00:00:00Z',
        cancelAtPeriodEnd: false,
      },
      createdAt: '2024-01-01T00:00:00Z',
    };
    expect(user.avatar).toBeTruthy();
    expect(user.subscription?.plan).toBe('pro');
  });
});

// ── SubscriptionInfo interface ───────────────────────────────────

describe('SubscriptionInfo interface', () => {
  it('supports all plan values', () => {
    const plans: SubscriptionInfo['plan'][] = ['free', 'pro', 'premium'];
    expect(plans).toHaveLength(3);
  });

  it('supports all status values', () => {
    const statuses: SubscriptionInfo['status'][] = [
      'active', 'trialing', 'past_due', 'canceled', 'incomplete',
    ];
    expect(statuses).toHaveLength(5);
  });
});

// ── AuthState interface ──────────────────────────────────────────

describe('AuthState interface', () => {
  it('constructs initial state', () => {
    const state: AuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    };
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('constructs authenticated state', () => {
    const state: AuthState = {
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'parent', createdAt: '' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    expect(state.user?.id).toBe('u1');
  });

  it('constructs error state', () => {
    const state: AuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'Network failed',
    };
    expect(state.error).toBe('Network failed');
  });
});

// ── RegistrationContext interface ────────────────────────────────

describe('RegistrationContext interface', () => {
  it('constructs an empty context', () => {
    const ctx: RegistrationContext = {};
    expect(ctx.plan).toBeUndefined();
    expect(ctx.billingInterval).toBeUndefined();
  });

  it('constructs a full context', () => {
    const ctx: RegistrationContext = {
      plan: 'pro',
      billingInterval: 'annual',
      referralCode: 'REF123',
      source: 'blog',
      returnUrl: '/dashboard',
    };
    expect(ctx.plan).toBe('pro');
    expect(ctx.billingInterval).toBe('annual');
  });
});

// ── CheckoutSession interface ────────────────────────────────────

describe('CheckoutSession interface', () => {
  it('constructs a valid session', () => {
    const session: CheckoutSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/session',
      expiresAt: '2025-01-01T01:00:00Z',
    };
    expect(session.url).toContain('stripe.com');
  });
});

// ── Type aliases ─────────────────────────────────────────────────

describe('PlanId type', () => {
  it('has three values', () => {
    const ids: PlanId[] = ['free', 'pro', 'premium'];
    expect(ids).toHaveLength(3);
  });
});

describe('BillingInterval type', () => {
  it('has two values', () => {
    const intervals: BillingInterval[] = ['monthly', 'annual'];
    expect(intervals).toHaveLength(2);
  });
});
