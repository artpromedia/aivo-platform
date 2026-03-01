'use client';

import React, { useMemo } from 'react';
import { DollarSign, Info } from 'lucide-react';
import type { SubscriptionItemSummary } from '@/lib/billing-types';

interface SeatPreviewProps {
  activeAddons: SubscriptionItemSummary[];
  childName: string;
  billingPeriod: 'monthly' | 'yearly';
}

export function SeatPreview({ activeAddons, childName, billingPeriod }: SeatPreviewProps) {
  const perChildCost = useMemo(() => {
    return activeAddons
      .filter(item => item.sku !== 'BASE') // Base covers unlimited children
      .reduce((sum, item) => sum + item.unitPriceCents, 0);
  }, [activeAddons]);

  if (perChildCost === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-800">
            <strong>No additional cost.</strong> Your base plan covers unlimited children.
          </p>
        </div>
      </div>
    );
  }

  const suffix = billingPeriod === 'yearly' ? 'yr' : 'mo';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-medium text-amber-900">Billing Impact</p>
      </div>
      <p className="text-sm text-amber-800 mb-2">
        Adding {childName} will extend your add-on modules to include them:
      </p>
      <ul className="space-y-1">
        {activeAddons
          .filter(item => item.sku !== 'BASE')
          .map(item => (
            <li key={item.sku} className="text-sm text-amber-700 flex justify-between">
              <span>{item.displayName}</span>
              <span className="font-medium">
                +${(item.unitPriceCents / 100).toFixed(2)}/{suffix}
              </span>
            </li>
          ))
        }
      </ul>
      <div className="mt-2 pt-2 border-t border-amber-200 flex justify-between">
        <span className="text-sm font-medium text-amber-900">Total additional</span>
        <span className="text-sm font-bold text-amber-900">
          +${(perChildCost / 100).toFixed(2)}/{suffix}
        </span>
      </div>
    </div>
  );
}
