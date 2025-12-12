/**
 * Billing & Entitlements API Service
 *
 * Handles fetching seat usage, module entitlements, and invoice data
 * for the District Billing Dashboard.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SeatUsage {
  tenantId: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  lastUpdatedAt: string;
}

export interface ModuleEntitlement {
  id: string;
  tenantId: string;
  featureCode: string;
  featureName: string;
  isEnabled: boolean;
  source: string; // Plan SKU or 'ADD_ON' or 'TRIAL'
  expiresAt?: string | null;
}

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'PAST_DUE' | 'VOID' | 'UNCOLLECTIBLE';

export interface Invoice {
  id: string;
  billingAccountId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amountCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string | null;
  hostedInvoiceUrl?: string | null;
  hostedPdfUrl?: string | null;
  createdAt: string;
}

export interface BillingAccount {
  id: string;
  tenantId: string;
  displayName: string;
  billingEmail?: string;
  providerCustomerId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const entitlementsSvcUrl = process.env.ENTITLEMENTS_SVC_URL ?? 'http://localhost:4080';
const billingSvcUrl = process.env.BILLING_SVC_URL ?? 'http://localhost:4060';

const USE_MOCK = process.env.USE_BILLING_MOCK === 'true' || process.env.NODE_ENV === 'development';

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch seat usage for a tenant.
 */
export async function fetchSeatUsage(tenantId: string, accessToken?: string): Promise<SeatUsage> {
  if (USE_MOCK) {
    return mockSeatUsage(tenantId);
  }

  const res = await fetch(`${entitlementsSvcUrl}/entitlements/tenant/${tenantId}/seats`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch seat usage: ${res.status}`);
  }

  return res.json() as Promise<SeatUsage>;
}

/**
 * Fetch module entitlements for a tenant.
 */
export async function fetchModuleEntitlements(
  tenantId: string,
  accessToken?: string
): Promise<ModuleEntitlement[]> {
  if (USE_MOCK) {
    return mockModuleEntitlements(tenantId);
  }

  const res = await fetch(`${entitlementsSvcUrl}/entitlements/tenant/${tenantId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch entitlements: ${res.status}`);
  }

  const data = (await res.json()) as ModuleEntitlement[];
  return data.filter((e) => e.featureCode.startsWith('MODULE_'));
}

/**
 * Fetch billing account for current tenant.
 */
export async function fetchBillingAccount(
  tenantId: string,
  accessToken?: string
): Promise<BillingAccount | null> {
  if (USE_MOCK) {
    return mockBillingAccount(tenantId);
  }

  const res = await fetch(`${billingSvcUrl}/billing-accounts/by-tenant/${tenantId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch billing account: ${res.status}`);
  }

  return res.json() as Promise<BillingAccount>;
}

/**
 * Fetch invoices for a billing account.
 */
export async function fetchInvoices(
  billingAccountId: string,
  accessToken?: string
): Promise<Invoice[]> {
  if (USE_MOCK) {
    return mockInvoices(billingAccountId);
  }

  const res = await fetch(`${billingSvcUrl}/billing-accounts/${billingAccountId}/invoices`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch invoices: ${res.status}`);
  }

  return res.json() as Promise<Invoice[]>;
}

/**
 * Get CSV export URL for invoices.
 */
export function getInvoiceExportUrl(billingAccountId: string): string {
  if (USE_MOCK) {
    // In mock mode, return a data URL that triggers download
    return '#export-csv';
  }
  return `${billingSvcUrl}/billing-accounts/${billingAccountId}/invoices/export`;
}

/**
 * Export invoices to CSV (client-side fallback).
 */
export function exportInvoicesToCsv(invoices: Invoice[]): string {
  const headers = ['Invoice Number', 'Date', 'Period', 'Amount', 'Status', 'Paid Date'];
  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    new Date(inv.createdAt).toLocaleDateString(),
    `${new Date(inv.periodStart).toLocaleDateString()} - ${new Date(inv.periodEnd).toLocaleDateString()}`,
    formatCurrency(inv.amountCents, inv.currency),
    inv.status,
    inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
  return csvContent;
}

/**
 * Trigger CSV download in browser.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function formatCurrency(amountCents: number, currency = 'USD'): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    DRAFT: 'Draft',
    OPEN: 'Open',
    PAID: 'Paid',
    PAST_DUE: 'Past Due',
    VOID: 'Void',
    UNCOLLECTIBLE: 'Uncollectible',
  };
  return labels[status] || status;
}

export function getInvoiceStatusTone(
  status: InvoiceStatus
): 'neutral' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'OPEN':
      return 'info';
    case 'PAST_DUE':
      return 'error';
    case 'VOID':
    case 'UNCOLLECTIBLE':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getModuleDisplayName(featureCode: string): string {
  const names: Record<string, string> = {
    MODULE_ELA: 'English Language Arts (ELA)',
    MODULE_MATH: 'Mathematics',
    MODULE_SEL: 'Social-Emotional Learning',
    MODULE_SPEECH: 'Speech & Language',
    MODULE_SCIENCE: 'Science',
    MODULE_CODING: 'Coding & Computational Thinking',
    MODULE_WRITING: 'Creative Writing',
  };
  return names[featureCode] || featureCode.replace('MODULE_', '').replace(/_/g, ' ');
}

export function getSeatUsagePercentage(usage: SeatUsage): number {
  if (usage.totalSeats === 0) return 0;
  return Math.round((usage.usedSeats / usage.totalSeats) * 100);
}

export function getSeatUsageLevel(usage: SeatUsage): 'normal' | 'warning' | 'critical' {
  const percentage = getSeatUsagePercentage(usage);
  if (percentage >= 100) return 'critical';
  if (percentage >= 90) return 'warning';
  return 'normal';
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT TYPES & FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type ContractInvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';

export interface Contract {
  id: string;
  billingAccountId: string;
  tenantId: string;
  contractNumber: string;
  name: string | null;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  totalValueCents: number;
  currency: string;
  poNumber: string | null;
  primaryPoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractLineItem {
  id: string;
  contractId: string;
  productId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  seatEntitlementId: string | null;
}

export interface Quote {
  id: string;
  billingAccountId: string;
  tenantId: string;
  quoteNumber: string;
  status: QuoteStatus;
  validUntil: string;
  currency: string;
  totalAmountCents: number;
  priceBookId: string | null;
  createdAt: string;
  lineItems: QuoteLineItem[];
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  sku: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountPercent: number;
  totalCents: number;
}

export interface ContractInvoice {
  id: string;
  billingAccountId: string;
  contractId: string;
  invoiceNumber: string;
  status: ContractInvoiceStatus;
  issueDate: string;
  dueDate: string;
  amountDueCents: number;
  currency: string;
}

export interface SeatCommitment {
  productId: string;
  productName: string;
  committedSeats: number;
  assignedSeats: number;
  activeSeats: number;
}

export interface ContractOverview {
  contract: Contract | null;
  lineItems: ContractLineItem[];
  seatCommitments: SeatCommitment[];
  invoices: ContractInvoice[];
  daysUntilEnd: number;
  renewalStatus: string | null;
}

/**
 * Fetch active contract for a tenant.
 */
export async function fetchActiveContract(
  tenantId: string,
  accessToken?: string
): Promise<Contract | null> {
  if (USE_MOCK) {
    return mockActiveContract(tenantId);
  }

  const res = await fetch(`${billingSvcUrl}/contracts/by-tenant/${tenantId}/active`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch contract: ${res.status}`);
  }

  return res.json() as Promise<Contract>;
}

/**
 * Fetch contract line items.
 */
export async function fetchContractLineItems(
  contractId: string,
  accessToken?: string
): Promise<ContractLineItem[]> {
  if (USE_MOCK) {
    return mockContractLineItems(contractId);
  }

  const res = await fetch(`${billingSvcUrl}/contracts/${contractId}/line-items`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch contract line items: ${res.status}`);
  }

  return res.json() as Promise<ContractLineItem[]>;
}

/**
 * Fetch seat commitments and usage for a contract.
 */
export async function fetchSeatCommitments(
  contractId: string,
  accessToken?: string
): Promise<SeatCommitment[]> {
  if (USE_MOCK) {
    return mockSeatCommitments();
  }

  const res = await fetch(`${billingSvcUrl}/contracts/${contractId}/seat-commitments`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch seat commitments: ${res.status}`);
  }

  return res.json() as Promise<SeatCommitment[]>;
}

/**
 * Fetch contract invoices.
 */
export async function fetchContractInvoices(
  contractId: string,
  accessToken?: string
): Promise<ContractInvoice[]> {
  if (USE_MOCK) {
    return mockContractInvoices(contractId);
  }

  const res = await fetch(`${billingSvcUrl}/contracts/${contractId}/invoices`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch contract invoices: ${res.status}`);
  }

  return res.json() as Promise<ContractInvoice[]>;
}

/**
 * Fetch quotes for a tenant.
 */
export async function fetchQuotes(tenantId: string, accessToken?: string): Promise<Quote[]> {
  if (USE_MOCK) {
    return mockQuotes(tenantId);
  }

  const res = await fetch(`${billingSvcUrl}/quotes/by-tenant/${tenantId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch quotes: ${res.status}`);
  }

  return res.json() as Promise<Quote[]>;
}

/**
 * Fetch a single quote by ID.
 */
export async function fetchQuote(quoteId: string, accessToken?: string): Promise<Quote | null> {
  if (USE_MOCK) {
    const quotes = mockQuotes('mock-tenant');
    return quotes.find((q) => q.id === quoteId) ?? null;
  }

  const res = await fetch(`${billingSvcUrl}/quotes/${quoteId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch quote: ${res.status}`);
  }

  return res.json() as Promise<Quote>;
}

/**
 * Calculate days until contract end.
 */
export function calculateDaysUntilEnd(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get contract status display info.
 */
export function getContractStatusTone(
  status: ContractStatus
): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING_SIGNATURE':
      return 'warning';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'neutral';
  }
}

export function getQuoteStatusTone(
  status: QuoteStatus
): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'ACCEPTED':
      return 'success';
    case 'SENT':
      return 'neutral';
    case 'REJECTED':
    case 'EXPIRED':
      return 'error';
    default:
      return 'neutral';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

export function mockSeatUsage(tenantId: string): SeatUsage {
  return {
    tenantId,
    totalSeats: 500,
    usedSeats: 467,
    availableSeats: 33,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function mockModuleEntitlements(tenantId: string): ModuleEntitlement[] {
  return [
    {
      id: 'ent-ela',
      tenantId,
      featureCode: 'MODULE_ELA',
      featureName: 'English Language Arts',
      isEnabled: true,
      source: 'DISTRICT_PREMIUM',
    },
    {
      id: 'ent-math',
      tenantId,
      featureCode: 'MODULE_MATH',
      featureName: 'Mathematics',
      isEnabled: true,
      source: 'DISTRICT_PREMIUM',
    },
    {
      id: 'ent-sel',
      tenantId,
      featureCode: 'MODULE_SEL',
      featureName: 'Social-Emotional Learning',
      isEnabled: true,
      source: 'DISTRICT_PREMIUM',
    },
    {
      id: 'ent-speech',
      tenantId,
      featureCode: 'MODULE_SPEECH',
      featureName: 'Speech & Language',
      isEnabled: true,
      source: 'ADD_ON',
    },
    {
      id: 'ent-science',
      tenantId,
      featureCode: 'MODULE_SCIENCE',
      featureName: 'Science',
      isEnabled: false,
      source: 'DISTRICT_PREMIUM',
    },
    {
      id: 'ent-coding',
      tenantId,
      featureCode: 'MODULE_CODING',
      featureName: 'Coding',
      isEnabled: false,
      source: 'DISTRICT_PREMIUM',
    },
  ];
}

export function mockBillingAccount(tenantId: string): BillingAccount {
  return {
    id: `ba_${tenantId}`,
    tenantId,
    displayName: 'District Billing Account',
    billingEmail: 'billing@district.edu',
    providerCustomerId: 'cus_mock_123',
  };
}

export function mockInvoices(billingAccountId: string): Invoice[] {
  const now = new Date();
  return [
    {
      id: 'inv_001',
      billingAccountId,
      invoiceNumber: 'INV-2024-001',
      status: 'PAID',
      amountCents: 1250000, // $12,500
      currency: 'USD',
      periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
      dueDate: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      paidAt: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/mock_inv_001',
      hostedPdfUrl: 'https://invoice.stripe.com/i/mock_inv_001/pdf',
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
    },
    {
      id: 'inv_002',
      billingAccountId,
      invoiceNumber: 'INV-2024-002',
      status: 'OPEN',
      amountCents: 1250000,
      currency: 'USD',
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString(),
      paidAt: null,
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/mock_inv_002',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    },
    {
      id: 'inv_003',
      billingAccountId,
      invoiceNumber: 'INV-2023-012',
      status: 'PAID',
      amountCents: 1150000,
      currency: 'USD',
      periodStart: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString(),
      dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
      paidAt: new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString(),
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/mock_inv_003',
      hostedPdfUrl: 'https://invoice.stripe.com/i/mock_inv_003/pdf',
      createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

export function mockActiveContract(tenantId: string): Contract {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), 7, 1); // August 1st
  const endDate = new Date(now.getFullYear() + 1, 6, 31); // July 31st next year

  return {
    id: 'contract_001',
    billingAccountId: `ba_${tenantId}`,
    tenantId,
    contractNumber: 'AIVO-2024-001',
    name: 'District Premium License - SY 2024-25',
    status: 'ACTIVE',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalValueCents: 15000000, // $150,000
    currency: 'USD',
    poNumber: 'PO-2024-EDU-5678',
    primaryPoId: 'po_001',
    createdAt: new Date(now.getFullYear(), 6, 15).toISOString(),
    updatedAt: new Date(now.getFullYear(), 7, 1).toISOString(),
  };
}

export function mockContractLineItems(contractId: string): ContractLineItem[] {
  return [
    {
      id: 'cli_001',
      contractId,
      productId: 'prod_ela',
      sku: 'AIVO-ELA-SEAT',
      description: 'ELA Module - Per Seat License',
      quantity: 500,
      unitPriceCents: 10000, // $100/seat
      totalPriceCents: 5000000,
      seatEntitlementId: 'ent_ela_001',
    },
    {
      id: 'cli_002',
      contractId,
      productId: 'prod_math',
      sku: 'AIVO-MATH-SEAT',
      description: 'Math Module - Per Seat License',
      quantity: 500,
      unitPriceCents: 10000,
      totalPriceCents: 5000000,
      seatEntitlementId: 'ent_math_001',
    },
    {
      id: 'cli_003',
      contractId,
      productId: 'prod_sel',
      sku: 'AIVO-SEL-SEAT',
      description: 'SEL Module - Per Seat License',
      quantity: 500,
      unitPriceCents: 8000, // $80/seat
      totalPriceCents: 4000000,
      seatEntitlementId: 'ent_sel_001',
    },
    {
      id: 'cli_004',
      contractId,
      productId: 'prod_speech',
      sku: 'AIVO-SPEECH-SEAT',
      description: 'Speech & Language Add-On',
      quantity: 100,
      unitPriceCents: 10000,
      totalPriceCents: 1000000,
      seatEntitlementId: 'ent_speech_001',
    },
  ];
}

export function mockSeatCommitments(): SeatCommitment[] {
  return [
    {
      productId: 'prod_ela',
      productName: 'ELA Module',
      committedSeats: 500,
      assignedSeats: 467,
      activeSeats: 445,
    },
    {
      productId: 'prod_math',
      productName: 'Math Module',
      committedSeats: 500,
      assignedSeats: 467,
      activeSeats: 440,
    },
    {
      productId: 'prod_sel',
      productName: 'SEL Module',
      committedSeats: 500,
      assignedSeats: 350,
      activeSeats: 320,
    },
    {
      productId: 'prod_speech',
      productName: 'Speech & Language',
      committedSeats: 100,
      assignedSeats: 45,
      activeSeats: 42,
    },
  ];
}

export function mockContractInvoices(contractId: string): ContractInvoice[] {
  const now = new Date();
  return [
    {
      id: 'cinv_001',
      billingAccountId: 'ba_mock',
      contractId,
      invoiceNumber: 'AIVO-INV-2024-001',
      status: 'PAID',
      issueDate: new Date(now.getFullYear(), 7, 1).toISOString(),
      dueDate: new Date(now.getFullYear(), 7, 31).toISOString(),
      amountDueCents: 7500000, // $75,000 (50% upfront)
      currency: 'USD',
    },
    {
      id: 'cinv_002',
      billingAccountId: 'ba_mock',
      contractId,
      invoiceNumber: 'AIVO-INV-2025-001',
      status: 'SENT',
      issueDate: new Date(now.getFullYear() + 1, 0, 1).toISOString(),
      dueDate: new Date(now.getFullYear() + 1, 0, 31).toISOString(),
      amountDueCents: 7500000, // $75,000 (50% at midpoint)
      currency: 'USD',
    },
  ];
}

export function mockQuotes(tenantId: string): Quote[] {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  return [
    {
      id: 'quote_001',
      billingAccountId: `ba_${tenantId}`,
      tenantId,
      quoteNumber: 'AIVO-Q-2025-001',
      status: 'SENT',
      validUntil: validUntil.toISOString(),
      currency: 'USD',
      totalAmountCents: 16500000, // $165,000 (10% increase)
      priceBookId: 'pb_2025',
      createdAt: new Date().toISOString(),
      lineItems: [
        {
          id: 'qli_001',
          quoteId: 'quote_001',
          sku: 'AIVO-ELA-SEAT',
          productId: 'prod_ela',
          description: 'ELA Module - Per Seat License (Renewal)',
          quantity: 500,
          unitPriceCents: 11000, // $110/seat (10% increase)
          discountPercent: 0,
          totalCents: 5500000,
        },
        {
          id: 'qli_002',
          quoteId: 'quote_001',
          sku: 'AIVO-MATH-SEAT',
          productId: 'prod_math',
          description: 'Math Module - Per Seat License (Renewal)',
          quantity: 500,
          unitPriceCents: 11000,
          discountPercent: 0,
          totalCents: 5500000,
        },
        {
          id: 'qli_003',
          quoteId: 'quote_001',
          sku: 'AIVO-SEL-SEAT',
          productId: 'prod_sel',
          description: 'SEL Module - Per Seat License (Renewal)',
          quantity: 500,
          unitPriceCents: 8800,
          discountPercent: 0,
          totalCents: 4400000,
        },
        {
          id: 'qli_004',
          quoteId: 'quote_001',
          sku: 'AIVO-SPEECH-SEAT',
          productId: 'prod_speech',
          description: 'Speech & Language Add-On (Renewal)',
          quantity: 100,
          unitPriceCents: 11000,
          discountPercent: 0,
          totalCents: 1100000,
        },
      ],
    },
  ];
}
