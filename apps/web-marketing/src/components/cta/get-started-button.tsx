'use client';

import { ArrowRight, Loader2, Check, Crown, Sparkles } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import type { PlanType, BillingInterval } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GetStartedButtonProps {
  // Optional plan pre-selection
  readonly plan?: PlanType;
  readonly interval?: BillingInterval;

  // Appearance
  readonly variant?: 'coral' | 'primary' | 'outline';
  readonly size?: 'default' | 'lg' | 'xl';
  readonly fullWidth?: boolean;
  readonly className?: string;

  // Custom labels
  readonly label?: string;
  readonly loadingLabel?: string;

  // Tracking
  readonly source?: string;
}

export function GetStartedButton({
  plan,
  interval = 'annual',
  variant = 'coral',
  size = 'lg',
  fullWidth = false,
  className,
  label,
  loadingLabel = 'Loading...',
  source = 'cta_button',
}: GetStartedButtonProps) {
  const {
    isAuthenticated,
    isLoading,
    hasActiveSubscription,
    navigateToRegister,
    navigateToDashboard,
    navigateToCheckout,
  } = useAuth();

  const handleClick = () => {
    if (isAuthenticated) {
      // User is logged in
      if (hasActiveSubscription) {
        // Has subscription - go to dashboard
        navigateToDashboard();
      } else if (plan && plan !== 'free') {
        // Has plan selected - go to checkout
        navigateToCheckout(plan, interval);
      } else {
        // No plan - go to dashboard
        navigateToDashboard();
      }
    } else {
      // Not logged in - register with optional plan context
      navigateToRegister({
        plan,
        interval,
        source,
      });
    }
  };

  // Determine label
  const getLabel = (): string => {
    if (label) return label;
    if (isLoading) return loadingLabel;

    if (isAuthenticated) {
      if (hasActiveSubscription) {
        return 'Go to Dashboard';
      }
      if (plan && plan !== 'free') {
        return `Get ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
      }
      return 'Go to Dashboard';
    }

    // Visitor
    if (plan === 'pro') return 'Start Pro Trial';
    if (plan === 'premium') return 'Start Premium Trial';
    return 'Get Started Free';
  };

  // Determine icon
  const getIcon = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (hasActiveSubscription) return <Check className="w-5 h-5" />;
    if (plan === 'premium') return <Crown className="w-5 h-5" />;
    if (plan === 'pro') return <Sparkles className="w-5 h-5" />;
    return <ArrowRight className="w-5 h-5" />;
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(fullWidth && 'w-full', className)}
    >
      {getLabel()}
      {getIcon()}
    </Button>
  );
}
