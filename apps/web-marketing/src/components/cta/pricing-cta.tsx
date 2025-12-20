'use client';

import { ArrowRight, Check, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import type { PlanType, BillingInterval } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PricingCTAProps {
  readonly plan: PlanType;
  readonly interval: BillingInterval;
  readonly className?: string;
}

export function PricingCTA({ plan, interval, className }: PricingCTAProps) {
  const {
    subscription,
    isAuthenticated,
    isLoading,
    navigateToRegister,
    navigateToDashboard,
    navigateToCheckout,
  } = useAuth();

  const isCurrentPlan = subscription?.plan === plan;
  const isDowngrade =
    (subscription?.plan === 'premium' && plan === 'pro') ||
    (subscription?.plan === 'premium' && plan === 'free') ||
    (subscription?.plan === 'pro' && plan === 'free');

  const handleClick = () => {
    if (isCurrentPlan) {
      navigateToDashboard();
      return;
    }

    if (isDowngrade) {
      // Redirect to subscription management for downgrades
      navigateToDashboard('/settings/subscription');
      return;
    }

    if (plan === 'free') {
      if (isAuthenticated) {
        navigateToDashboard();
      } else {
        navigateToRegister({ plan: 'free', source: 'pricing' });
      }
      return;
    }

    // Pro or Premium upgrade
    if (isAuthenticated) {
      navigateToCheckout(plan, interval);
    } else {
      navigateToRegister({
        plan,
        interval,
        source: 'pricing',
      });
    }
  };

  const getLabel = (): string => {
    if (isLoading) return 'Loading...';
    if (isCurrentPlan) return 'Current Plan';
    if (isDowngrade) return 'Manage Plan';
    if (plan === 'free') return 'Get Started Free';
    if (isAuthenticated) return `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
    return 'Start Free Trial';
  };

  const getVariant = (): 'coral' | 'primary' | 'outline' => {
    if (isCurrentPlan || isDowngrade) return 'outline';
    if (plan === 'pro') return 'coral';
    if (plan === 'premium') return 'primary';
    return 'outline';
  };

  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    if (isCurrentPlan) {
      return <Check className="w-5 h-5" />;
    }
    return null;
  };

  return (
    <Button
      variant={getVariant()}
      size="lg"
      onClick={handleClick}
      disabled={isLoading}
      className={cn('w-full', className)}
    >
      {renderIcon()}
      {getLabel()}
      {!isCurrentPlan && !isLoading && <ArrowRight className="w-5 h-5" />}
    </Button>
  );
}
