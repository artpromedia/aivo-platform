/**
 * Billing API Client
 *
 * API client for billing operations including quotes, purchase orders,
 * renewals, enterprise sales, pilot programs, license vault, and feature flags.
 */

import {
  apiClient,
  serviceUrls,
  buildQueryString,
  type ApiClientOptions,
  type PaginatedResponse,
} from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Quotes
// ══════════════════════════════════════════════════════════════════════════════

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface Quote {
  id: string;
  billingAccountId: string;
  tenantId: string;
  quoteNumber: string;
  name: string | null;
  status: QuoteStatus;
  validUntil: string;
  currency: string;
  totalAmountCents: number;
  priceBookId: string | null;
  proposedStartDate: string | null;
  proposedEndDate: string | null;
  paymentTermsDays: number;
  sentAt: string | null;
  acceptedAt: string | null;
  createdBy: string | null;
  convertedContractId: string | null;
  tenantName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  sku: string;
  description: string;
  quantity: number;
  listPriceCents: number;
  unitPriceCents: number;
  discountPercent: number | null;
  totalAmountCents: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteWithLineItems extends Quote {
  lineItems: QuoteLineItem[];
}

export interface QuoteFilters {
  status?: QuoteStatus;
  tenantId?: string;
  billingAccountId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateQuoteInput {
  billingAccountId: string;
  tenantId: string;
  name?: string;
  validUntil: string;
  currency?: string;
  priceBookId?: string;
  proposedStartDate?: string;
  proposedEndDate?: string;
  paymentTermsDays?: number;
  createdBy?: string;
}

export interface UpdateQuoteInput {
  name?: string;
  validUntil?: string;
  proposedStartDate?: string;
  proposedEndDate?: string;
  paymentTermsDays?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Purchase Orders
// ══════════════════════════════════════════════════════════════════════════════

export type POStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  billingAccountId: string;
  tenantId: string;
  poNumber: string;
  quoteId: string | null;
  status: POStatus;
  amountCents: number;
  currency: string;
  validFrom: string;
  validTo: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  contractId: string | null;
  tenantName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POFilters {
  status?: POStatus;
  tenantId?: string;
  billingAccountId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApprovePOInput {
  reviewNotes?: string;
}

export interface RejectPOInput {
  reviewNotes: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Renewals
// ══════════════════════════════════════════════════════════════════════════════

export type RenewalStatus =
  | 'SCHEDULED'
  | 'DUE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NOT_RENEWING'
  | 'CHURNED';

export interface Renewal {
  id: string;
  contractId: string;
  contractNumber: string;
  tenantId: string;
  tenantName: string;
  status: RenewalStatus;
  dueDate: string;
  contractEndDate: string;
  totalValueCents: number;
  assignedTo: string | null;
  lastContactDate: string | null;
  quoteId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalFilters {
  status?: RenewalStatus;
  tenantId?: string;
  dueBefore?: string;
  dueAfter?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export type RenewalAction = 'start' | 'complete' | 'not_renewing' | 'churn';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Enterprise Sales
// ══════════════════════════════════════════════════════════════════════════════

export type CustomerType =
  | 'DISTRICT'
  | 'CHARTER_NETWORK'
  | 'PRIVATE_SCHOOL'
  | 'NONPROFIT'
  | 'GOVERNMENT'
  | 'RESELLER'
  | 'OTHER';

export interface EnterpriseCustomer {
  id: string;
  name: string;
  type: CustomerType;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string | null;
  billingContactEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  website: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    deals: number;
    contacts: number;
  };
}

export type DealStatus =
  | 'LEAD'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CONTRACT_SENT'
  | 'WON_PENDING'
  | 'WON_ACTIVE'
  | 'LOST'
  | 'CHURNED';
export type DealType = 'NEW_BUSINESS' | 'EXPANSION' | 'RENEWAL' | 'UPSELL';

export interface EnterpriseDeal {
  id: string;
  customerId: string;
  name: string;
  type: DealType;
  status: DealStatus;
  seats: number;
  pricePerSeatCents: number;
  totalValueCents: number;
  arrCents: number;
  termMonths: number;
  expectedCloseDate: string | null;
  probability: number | null;
  discountPercent: number | null;
  ownerId: string | null;
  externalCrmId: string | null;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    type: CustomerType;
  };
  _count: {
    licenses: number;
    provisioningBatches: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PipelineAnalytics {
  dealsByStatus: {
    status: DealStatus;
    _count: number;
    _sum: { totalValueCents: number | null; arrCents: number | null };
  }[];
  totals: {
    pipelineValueCents: number;
    wonValueCents: number;
    activeArrCents: number;
  };
  recentWins: {
    id: string;
    name: string;
    totalValueCents: number;
    customer: { name: string; type: CustomerType };
  }[];
}

export interface CustomerFilters {
  type?: CustomerType;
  salesRepId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DealFilters {
  customerId?: string;
  ownerId?: string;
  status?: DealStatus;
  type?: DealType;
  minValue?: number;
  maxValue?: number;
  limit?: number;
  offset?: number;
}

export interface CreateCustomerInput {
  name: string;
  type: CustomerType;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  billingContactEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  notes?: string;
}

export interface CreateDealInput {
  customerId: string;
  name: string;
  type: DealType;
  seats: number;
  pricePerSeatCents: number;
  termMonths?: number;
  startDate?: string;
  expectedCloseDate?: string;
  probability?: number;
  discountPercent?: number;
  products?: string[];
  notes?: string;
  externalCrmId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Pilot Programs
// ══════════════════════════════════════════════════════════════════════════════

export type PilotStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXTENDED'
  | 'CONVERTING'
  | 'CONVERTED'
  | 'EXPIRED'
  | 'CANCELLED';
export type PilotType =
  | 'DISTRICT_PILOT'
  | 'NONPROFIT_PILOT'
  | 'CHARTER_PILOT'
  | 'ENTERPRISE_TRIAL'
  | 'PROMOTIONAL';

export interface PilotProgram {
  id: string;
  tenantId: string;
  enterpriseCustomerId: string | null;
  enterpriseDealId: string | null;
  type: PilotType;
  status: PilotStatus;
  name: string;
  description: string | null;
  seats: number;
  seatsUsed: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  features: string[];
  successCriteria: Record<string, unknown> | null;
  autoConvertEnabled: boolean;
  conversionDiscountPct: number | null;
  conversionPricePerSeatCents: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PilotStats {
  byStatus: { status: PilotStatus; count: number }[];
  byType: { type: PilotType; count: number }[];
  conversionRate: number;
  totalSeats: number;
  seatsInUse: number;
  endingThisWeek: number;
  endingThisMonth: number;
}

export interface PilotFilters {
  tenantId?: string;
  enterpriseCustomerId?: string;
  status?: PilotStatus;
  type?: PilotType;
  endingWithinDays?: number;
  limit?: number;
  offset?: number;
}

export interface CreatePilotInput {
  tenantId: string;
  enterpriseCustomerId?: string;
  enterpriseDealId?: string;
  type: PilotType;
  name: string;
  description?: string;
  seats: number;
  durationDays?: number;
  startDate?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  features?: string[];
  successCriteria?: Record<string, unknown>;
  autoConvertEnabled?: boolean;
  conversionDiscountPct?: number;
  conversionPricePerSeatCents?: number;
  notes?: string;
}

export interface ExtendPilotInput {
  additionalDays: number;
  reason?: string;
}

export interface ConvertPilotInput {
  contractTermMonths?: number;
  pricePerSeatCents?: number;
  applyPromotionalPricing?: boolean;
  notes?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - License Vault
// ══════════════════════════════════════════════════════════════════════════════

export type LicenseType = 'SEAT' | 'ENTERPRISE' | 'TRIAL' | 'PROMOTIONAL' | 'NFR';
export type LicenseStatus = 'ISSUED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
export type CodeStatus = 'VALID' | 'REDEEMED' | 'EXPIRED' | 'REVOKED';
export type CodeType = 'REDEMPTION' | 'ACTIVATION' | 'ACCESS' | 'PIN';

export interface VaultLicense {
  id: string;
  tenantId: string;
  type: LicenseType;
  seats: number;
  seatsUsed: number;
  status: LicenseStatus;
  features: string[];
  issuedAt: string;
  expiresAt: string | null;
  activatedAt: string | null;
  enterpriseDealId: string | null;
  contractId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultCode {
  id: string;
  licenseId: string;
  codeType: CodeType;
  code?: string; // Only returned on creation
  status: CodeStatus;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface VaultAuditLog {
  id: string;
  licenseId: string | null;
  codeId: string | null;
  action: string;
  performedBy: string;
  timestamp: string;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
}

export interface LicenseFilters {
  tenantId?: string;
  type?: LicenseType;
  status?: LicenseStatus;
  enterpriseDealId?: string;
  limit?: number;
  offset?: number;
}

export interface VaultAuditFilters {
  licenseId?: string;
  codeId?: string;
  action?: string;
  performedBy?: string;
  limit?: number;
  offset?: number;
}

export interface VaultCodeFilters {
  status?: CodeStatus;
  campaignId?: string;
  batchId?: string;
  licenseId?: string;
  limit?: number;
  offset?: number;
}

export interface IssueLicenseInput {
  tenantId: string;
  type: LicenseType;
  seats?: number;
  features?: string[];
  expiresAt?: string;
  notes?: string;
  enterpriseDealId?: string;
  contractId?: string;
}

export interface GenerateCodesInput {
  licenseId: string;
  codeType: CodeType;
  count?: number;
  maxRedemptions?: number;
  expiresAt?: string;
}

export interface LicenseAllocationInput {
  licenseId: string;
  seatsToAllocate: number;
  targetTenantId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Feature Flags
// ══════════════════════════════════════════════════════════════════════════════

export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: ExperimentStatus;
  variants: FeatureVariant[];
  targetingRules: TargetingRule[] | null;
  defaultVariant: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureVariant {
  id: string;
  key: string;
  name: string;
  weight: number;
  payload: Record<string, unknown> | null;
}

export interface TargetingRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'contains';
  value: unknown;
  variant?: string;
}

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  variants: Omit<FeatureVariant, 'id'>[];
  defaultVariant: string;
  targetingRules?: TargetingRule[];
}

export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  name?: string;
  description?: string;
  variants?: Omit<FeatureVariant, 'id'>[];
  defaultVariant?: string;
  targetingRules?: TargetingRule[];
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES - Revenue Metrics
// ══════════════════════════════════════════════════════════════════════════════

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface RevenueMetrics {
  totalRevenueCents: number;
  mrrCents: number;
  arrCents: number;
  netNewMrrCents: number;
  expansionMrrCents: number;
  churnMrrCents: number;
  customerCount: number;
  avgRevenuePerCustomerCents: number;
  periodStart: string;
  periodEnd: string;
}

export interface MRRDataPoint {
  date: string;
  mrrCents: number;
  newMrrCents: number;
  expansionMrrCents: number;
  churnMrrCents: number;
  customerCount: number;
}

export interface BillingSummary {
  activeQuotes: number;
  pendingPOs: number;
  renewalsDue: number;
  totalPipelineValueCents: number;
  acceptedQuotesValueCents: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const BILLING_URL = serviceUrls.BILLING_SVC_URL;
const EXPERIMENTATION_URL = process.env.EXPERIMENTATION_SVC_URL || 'http://localhost:4025';

/**
 * Billing API client for platform admin operations
 */
export const billingApi = {
  // ────────────────────────────────────────────────────────────────────────────
  // QUOTES
  // ────────────────────────────────────────────────────────────────────────────

  async getQuotes(
    filters?: QuoteFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<Quote>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<Quote>>(BILLING_URL, `/admin/quotes${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getQuote(id: string, options?: ApiClientOptions): Promise<QuoteWithLineItems> {
    return apiClient<QuoteWithLineItems>(BILLING_URL, `/admin/quotes/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async createQuote(data: CreateQuoteInput, options?: ApiClientOptions): Promise<Quote> {
    return apiClient<Quote>(BILLING_URL, '/admin/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async updateQuote(
    id: string,
    data: UpdateQuoteInput,
    options?: ApiClientOptions
  ): Promise<Quote> {
    return apiClient<Quote>(BILLING_URL, `/admin/quotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async sendQuote(id: string, options?: ApiClientOptions): Promise<Quote> {
    return apiClient<Quote>(BILLING_URL, `/admin/quotes/${id}/send`, {
      method: 'POST',
      ...options,
    });
  },

  async acceptQuote(id: string, options?: ApiClientOptions): Promise<Quote> {
    return apiClient<Quote>(BILLING_URL, `/admin/quotes/${id}/accept`, {
      method: 'POST',
      ...options,
    });
  },

  async rejectQuote(id: string, reason?: string, options?: ApiClientOptions): Promise<Quote> {
    return apiClient<Quote>(BILLING_URL, `/admin/quotes/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // PURCHASE ORDERS
  // ────────────────────────────────────────────────────────────────────────────

  async getPurchaseOrders(
    filters?: POFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<PurchaseOrder>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<PurchaseOrder>>(
      BILLING_URL,
      `/admin/purchase-orders${query}`,
      {
        method: 'GET',
        ...options,
      }
    );
  },

  async getPurchaseOrder(id: string, options?: ApiClientOptions): Promise<PurchaseOrder> {
    return apiClient<PurchaseOrder>(BILLING_URL, `/admin/purchase-orders/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async approvePO(
    id: string,
    data?: ApprovePOInput,
    options?: ApiClientOptions
  ): Promise<PurchaseOrder> {
    return apiClient<PurchaseOrder>(BILLING_URL, `/admin/purchase-orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
      ...options,
    });
  },

  async rejectPO(
    id: string,
    data: RejectPOInput,
    options?: ApiClientOptions
  ): Promise<PurchaseOrder> {
    return apiClient<PurchaseOrder>(BILLING_URL, `/admin/purchase-orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // RENEWALS
  // ────────────────────────────────────────────────────────────────────────────

  async getRenewals(
    filters?: RenewalFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<Renewal>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<Renewal>>(BILLING_URL, `/admin/renewals${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getRenewal(id: string, options?: ApiClientOptions): Promise<Renewal> {
    return apiClient<Renewal>(BILLING_URL, `/admin/renewals/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async processRenewal(
    id: string,
    action: RenewalAction,
    notes?: string,
    options?: ApiClientOptions
  ): Promise<Renewal> {
    return apiClient<Renewal>(BILLING_URL, `/admin/renewals/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ENTERPRISE SALES - CUSTOMERS
  // ────────────────────────────────────────────────────────────────────────────

  async getCustomers(
    filters?: CustomerFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<EnterpriseCustomer>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<EnterpriseCustomer>>(
      BILLING_URL,
      `/enterprise/customers${query}`,
      {
        method: 'GET',
        ...options,
      }
    );
  },

  async getCustomer(id: string, options?: ApiClientOptions): Promise<EnterpriseCustomer> {
    return apiClient<EnterpriseCustomer>(BILLING_URL, `/enterprise/customers/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async createCustomer(
    data: CreateCustomerInput,
    options?: ApiClientOptions
  ): Promise<EnterpriseCustomer> {
    return apiClient<EnterpriseCustomer>(BILLING_URL, '/enterprise/customers', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async updateCustomer(
    id: string,
    data: Partial<CreateCustomerInput>,
    options?: ApiClientOptions
  ): Promise<EnterpriseCustomer> {
    return apiClient<EnterpriseCustomer>(BILLING_URL, `/enterprise/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ENTERPRISE SALES - DEALS
  // ────────────────────────────────────────────────────────────────────────────

  async getDeals(
    filters?: DealFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<EnterpriseDeal>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<EnterpriseDeal>>(BILLING_URL, `/enterprise/deals${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getDeal(id: string, options?: ApiClientOptions): Promise<EnterpriseDeal> {
    return apiClient<EnterpriseDeal>(BILLING_URL, `/enterprise/deals/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async createDeal(data: CreateDealInput, options?: ApiClientOptions): Promise<EnterpriseDeal> {
    return apiClient<EnterpriseDeal>(BILLING_URL, '/enterprise/deals', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async updateDeal(
    id: string,
    data: Partial<CreateDealInput> & { status?: DealStatus; lostReason?: string },
    options?: ApiClientOptions
  ): Promise<EnterpriseDeal> {
    return apiClient<EnterpriseDeal>(BILLING_URL, `/enterprise/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async winDeal(id: string, notes?: string, options?: ApiClientOptions): Promise<EnterpriseDeal> {
    return apiClient<EnterpriseDeal>(BILLING_URL, `/enterprise/deals/${id}/win`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
      ...options,
    });
  },

  async loseDeal(
    id: string,
    lostReason: string,
    options?: ApiClientOptions
  ): Promise<EnterpriseDeal> {
    return apiClient<EnterpriseDeal>(BILLING_URL, `/enterprise/deals/${id}/lose`, {
      method: 'POST',
      body: JSON.stringify({ lostReason }),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ENTERPRISE SALES - PIPELINE ANALYTICS
  // ────────────────────────────────────────────────────────────────────────────

  async getSalesPipeline(options?: ApiClientOptions): Promise<PipelineAnalytics> {
    return apiClient<PipelineAnalytics>(BILLING_URL, '/enterprise/analytics/pipeline', {
      method: 'GET',
      ...options,
    });
  },

  async getRevenueAnalytics(
    range?: DateRange,
    options?: ApiClientOptions
  ): Promise<RevenueMetrics> {
    const query = range ? buildQueryString(range) : '';
    return apiClient<RevenueMetrics>(BILLING_URL, `/enterprise/analytics/revenue${query}`, {
      method: 'GET',
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // PILOT PROGRAMS
  // ────────────────────────────────────────────────────────────────────────────

  async getPilotPrograms(
    filters?: PilotFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<PilotProgram>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<PilotProgram>>(BILLING_URL, `/pilots${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getPilotProgram(id: string, options?: ApiClientOptions): Promise<PilotProgram> {
    return apiClient<PilotProgram>(BILLING_URL, `/pilots/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async getPilotStats(options?: ApiClientOptions): Promise<PilotStats> {
    return apiClient<PilotStats>(BILLING_URL, '/pilots/stats', {
      method: 'GET',
      ...options,
    });
  },

  async createPilot(data: CreatePilotInput, options?: ApiClientOptions): Promise<PilotProgram> {
    return apiClient<PilotProgram>(BILLING_URL, '/pilots', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async extendPilot(
    id: string,
    data: ExtendPilotInput,
    options?: ApiClientOptions
  ): Promise<PilotProgram> {
    return apiClient<PilotProgram>(BILLING_URL, `/pilots/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async convertPilot(
    id: string,
    data?: ConvertPilotInput,
    options?: ApiClientOptions
  ): Promise<PilotProgram> {
    return apiClient<PilotProgram>(BILLING_URL, `/pilots/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
      ...options,
    });
  },

  async cancelPilot(
    id: string,
    reason?: string,
    options?: ApiClientOptions
  ): Promise<PilotProgram> {
    return apiClient<PilotProgram>(BILLING_URL, `/pilots/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // LICENSE VAULT
  // ────────────────────────────────────────────────────────────────────────────

  async getVaultLicenses(
    filters?: LicenseFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<VaultLicense>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<VaultLicense>>(BILLING_URL, `/vault/licenses${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getVaultLicense(id: string, options?: ApiClientOptions): Promise<VaultLicense> {
    return apiClient<VaultLicense>(BILLING_URL, `/vault/licenses/${id}`, {
      method: 'GET',
      ...options,
    });
  },

  async issueLicense(data: IssueLicenseInput, options?: ApiClientOptions): Promise<VaultLicense> {
    return apiClient<VaultLicense>(BILLING_URL, '/vault/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async activateLicense(id: string, options?: ApiClientOptions): Promise<VaultLicense> {
    return apiClient<VaultLicense>(BILLING_URL, `/vault/licenses/${id}/activate`, {
      method: 'POST',
      ...options,
    });
  },

  async suspendLicense(
    id: string,
    reason?: string,
    options?: ApiClientOptions
  ): Promise<VaultLicense> {
    return apiClient<VaultLicense>(BILLING_URL, `/vault/licenses/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...options,
    });
  },

  async reinstateLicense(id: string, options?: ApiClientOptions): Promise<VaultLicense> {
    return apiClient<VaultLicense>(BILLING_URL, `/vault/licenses/${id}/reinstate`, {
      method: 'POST',
      ...options,
    });
  },

  async revokeLicense(
    id: string,
    reason: string,
    options?: ApiClientOptions
  ): Promise<VaultLicense> {
    return apiClient<VaultLicense>(BILLING_URL, `/vault/licenses/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // LICENSE VAULT - CODES
  // ────────────────────────────────────────────────────────────────────────────

  async getVaultCodes(
    filters?: VaultCodeFilters,
    options?: ApiClientOptions
  ): Promise<VaultCode[]> {
    const query = filters ? buildQueryString(filters) : '';
    return apiClient<VaultCode[]>(BILLING_URL, `/vault/codes${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async generateCodes(data: GenerateCodesInput, options?: ApiClientOptions): Promise<VaultCode[]> {
    return apiClient<VaultCode[]>(BILLING_URL, '/vault/codes', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async revokeCode(id: string, reason: string, options?: ApiClientOptions): Promise<VaultCode> {
    return apiClient<VaultCode>(BILLING_URL, `/vault/codes/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // LICENSE VAULT - AUDIT
  // ────────────────────────────────────────────────────────────────────────────

  async getVaultAuditLogs(
    filters?: VaultAuditFilters,
    options?: ApiClientOptions
  ): Promise<PaginatedResponse<VaultAuditLog>> {
    const query = buildQueryString(filters ?? {});
    return apiClient<PaginatedResponse<VaultAuditLog>>(BILLING_URL, `/vault/audit${query}`, {
      method: 'GET',
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // FEATURE FLAGS (from experimentation-svc)
  // ────────────────────────────────────────────────────────────────────────────

  async getFeatureFlags(options?: ApiClientOptions): Promise<FeatureFlag[]> {
    return apiClient<FeatureFlag[]>(EXPERIMENTATION_URL, '/experiments', {
      method: 'GET',
      ...options,
    });
  },

  async getFeatureFlag(key: string, options?: ApiClientOptions): Promise<FeatureFlag> {
    return apiClient<FeatureFlag>(EXPERIMENTATION_URL, `/experiments/${key}`, {
      method: 'GET',
      ...options,
    });
  },

  async createFeatureFlag(
    data: CreateFeatureFlagInput,
    options?: ApiClientOptions
  ): Promise<FeatureFlag> {
    return apiClient<FeatureFlag>(EXPERIMENTATION_URL, '/experiments', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  async updateFeatureFlag(
    key: string,
    data: UpdateFeatureFlagInput,
    options?: ApiClientOptions
  ): Promise<FeatureFlag> {
    const action = data.enabled ? 'start' : 'pause';
    return apiClient<FeatureFlag>(EXPERIMENTATION_URL, `/experiments/${key}/${action}`, {
      method: 'POST',
      ...options,
    });
  },

  async startFeatureFlag(id: string, options?: ApiClientOptions): Promise<FeatureFlag> {
    return apiClient<FeatureFlag>(EXPERIMENTATION_URL, `/experiments/${id}/start`, {
      method: 'POST',
      ...options,
    });
  },

  async pauseFeatureFlag(id: string, options?: ApiClientOptions): Promise<FeatureFlag> {
    return apiClient<FeatureFlag>(EXPERIMENTATION_URL, `/experiments/${id}/pause`, {
      method: 'POST',
      ...options,
    });
  },

  async completeFeatureFlag(id: string, options?: ApiClientOptions): Promise<FeatureFlag> {
    return apiClient<FeatureFlag>(EXPERIMENTATION_URL, `/experiments/${id}/complete`, {
      method: 'POST',
      ...options,
    });
  },

  // ────────────────────────────────────────────────────────────────────────────
  // REVENUE METRICS
  // ────────────────────────────────────────────────────────────────────────────

  async getRevenueMetrics(range?: DateRange, options?: ApiClientOptions): Promise<RevenueMetrics> {
    const query = range ? buildQueryString(range) : '';
    return apiClient<RevenueMetrics>(BILLING_URL, `/admin/metrics/revenue${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getMRRHistory(range?: DateRange, options?: ApiClientOptions): Promise<MRRDataPoint[]> {
    const query = range ? buildQueryString(range) : '';
    return apiClient<MRRDataPoint[]>(BILLING_URL, `/admin/metrics/mrr-history${query}`, {
      method: 'GET',
      ...options,
    });
  },

  async getBillingSummary(options?: ApiClientOptions): Promise<BillingSummary> {
    return apiClient<BillingSummary>(BILLING_URL, '/admin/summary', {
      method: 'GET',
      ...options,
    });
  },
};

export default billingApi;
