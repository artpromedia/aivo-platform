'use client';

/**
 * Installation Billing Badge Component
 *
 * Displays billing status and model for marketplace installations.
 */

import type {
  MarketplaceBillingModel,
  MarketplaceBillingStatus,
} from '../../../lib/marketplace-api';
import {
  getBillingModelLabel,
  getBillingStatusLabel,
  getBillingStatusColor,
} from '../../../lib/marketplace-api';

interface InstallationBillingBadgeProps {
  isFree: boolean;
  billingModel: MarketplaceBillingModel | null;
  billingStatus: MarketplaceBillingStatus | null;
  seatQuantity?: number | null;
  showModel?: boolean;
}

export function InstallationBillingBadge({
  isFree,
  billingModel,
  billingStatus,
  seatQuantity,
  showModel = true,
}: InstallationBillingBadgeProps) {
  if (isFree || billingModel === 'FREE') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Free
      </span>
    );
  }

  const statusColor = getBillingStatusColor(billingStatus);
  const statusStyles: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center gap-1.5">
      {showModel && billingModel && (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {getBillingModelLabel(billingModel)}
          {billingModel === 'PER_SEAT' && seatQuantity && (
            <span className="ml-1 text-blue-500">({seatQuantity} seats)</span>
          )}
        </span>
      )}
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[statusColor]}`}
      >
        {getBillingStatusLabel(billingStatus)}
      </span>
    </div>
  );
}

interface BillingModelIndicatorProps {
  isFree: boolean;
  billingModel: MarketplaceBillingModel | null;
  priceCents?: number | null;
  billingMetadata?: {
    flatPriceCents?: number;
    pricePerSeatCents?: number;
    billingPeriod?: 'MONTHLY' | 'ANNUAL';
  } | null;
}

export function BillingModelIndicator({
  isFree,
  billingModel,
  priceCents,
  billingMetadata,
}: BillingModelIndicatorProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (isFree || billingModel === 'FREE') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="font-medium text-green-600">Free</span>
      </div>
    );
  }

  if (billingModel === 'TENANT_FLAT') {
    const price = billingMetadata?.flatPriceCents ?? priceCents ?? 0;
    const period = billingMetadata?.billingPeriod ?? 'ANNUAL';
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-text">{formatPrice(price)}</span>
        <span className="text-xs text-muted">
          {period === 'MONTHLY' ? '/month' : '/year'} flat rate
        </span>
      </div>
    );
  }

  if (billingModel === 'PER_SEAT') {
    const pricePerSeat = billingMetadata?.pricePerSeatCents ?? 0;
    const period = billingMetadata?.billingPeriod ?? 'ANNUAL';
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-text">{formatPrice(pricePerSeat)}</span>
        <span className="text-xs text-muted">
          per seat {period === 'MONTHLY' ? '/month' : '/year'}
        </span>
      </div>
    );
  }

  // Unknown/legacy pricing
  if (priceCents && priceCents > 0) {
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-text">{formatPrice(priceCents)}</span>
        <span className="text-xs text-muted">Contact for details</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted">
      Pricing not set
    </div>
  );
}
