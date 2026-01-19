'use client';

import { useState } from 'react';
import { Check, Sparkles, Tag, ArrowRight } from 'lucide-react';
import type { Plan, BillingPeriod, Coupon } from '@/lib/billing-types';

interface UpgradeOptionsProps {
  plans: Plan[];
  currentPlan?: Plan | null;
  onUpgrade: (planId: string, billingPeriod: BillingPeriod) => void;
  onApplyCoupon?: (code: string) => Promise<Coupon | null>;
  isLoading?: boolean;
}

export function UpgradeOptions({
  plans,
  currentPlan,
  onUpgrade,
  onApplyCoupon,
  isLoading = false,
}: UpgradeOptionsProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !onApplyCoupon) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const coupon = await onApplyCoupon(couponCode.trim());
      if (coupon) {
        setAppliedCoupon(coupon);
        setCouponCode('');
      } else {
        setCouponError('Invalid coupon code');
      }
    } catch {
      setCouponError('Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      await onUpgrade(planId, billingPeriod);
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const getPrice = (plan: Plan) => {
    return billingPeriod === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
  };

  const getMonthlyEquivalent = (plan: Plan) => {
    if (billingPeriod === 'YEARLY') {
      return plan.priceYearly / 12;
    }
    return plan.priceMonthly;
  };

  const getSavings = (plan: Plan) => {
    if (billingPeriod === 'YEARLY' && plan.priceMonthly > 0) {
      const monthlyTotal = plan.priceMonthly * 12;
      const savings = monthlyTotal - plan.priceYearly;
      const percentage = Math.round((savings / monthlyTotal) * 100);
      return { amount: savings, percentage };
    }
    return null;
  };

  const isCurrentPlan = (plan: Plan) => currentPlan?.id === plan.id;

  const getActionLabel = (plan: Plan) => {
    if (isCurrentPlan(plan)) return 'Current Plan';
    if (!currentPlan) return plan.priceMonthly === 0 ? 'Start Free' : 'Subscribe';
    if (currentPlan.priceMonthly > plan.priceMonthly) return 'Downgrade';
    return 'Upgrade';
  };

  // Sort plans by price for display
  const sortedPlans = [...plans].sort((a, b) => a.priceMonthly - b.priceMonthly);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setBillingPeriod('MONTHLY')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            billingPeriod === 'MONTHLY'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingPeriod('YEARLY')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            billingPeriod === 'YEARLY'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Yearly
          <span className="ml-1 text-xs text-green-600">Save 20%</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="space-y-4">
        {sortedPlans.map((plan) => {
          const price = getPrice(plan);
          const monthlyPrice = getMonthlyEquivalent(plan);
          const savings = getSavings(plan);
          const isCurrent = isCurrentPlan(plan);
          const actionLabel = getActionLabel(plan);
          const isUpgrading = upgradingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-4 transition-all ${
                plan.popular
                  ? 'border-indigo-500 bg-indigo-50/30'
                  : isCurrent
                  ? 'border-green-500 bg-green-50/30'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Your Plan
                </span>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{plan.description}</p>

                  {/* Key features - show first 3 */}
                  <ul className="mt-3 space-y-1">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-gray-500 ml-5">
                        +{plan.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {price === 0 ? (
                      'Free'
                    ) : (
                      <>
                        ${billingPeriod === 'YEARLY' ? monthlyPrice.toFixed(2) : price.toFixed(2)}
                        <span className="text-sm font-normal text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                  {billingPeriod === 'YEARLY' && price > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${price.toFixed(2)} billed yearly
                    </p>
                  )}
                  {savings && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Save ${savings.amount.toFixed(2)}/yr
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || isLoading || isUpgrading}
                className={`mt-4 w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {isUpgrading ? (
                  'Processing...'
                ) : (
                  <>
                    {actionLabel}
                    {!isCurrent && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Coupon Code Section */}
      {onApplyCoupon && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Tag className="w-4 h-4" />
            Have a coupon?
          </h3>

          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">
                  <strong>{appliedCoupon.code}</strong> applied -{' '}
                  {appliedCoupon.percentOff
                    ? `${appliedCoupon.percentOff}% off`
                    : `$${appliedCoupon.amountOff} off`}
                </span>
              </div>
              <button
                onClick={() => setAppliedCoupon(null)}
                className="text-xs text-green-700 hover:text-green-900 underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponError(null);
                }}
                placeholder="Enter coupon code"
                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  couponError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || isApplyingCoupon}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {isApplyingCoupon ? 'Applying...' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
        </div>
      )}

      {/* Info */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        All plans include a 7-day free trial. Cancel anytime.
      </p>
    </div>
  );
}
