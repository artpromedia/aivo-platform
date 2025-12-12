/**
 * Installation Billing Service
 *
 * Handles the linkage between marketplace installations and billing contracts.
 * This service coordinates with billing-svc to create/update contract line items
 * when paid marketplace items are installed.
 */

import { prisma } from '../prisma.js';
import type {
  MarketplaceBillingModel,
  MarketplaceBillingStatus,
  BillingMetadata,
} from '../types/marketplace.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ActivateBillingParams {
  installationId: string;
  tenantId: string;
  contractId?: string;
  seatQuantity?: number;
  activatedByUserId?: string;
}

interface ActivateBillingResult {
  success: boolean;
  installationId: string;
  billingStatus: MarketplaceBillingStatus;
  contractLineItemId?: string;
  error?: string;
}

interface DeactivateBillingParams {
  installationId: string;
  reason?: string;
  deactivatedByUserId?: string;
}

interface DeactivateBillingResult {
  success: boolean;
  installationId: string;
  billingStatus: MarketplaceBillingStatus;
  billingEndedAt?: Date;
  error?: string;
}

interface BillingSvcLineItemRequest {
  tenantId: string;
  contractId: string;
  sku: string;
  description: string;
  quantity: number;
  metadata?: {
    marketplaceInstallationId: string;
    marketplaceItemId: string;
    billingModel: string;
  };
}

interface BillingSvcLineItemResponse {
  lineItemId: string;
  contractId: string;
  sku: string;
  status: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class InstallationBillingService {
  private readonly billingSvcBaseUrl: string;

  constructor(billingSvcBaseUrl?: string) {
    this.billingSvcBaseUrl = billingSvcBaseUrl ?? process.env.BILLING_SVC_URL ?? 'http://localhost:3003';
  }

  /**
   * Activate billing for a marketplace installation.
   * This creates or updates a contract line item in billing-svc.
   */
  async activateBilling(params: ActivateBillingParams): Promise<ActivateBillingResult> {
    const { installationId, tenantId, contractId, seatQuantity, activatedByUserId } = params;

    // 1. Get installation with item details
    const installation = await prisma.marketplaceInstallation.findUnique({
      where: { id: installationId },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            vendorId: true,
            isFree: true,
            billingModel: true,
            billingSku: true,
            billingMetadataJson: true,
          },
        },
      },
    });

    if (!installation) {
      return {
        success: false,
        installationId,
        billingStatus: 'PENDING',
        error: 'Installation not found',
      };
    }

    // 2. Verify tenant matches
    if (installation.tenantId !== tenantId) {
      return {
        success: false,
        installationId,
        billingStatus: 'PENDING',
        error: 'Tenant ID mismatch',
      };
    }

    // 3. Check if item is free - no billing needed
    if (installation.item.isFree || installation.item.billingModel === 'FREE') {
      await prisma.marketplaceInstallation.update({
        where: { id: installationId },
        data: {
          billingStatus: 'ACTIVE',
          billingStartedAt: new Date(),
        },
      });

      return {
        success: true,
        installationId,
        billingStatus: 'ACTIVE',
      };
    }

    // 4. Ensure item has a billing SKU for paid items
    if (!installation.item.billingSku) {
      return {
        success: false,
        installationId,
        billingStatus: 'PENDING',
        error: 'Paid item missing billing SKU',
      };
    }

    // 5. Find or validate contract
    let activeContractId = contractId;
    if (!activeContractId) {
      // Try to find an active contract for this tenant
      activeContractId = await this.findActiveContractForTenant(tenantId);
    }

    if (!activeContractId) {
      return {
        success: false,
        installationId,
        billingStatus: 'PENDING',
        error: 'No active contract found for tenant',
      };
    }

    // 6. Calculate quantity based on billing model
    const quantity = this.calculateBillingQuantity(
      installation.item.billingModel as MarketplaceBillingModel,
      seatQuantity
    );

    // 7. Create contract line item in billing-svc
    try {
      const lineItemResponse = await this.createBillingLineItem({
        tenantId,
        contractId: activeContractId,
        sku: installation.item.billingSku,
        description: `Marketplace: ${installation.item.title}`,
        quantity,
        metadata: {
          marketplaceInstallationId: installationId,
          marketplaceItemId: installation.item.id,
          billingModel: installation.item.billingModel ?? 'FREE',
        },
      });

      // 8. Update installation with billing linkage
      await prisma.marketplaceInstallation.update({
        where: { id: installationId },
        data: {
          billingStatus: 'ACTIVE',
          billingStartedAt: new Date(),
          contractLineItemId: lineItemResponse.lineItemId,
          seatQuantity: quantity,
          billingMetadataJson: {
            contractId: activeContractId,
            activatedByUserId,
            activatedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        installationId,
        billingStatus: 'ACTIVE',
        contractLineItemId: lineItemResponse.lineItemId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating billing line item';
      return {
        success: false,
        installationId,
        billingStatus: 'PENDING',
        error: errorMessage,
      };
    }
  }

  /**
   * Deactivate billing for a marketplace installation.
   * This marks the installation as canceled and notifies billing-svc.
   */
  async deactivateBilling(params: DeactivateBillingParams): Promise<DeactivateBillingResult> {
    const { installationId, reason, deactivatedByUserId } = params;

    const installation = await prisma.marketplaceInstallation.findUnique({
      where: { id: installationId },
      select: {
        id: true,
        billingStatus: true,
        contractLineItemId: true,
        billingMetadataJson: true,
      },
    });

    if (!installation) {
      return {
        success: false,
        installationId,
        billingStatus: 'PENDING',
        error: 'Installation not found',
      };
    }

    // If there's a linked contract line item, cancel it in billing-svc
    if (installation.contractLineItemId) {
      try {
        await this.cancelBillingLineItem(installation.contractLineItemId, reason);
      } catch (error) {
        // Log but don't fail - we still want to update our local state
        console.error('Failed to cancel billing line item:', error);
      }
    }

    const now = new Date();
    const existingMetadata = (installation.billingMetadataJson ?? {}) as Record<string, unknown>;

    await prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        billingStatus: 'CANCELED',
        billingEndedAt: now,
        billingMetadataJson: {
          ...existingMetadata,
          canceledAt: now.toISOString(),
          canceledByUserId: deactivatedByUserId,
          cancelReason: reason,
        },
      },
    });

    return {
      success: true,
      installationId,
      billingStatus: 'CANCELED',
      billingEndedAt: now,
    };
  }

  /**
   * Update seat quantity for a per-seat billing installation.
   */
  async updateSeatQuantity(
    installationId: string,
    newQuantity: number,
    updatedByUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const installation = await prisma.marketplaceInstallation.findUnique({
      where: { id: installationId },
      include: {
        item: {
          select: { billingModel: true },
        },
      },
    });

    if (!installation) {
      return { success: false, error: 'Installation not found' };
    }

    if (installation.item.billingModel !== 'PER_SEAT') {
      return { success: false, error: 'Item does not use per-seat billing' };
    }

    if (installation.billingStatus !== 'ACTIVE') {
      return { success: false, error: 'Installation billing is not active' };
    }

    // Update line item in billing-svc if linked
    if (installation.contractLineItemId) {
      try {
        await this.updateBillingLineItemQuantity(installation.contractLineItemId, newQuantity);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update billing quantity',
        };
      }
    }

    const existingMetadata = (installation.billingMetadataJson ?? {}) as Record<string, unknown>;

    await prisma.marketplaceInstallation.update({
      where: { id: installationId },
      data: {
        seatQuantity: newQuantity,
        billingMetadataJson: {
          ...existingMetadata,
          lastQuantityUpdate: {
            previousQuantity: installation.seatQuantity,
            newQuantity,
            updatedAt: new Date().toISOString(),
            updatedByUserId,
          },
        },
      },
    });

    return { success: true };
  }

  /**
   * Check if a tenant has an active entitlement for a marketplace item.
   */
  async checkEntitlement(
    tenantId: string,
    itemId: string
  ): Promise<{ entitled: boolean; reason?: string }> {
    const installation = await prisma.marketplaceInstallation.findFirst({
      where: {
        tenantId,
        itemId,
        status: 'INSTALLED',
      },
      include: {
        item: {
          select: { isFree: true, billingModel: true },
        },
      },
    });

    if (!installation) {
      return { entitled: false, reason: 'No installation found' };
    }

    // Free items are always entitled once installed
    if (installation.item.isFree || installation.item.billingModel === 'FREE') {
      return { entitled: true };
    }

    // Paid items require active billing
    if (installation.billingStatus !== 'ACTIVE') {
      return { entitled: false, reason: 'Billing not active for installation' };
    }

    return { entitled: true };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════════

  private calculateBillingQuantity(
    billingModel: MarketplaceBillingModel,
    providedSeats?: number
  ): number {
    switch (billingModel) {
      case 'TENANT_FLAT':
        return 1;
      case 'PER_SEAT':
        return providedSeats ?? 1;
      case 'FREE':
      default:
        return 0;
    }
  }

  private async findActiveContractForTenant(tenantId: string): Promise<string | undefined> {
    // Call billing-svc to find active contract
    try {
      const response = await fetch(
        `${this.billingSvcBaseUrl}/api/contracts?tenantId=${tenantId}&status=ACTIVE`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json() as { data?: Array<{ id: string }> };
      return data.data?.[0]?.id;
    } catch {
      return undefined;
    }
  }

  private async createBillingLineItem(
    request: BillingSvcLineItemRequest
  ): Promise<BillingSvcLineItemResponse> {
    const response = await fetch(
      `${this.billingSvcBaseUrl}/api/contracts/${request.contractId}/line-items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: request.sku,
          description: request.description,
          quantity: request.quantity,
          metadata: request.metadata,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error((error as { message?: string }).message ?? 'Failed to create billing line item');
    }

    return response.json() as Promise<BillingSvcLineItemResponse>;
  }

  private async cancelBillingLineItem(lineItemId: string, reason?: string): Promise<void> {
    const response = await fetch(
      `${this.billingSvcBaseUrl}/api/line-items/${lineItemId}/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to cancel billing line item');
    }
  }

  private async updateBillingLineItemQuantity(lineItemId: string, quantity: number): Promise<void> {
    const response = await fetch(
      `${this.billingSvcBaseUrl}/api/line-items/${lineItemId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update billing line item quantity');
    }
  }
}

// Singleton instance
export const installationBillingService = new InstallationBillingService();
