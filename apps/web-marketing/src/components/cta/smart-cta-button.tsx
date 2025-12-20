'use client';

import { ArrowRight, Loader2, Check, Crown, Sparkles } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import type { PlanType, BillingInterval, RegistrationParams } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UserWithSubscription {
  subscription?: {
    plan: string;
    status: string;
  };
}

interface SmartCTAButtonProps {
  // Plan selection (optional - defaults to showing registration)
  plan?: PlanType;
  interval?: BillingInterval;

  // Display options
  variant?: 'primary' | 'coral' | 'outline' | 'ghost';
  size?: 'default' | 'lg' | 'xl';

  // Custom labels
  visitorLabel?: string;
  authenticatedLabel?: string;
  subscribedLabel?: string;
  trialLabel?: string;

  // Tracking
  source?: string;

  // Styling
  className?: string;
  showIcon?: boolean;
  fullWidth?: boolean;
}

export function SmartCTAButton({
  plan,
  interval = 'annual',
  variant = 'coral',
  size = 'lg',
  visitorLabel = 'Get Started Free',
  authenticatedLabel = 'Go to Dashboard',
  subscribedLabel = 'View Dashboard',
  trialLabel = 'Start Free Trial',
  source = 'cta_button',
  className,
  showIcon = true,
  fullWidth = false,
}: SmartCTAButtonProps) {
  const { user, isAuthenticated, isLoading, goToRegister, goToDashboard, goToCheckout } = useAuth();
  const userWithSub = user as (typeof user & UserWithSubscription) | null;

  const handleClick = () => {
    if (isAuthenticated && user) {
      // User is logged in
      const subscriptionStatus = userWithSub?.subscription?.status;
      if (subscriptionStatus === 'active') {
        // Has active subscription - go to dashboard
        goToDashboard();
      } else if (plan && plan !== 'free') {
        // No subscription but plan selected - go to checkout
        goToCheckout(plan, interval);
      } else {
        // Free plan or no plan selected - go to dashboard
        goToDashboard();
      }
    } else {
      // Not logged in - go to registration
      const context: RegistrationParams = {
        plan,
        interval,
        source,
      };
      goToRegister(context);
    }
  };

  // Determine button label based on auth state
  const getLabel = () => {
    if (isLoading) return 'Loading...';

    if (isAuthenticated && user) {
      const status = userWithSub?.subscription?.status;
      if (status === 'active') {
        return subscribedLabel;
      }
      if (status === 'trialing') {
        return 'Continue Trial';
      }
      if (plan && plan !== 'free') {
        return `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
      }
      return authenticatedLabel;
    }

    // Visitor
    if (plan === 'free') {
      return visitorLabel;
    }
    if (plan) {
      return trialLabel;
    }
    return visitorLabel;
  };

  // Determine icon based on state
  const getIcon = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" />;

    const iconStatus = userWithSub?.subscription?.status;
    if (isAuthenticated && iconStatus === 'active') {
      return <Check className="w-5 h-5" />;
    }

    if (plan === 'premium') {
      return <Crown className="w-5 h-5" />;
    }

    if (plan === 'pro') {
      return <Sparkles className="w-5 h-5" />;
    }

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
      {showIcon && getIcon()}
    </Button>
  );
}
