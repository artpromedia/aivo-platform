import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { SeatPreview } from '@/components/billing/SeatPreview';
import type { SubscriptionItemSummary } from '@/lib/billing-types';

describe('SeatPreview component', () => {
  it('shows no-cost message when there are no add-ons', () => {
    render(
      <SeatPreview
        activeAddons={[]}
        childName="Emma"
        billingPeriod="monthly"
      />,
    );
    expect(screen.getByText(/no additional cost/i)).toBeDefined();
    expect(screen.getByText(/base plan covers unlimited children/i)).toBeDefined();
  });

  it('shows no-cost message when only BASE sku is present', () => {
    const addons: SubscriptionItemSummary[] = [
      { sku: 'BASE', displayName: 'Base Plan', unitPriceCents: 0, active: true },
    ];
    render(
      <SeatPreview
        activeAddons={addons}
        childName="Emma"
        billingPeriod="monthly"
      />,
    );
    expect(screen.getByText(/no additional cost/i)).toBeDefined();
  });

  it('shows per-child cost for active add-ons (monthly)', () => {
    const addons: SubscriptionItemSummary[] = [
      { sku: 'MATH_TUTOR', displayName: 'Math Tutor', unitPriceCents: 999, active: true },
      { sku: 'ELA_TUTOR', displayName: 'ELA Tutor', unitPriceCents: 999, active: true },
    ];
    render(
      <SeatPreview
        activeAddons={addons}
        childName="Emma"
        billingPeriod="monthly"
      />,
    );
    // Header
    expect(screen.getByText('Billing Impact')).toBeDefined();
    // Child name in description
    expect(screen.getByText(/Adding Emma/)).toBeDefined();
    // Individual line items
    expect(screen.getByText('Math Tutor')).toBeDefined();
    expect(screen.getByText('ELA Tutor')).toBeDefined();
    // Per-item cost
    const priceLabels = screen.getAllByText(/\+\$9\.99\/mo/);
    expect(priceLabels.length).toBe(2);
    // Total
    expect(screen.getByText(/\+\$19\.98\/mo/)).toBeDefined();
  });

  it('uses yearly suffix for yearly billing period', () => {
    const addons: SubscriptionItemSummary[] = [
      { sku: 'MATH_TUTOR', displayName: 'Math Tutor', unitPriceCents: 7999, active: true },
    ];
    render(
      <SeatPreview
        activeAddons={addons}
        childName="Liam"
        billingPeriod="yearly"
      />,
    );
    // Line item + total both show the price (single add-on)
    const prices = screen.getAllByText(/\+\$79\.99\/yr/);
    expect(prices.length).toBe(2);
    expect(screen.getByText(/Adding Liam/)).toBeDefined();
  });

  it('shows total additional label', () => {
    const addons: SubscriptionItemSummary[] = [
      { sku: 'READING', displayName: 'Reading', unitPriceCents: 500, active: true },
    ];
    render(
      <SeatPreview
        activeAddons={addons}
        childName="test"
        billingPeriod="monthly"
      />,
    );
    expect(screen.getByText('Total additional')).toBeDefined();
    // Line item + total both show the price (single add-on)
    const prices = screen.getAllByText(/\+\$5\.00\/mo/);
    expect(prices.length).toBe(2);
  });
});
