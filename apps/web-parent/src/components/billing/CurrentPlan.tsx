'use client';

import { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Check,
  Sparkles,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { Subscription } from '@/lib/billing-types';

interface CurrentPlanProps {
  subscription: Subscription | null;
  onCancel?: () => void;
  onResume?: () => void;
  onChangePlan?: () => void;
}

type SubscriptionStatus = Subscription['status'];

function getStatusBadge(status: SubscriptionStatus): { color: string; label: string; icon?: React.ReactNode } {
  switch (status) {
    case 'active':
      return { color: 'bg-green-100 text-green-800', label: 'Active', icon: <Check className="w-3 h-3" /> };
    case 'trialing':
      return { color: 'bg-blue-100 text-blue-800', label: 'Trial', icon: <Clock className="w-3 h-3" /> };
    case 'past_due':
      return { color: 'bg-red-100 text-red-800', label: 'Past Due', icon: <AlertTriangle className="w-3 h-3" /> };
    case 'canceled':
      return { color: 'bg-gray-100 text-gray-800', label: 'Canceled' };
    case 'expired':
      return { color: 'bg-gray-100 text-gray-500', label: 'Expired' };
    case 'paused':
      return { color: 'bg-amber-100 text-amber-800', label: 'Paused' };
    case 'incomplete':
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Incomplete' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: 'None' };
  }
}

export function CurrentPlan({ subscription, onCancel, onResume, onChangePlan }: CurrentPlanProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (!subscription) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No active subscription</p>
          <p className="text-sm text-gray-500 mb-4">
            Choose a plan to unlock all learning features for your children.
          </p>
          <button
            onClick={onChangePlan}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(subscription.status);
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const daysLeftInPeriod = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isTrialing = subscription.status === 'trialing' && subscription.trialEndDate;
  const trialDaysLeft = isTrialing && subscription.trialEndDate
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    onCancel?.();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Past Due Alert */}
        {subscription.status === 'past_due' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Payment Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                Your last payment failed. Please update your payment method to continue your subscription.
              </p>
            </div>
          </div>
        )}

        {/* Trial Banner */}
        {isTrialing && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Free Trial</h3>
              <p className="text-sm text-blue-700 mt-1">
                You have <strong>{trialDaysLeft} days</strong> left in your free trial.
                Add a payment method to continue after the trial ends.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">
                {subscription.plan?.name || 'Unknown'} Plan
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                {statusBadge.icon}
                {statusBadge.label}
              </span>
            </div>
            <p className="text-gray-600">
              ${subscription.pricePerPeriod.toFixed(2)}/{subscription.billingPeriod === 'MONTHLY' ? 'month' : 'year'}
            </p>
            {subscription.plan?.description && (
              <p className="text-sm text-gray-500 mt-1">{subscription.plan.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'}{' '}
              {periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {daysLeftInPeriod} day{daysLeftInPeriod !== 1 ? 's' : ''} left in billing period
            </p>
          </div>
        </div>

        {/* Features list */}
        {subscription.plan?.features && subscription.plan.features.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Included in your plan:</p>
            <ul className="grid grid-cols-2 gap-2">
              {subscription.plan.features.slice(0, 6).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {subscription.plan.features.length > 6 && (
              <p className="text-sm text-gray-500 mt-2">
                +{subscription.plan.features.length - 6} more features
              </p>
            )}
          </div>
        )}

        {/* Seats info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Child seats: {subscription.usedSeats} of {subscription.totalSeats} used
            </span>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${(subscription.usedSeats / subscription.totalSeats) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cancellation notice */}
        {subscription.cancelAtPeriodEnd && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800 flex items-center justify-between">
            <span>
              Your subscription will end on {periodEnd.toLocaleDateString()}.
            </span>
            <button
              onClick={onResume}
              className="font-medium text-amber-900 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Resume
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
          {!subscription.cancelAtPeriodEnd && subscription.status !== 'canceled' && (
            <button
              onClick={handleCancelClick}
              className="text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              Cancel subscription
            </button>
          )}
          {subscription.cancelAtPeriodEnd && <div />}
          <button
            onClick={onChangePlan}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {subscription.cancelAtPeriodEnd ? 'Resubscribe' : 'Change plan'}
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-4">
              Your subscription will remain active until the end of your current billing period
              ({periodEnd.toLocaleDateString()}). You won&apos;t be charged again.
            </p>
            <div className="bg-amber-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-amber-800">
                After cancellation, your children will lose access to premium features and modules.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
