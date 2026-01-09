'use client';

/**
 * Marketplace Billing Section Component
 *
 * Shows marketplace items as line items in the billing overview,
 * including active subscriptions and their billing status.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge, Button } from '@aivo/ui-web';

import type {
  MarketplaceInstallationWithBilling,
  MarketplaceBillingModel,
  MarketplaceBillingStatus,
} from '../../../lib/marketplace-api';
import {
  listInstallationsWithBilling,
  getBillingModelLabel,
  getBillingStatusLabel,
  getBillingStatusColor,
} from '../../../lib/marketplace-api';
import { useAuth } from '../../providers';

interface MarketplaceBillingSectionProps {
  tenantId?: string;
}

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MarketplaceBillingSection({ tenantId: propTenantId }: MarketplaceBillingSectionProps) {
  const auth = useAuth();
  const tenantId = propTenantId ?? auth.tenantId;
  const [installations, setInstallations] = useState<MarketplaceInstallationWithBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    async function loadInstallations() {
      setLoading(true);
      setError(null);
      try {
        const result = await listInstallationsWithBilling(tenantId, {
          status: 'ACTIVE',
          limit: 100,
        });
        // Filter to only show paid items with active billing
        const paidInstallations = result.data.filter(
          (i) => !i.isFree && i.billingModel !== 'FREE'
        );
        setInstallations(paidInstallations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marketplace billing');
      } finally {
        setLoading(false);
      }
    }
    void loadInstallations();
  }, [tenantId]);

  // Calculate totals
  const totalMonthlyEstimate = installations.reduce((sum, inst) => {
    // This is a simplified estimate - real calculation would use contract line items
    if (inst.billingModel === 'PER_SEAT') {
      return sum + (inst.seatQuantity ?? 0) * 500; // Example: $5/seat/month
    }
    if (inst.billingModel === 'TENANT_FLAT') {
      return sum + 5000; // Example: $50/month flat
    }
    return sum;
  }, 0);

  if (loading) {
    return <MarketplaceBillingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (installations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Marketplace Subscriptions</h3>
            <p className="mt-1 text-sm text-muted">No paid marketplace items installed</p>
          </div>
          <Link href="/marketplace">
            <Button variant="secondary" size="sm">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Marketplace Subscriptions</h3>
            <p className="mt-1 text-sm text-muted">
              {installations.length} paid item{installations.length !== 1 ? 's' : ''} installed
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">Estimated Monthly</div>
            <div className="text-lg font-semibold text-text">
              {formatCurrency(totalMonthlyEstimate)}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {installations.map((installation) => (
          <MarketplaceLineItem key={installation.id} installation={installation} />
        ))}
      </div>

      <div className="border-t border-border bg-surface-muted/50 px-6 py-3">
        <Link
          href="/marketplace/installations"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all marketplace installations →
        </Link>
      </div>
    </div>
  );
}

function MarketplaceLineItem({
  installation,
}: {
  installation: MarketplaceInstallationWithBilling;
}) {
  const statusColor = getBillingStatusColor(installation.billingStatus);
  const statusTone = statusColor === 'green' ? 'success' : statusColor === 'yellow' ? 'warning' : 'neutral';

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {/* Icon */}
      {installation.marketplaceItem.iconUrl ? (
        <img
          src={installation.marketplaceItem.iconUrl}
          alt={`${installation.marketplaceItem.title} icon`}
          className="h-10 w-10 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted">
          <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/marketplace/items/${installation.marketplaceItem.slug}`}
            className="font-medium hover:text-primary hover:underline truncate"
          >
            {installation.marketplaceItem.title}
          </Link>
          {installation.billingSku && (
            <span className="text-xs text-muted font-mono">{installation.billingSku}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted">
          <span>{installation.marketplaceItem.vendor.name}</span>
          <span>•</span>
          <span>{getBillingModelLabel(installation.billingModel)}</span>
          {installation.billingModel === 'PER_SEAT' && installation.seatQuantity && (
            <>
              <span>•</span>
              <span>{installation.seatQuantity} seats</span>
            </>
          )}
        </div>
      </div>

      {/* Billing Status */}
      <div className="flex items-center gap-4">
        <Badge tone={statusTone}>{getBillingStatusLabel(installation.billingStatus)}</Badge>
        <div className="text-right text-sm">
          <div className="text-muted">Since</div>
          <div className="text-text">{formatDate(installation.billingStartedAt)}</div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceBillingSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-6 py-4">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-muted" />
            <div className="flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
