'use client';

import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Shield,
  AlertTriangle,
  Check,
  Star,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import type { Subscription, PaymentMethod, BillingAddress } from '@/lib/billing-types';

interface BillingDetailsProps {
  subscription: Subscription | null;
  paymentMethods?: PaymentMethod[];
  defaultPaymentMethod?: PaymentMethod | null;
  billingAddress?: BillingAddress | null;
  onAddPaymentMethod?: () => void;
  onRemovePaymentMethod?: (id: string) => Promise<void>;
  onSetDefaultPaymentMethod?: (id: string) => Promise<void>;
  onManageInStripe?: () => void;
  isLoading?: boolean;
}

function getCardBrandLogo(brand: string): string {
  const brandLower = brand.toLowerCase();
  switch (brandLower) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
    case 'american_express':
      return 'Amex';
    case 'discover':
      return 'Discover';
    default:
      return brand;
  }
}

function getCardBrandColor(brand: string): string {
  const brandLower = brand.toLowerCase();
  switch (brandLower) {
    case 'visa':
      return 'bg-blue-600';
    case 'mastercard':
      return 'bg-red-500';
    case 'amex':
    case 'american_express':
      return 'bg-blue-400';
    case 'discover':
      return 'bg-orange-500';
    default:
      return 'bg-gray-600';
  }
}

export function BillingDetails({
  subscription,
  paymentMethods = [],
  defaultPaymentMethod,
  billingAddress,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPaymentMethod,
  onManageInStripe,
  isLoading = false,
}: BillingDetailsProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!onRemovePaymentMethod) return;
    setRemovingId(id);
    try {
      await onRemovePaymentMethod(id);
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!onSetDefaultPaymentMethod) return;
    setSettingDefaultId(id);
    try {
      await onSetDefaultPaymentMethod(id);
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Calculate next billing info
  const nextBillingDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-lg" />
          <div className="h-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Billing Details</h2>
        </div>
        {onManageInStripe && (
          <button
            onClick={onManageInStripe}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Manage in Stripe
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Next billing info */}
      {subscription && !subscription.cancelAtPeriodEnd && nextBillingDate && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Next billing date</span>
            <span className="text-sm font-medium text-gray-900">{nextBillingDate}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-600">Amount</span>
            <span className="text-sm font-medium text-gray-900">
              ${subscription.nextBillingAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Payment Methods</h3>
          {onAddPaymentMethod && (
            <button
              onClick={onAddPaymentMethod}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add new
            </button>
          )}
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
            <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No payment method on file</p>
            {onAddPaymentMethod && (
              <button
                onClick={onAddPaymentMethod}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Add Payment Method
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const isDefault = method.isDefault || method.id === defaultPaymentMethod?.id;
              const isExpiring = method.isExpiring;

              return (
                <div
                  key={method.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isDefault ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-6 ${getCardBrandColor(method.brand || 'card')} rounded flex items-center justify-center`}
                    >
                      <span className="text-white text-xs font-bold">
                        {getCardBrandLogo(method.brand || 'Card').substring(0, 4)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getCardBrandLogo(method.brand || 'Card')} ending in {method.last4}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </span>
                        {isDefault && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                            <Star className="w-3 h-3" />
                            Default
                          </span>
                        )}
                        {isExpiring && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Expiring soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isDefault && onSetDefaultPaymentMethod && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        disabled={settingDefaultId === method.id}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        title="Set as default"
                      >
                        {settingDefaultId === method.id ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {!isDefault && onRemovePaymentMethod && (
                      <button
                        onClick={() => handleRemove(method.id)}
                        disabled={removingId === method.id}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        {removingId === method.id ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing Address */}
      {billingAddress && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Billing Address
          </h3>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p>{billingAddress.name}</p>
            <p>{billingAddress.line1}</p>
            {billingAddress.line2 && <p>{billingAddress.line2}</p>}
            <p>
              {billingAddress.city}, {billingAddress.state} {billingAddress.postalCode}
            </p>
            <p>{billingAddress.country}</p>
          </div>
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t border-gray-100">
        <Shield className="w-4 h-4" />
        <span>Your payment information is securely stored and encrypted</span>
      </div>
    </div>
  );
}
