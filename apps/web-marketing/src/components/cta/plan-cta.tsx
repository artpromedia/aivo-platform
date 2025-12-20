'use client';

import { Check, ArrowRight, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import type { PlanType, BillingInterval } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UserWithSubscription {
  subscription?: {
    plan: string;
  };
}

interface PlanCTAProps {
  plan: PlanType;
  interval: BillingInterval;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  className?: string;
}

export function PlanCTA({
  plan,
  interval,
  price,
  originalPrice,
  popular = false,
  className,
}: PlanCTAProps) {
  const { user, isAuthenticated, isLoading, goToRegister, goToCheckout } = useAuth();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const userWithSub = user as (typeof user & UserWithSubscription) | null;
  const userPlan = userWithSub?.subscription?.plan;
  const isCurrentPlan = isAuthenticated && userPlan === plan;
  const hasHigherPlan = isAuthenticated && userPlan === 'premium' && plan !== 'premium';

  const handleClick = async () => {
    if (isCurrentPlan || hasHigherPlan) return;

    setIsProcessing(true);

    try {
      if (isAuthenticated) {
        // Logged in - go directly to checkout
        goToCheckout(plan, interval);
      } else {
        // Not logged in - go to registration with plan context
        goToRegister({
          plan,
          billingInterval: interval,
          source: 'pricing_page',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonLabel = () => {
    if (isProcessing || isLoading) return 'Loading...';
    if (isCurrentPlan) return 'Current Plan';
    if (hasHigherPlan) return 'Downgrade';
    if (plan === 'free') return 'Get Started Free';
    if (isAuthenticated) return `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
    return 'Start Free Trial';
  };

  const getButtonVariant = (): 'outline' | 'ghost' | 'coral' | 'primary' => {
    if (isCurrentPlan) return 'outline';
    if (hasHigherPlan) return 'ghost';
    if (popular) return 'coral';
    return plan === 'free' ? 'outline' : 'primary';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Price Display */}
      <div className="text-center">
        <div className="flex items-end justify-center gap-1">
          {originalPrice && originalPrice > price && (
            <span className="text-lg text-gray-400 line-through mb-1">${originalPrice}</span>
          )}
          <span className="text-4xl font-bold text-gray-900">
            ${price.toFixed(price === 0 ? 0 : 2)}
          </span>
          <span className="text-gray-500 mb-1">/month</span>
        </div>
        {interval === 'annual' && price > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Billed annually (${(price * 12).toFixed(2)}/year)
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Button
        variant={getButtonVariant()}
        size="lg"
        onClick={handleClick}
        disabled={isLoading || isProcessing || isCurrentPlan}
        className="w-full"
      >
        {(isLoading || isProcessing) && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
        {isCurrentPlan && <Check className="w-5 h-5 mr-2" />}
        {getButtonLabel()}
        {!isCurrentPlan && !isLoading && !isProcessing && <ArrowRight className="w-5 h-5 ml-2" />}
      </Button>

      {/* Trust indicators */}
      {plan !== 'free' && !isCurrentPlan && (
        <p className="text-xs text-gray-500 text-center">
          14-day free trial • No credit card required • Cancel anytime
        </p>
      )}
    </div>
  );
}
