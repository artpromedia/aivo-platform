/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-argument */
/**
 * Enterprise Billing Service Tests
 *
 * Tests for:
 *  1. Contract creation (createDistrictContract)
 *  2. Invoice generation (generateInvoice)
 *  3. Payment recording (recordPayment)
 *  4. Student count sync with 5% overage detection
 *  5. Invoice PDF redirect endpoint
 *  6. Pilot activation (activatePilot)
 *  7. Invoice scheduler (runInvoiceGeneration)
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════════

// Mock prisma — must be declared before importing service
vi.mock('../src/prisma.js', () => ({
  prisma: {
    districtBillingProfile: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    billingAccount: {
      create: vi.fn(),
    },
    priceBook: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    contract: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    districtInvoice: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    pilotProgram: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../src/config.js', () => ({
  config: {
    port: 4060,
    host: '0.0.0.0',
    services: {
      tenant: 'http://tenant-svc:3000',
      notify: 'http://notify-svc:3000',
    },
  },
}));

// Mock billing publisher
vi.mock('../src/events/billing.publisher.js', () => ({
  billingEventPublisher: {
    publish: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn(),
    close: vi.fn(),
  },
  BillingEventType: {
    INVOICE_CREATED: 'billing.invoice.created',
    INVOICE_PAID: 'billing.invoice.paid',
    REMINDER_PILOT_ENDING: 'billing.reminder.pilot_ending',
  },
}));

// Mock pdfkit
vi.mock('pdfkit', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      fontSize: vi.fn().mockReturnThis(),
      font: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      moveDown: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockImplementation(function (this: { end: () => void }, writable: NodeJS.WritableStream) {
        // Write a small buffer so the promise resolves
        writable.write(Buffer.from('%PDF-1.4 mock'));
        writable.end();
        return writable;
      }),
      end: vi.fn(),
    })),
  };
});

// Mock fs/path for local PDF fallback
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn().mockResolvedValue({
  ok: false,
  json: vi.fn().mockResolvedValue({}),
});
vi.stubGlobal('fetch', mockFetch);

// ═══════════════════════════════════════════════════════════════════════════════
// Imports (after mocks)
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '../src/prisma.js';
import { billingEventPublisher } from '../src/events/billing.publisher.js';
import { EnterpriseBillingService } from '../src/enterprise/enterprise-billing.service.js';
import { runInvoiceGeneration } from '../src/enterprise/invoice-scheduler.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════════

const service = new EnterpriseBillingService();

const MOCK_PROFILE = {
  id: 'profile-1',
  billingAccountId: 'ba-1',
  tenantId: 'tenant-dist-001',
  billingContactName: 'Jane Admin',
  billingContactEmail: 'jane@school.edu',
  paymentTermsDays: 30,
  isTaxExempt: true,
  requiresPO: true,
};

const MOCK_PRICEBOOK = {
  id: 'pb-1',
  name: 'Enterprise Default',
  isDefault: true,
  currency: 'USD',
  status: 'ACTIVE',
};

function mockContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    billingProfileId: 'profile-1',
    tenantId: 'tenant-dist-001',
    contractNumber: 'DST-2025-00001',
    name: 'District License — 500 students',
    startDate: new Date('2025-08-01'),
    endDate: new Date('2026-07-31'),
    status: 'ACTIVE',
    priceBookId: 'pb-1',
    poNumber: 'PO-2025-001',
    paymentType: 'INVOICE',
    totalValueCents: BigInt(2400000),
    currency: 'USD',
    createdAt: new Date('2025-07-01'),
    metadataJson: {
      contractType: 'annual',
      studentCount: 500,
      currentStudentCount: 0,
      pricePerStudent: 4.0,
      paymentTerms: 'NET_30',
      contactEmail: 'jane@school.edu',
      contactName: 'Jane Admin',
    },
    billingProfile: MOCK_PROFILE,
    ...overrides,
  };
}

function mockInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    billingAccountId: 'ba-1',
    contractId: 'contract-1',
    invoiceNumber: 'INV-2025-001',
    status: 'SENT',
    issueDate: new Date('2025-08-01'),
    dueDate: new Date('2025-08-31'),
    amountDueCents: BigInt(200000),
    amountPaidCents: BigInt(0),
    currency: 'USD',
    poNumber: 'PO-2025-001',
    pdfUrl: '/invoices/INV-2025-001.pdf',
    paymentReference: null,
    paidAt: null,
    createdAt: new Date('2025-08-01'),
    metadataJson: {
      lineItems: [
        { description: 'Student Licenses (500 students × $4.00/student)', quantity: 500, unitPrice: 4.0, total: 2000 },
      ],
      periodStart: '2025-08-01T00:00:00.000Z',
      periodEnd: '2026-08-01T00:00:00.000Z',
      subtotalCents: 200000,
      taxAmountCents: 0,
      totalCents: 200000,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({}) });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. Contract Creation
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.createDistrictContract', () => {
  it('creates a contract with automatic first invoice', async () => {
    // Setup mocks
    (prisma.districtBillingProfile.findFirst as Mock).mockResolvedValue(MOCK_PROFILE);
    (prisma.priceBook.findFirst as Mock).mockResolvedValue(MOCK_PRICEBOOK);
    (prisma.contract.count as Mock).mockResolvedValue(0);
    (prisma.contract.create as Mock).mockResolvedValue(mockContract());

    // For generateInvoice (called inside createDistrictContract)
    (prisma.contract.findUniqueOrThrow as Mock).mockResolvedValue(mockContract());
    (prisma.districtInvoice.count as Mock).mockResolvedValue(0);
    (prisma.districtInvoice.create as Mock).mockResolvedValue(mockInvoice());
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue({
      ...mockInvoice(),
      contract: mockContract(),
    });
    (prisma.districtInvoice.update as Mock).mockResolvedValue(mockInvoice());

    const result = await service.createDistrictContract({
      districtId: 'tenant-dist-001',
      contractType: 'annual',
      studentCount: 500,
      pricePerStudent: 4.0,
      startDate: '2025-08-01',
      endDate: '2026-07-31',
      paymentTerms: 'NET_30',
      poNumber: 'PO-2025-001',
      contactEmail: 'jane@school.edu',
      contactName: 'Jane Admin',
    });

    // Assertions
    expect(result.contractNumber).toMatch(/^DST-\d{4}-\d{5}$/);
    expect(result.tenantId).toBe('tenant-dist-001');
    expect(result.studentCount).toBe(500);
    expect(result.totalValueCents).toBe(2400000); // 500 × $4 × 12 months × 100
    expect(result.firstInvoiceId).toBeDefined();
    expect(result.status).toBe('ACTIVE');

    // Contract was created with correct data
    expect(prisma.contract.create).toHaveBeenCalledOnce();
    const createCall = (prisma.contract.create as Mock).mock.calls[0]![0];
    expect(createCall.data.tenantId).toBe('tenant-dist-001');
    expect(createCall.data.status).toBe('ACTIVE');

    // NATS event was published
    expect(billingEventPublisher.publish).toHaveBeenCalled();

    // Email was sent
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/notify/email'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates billing profile if one does not exist', async () => {
    (prisma.districtBillingProfile.findFirst as Mock).mockResolvedValue(null);
    (prisma.billingAccount.create as Mock).mockResolvedValue({ id: 'ba-new' });
    (prisma.districtBillingProfile.create as Mock).mockResolvedValue({
      ...MOCK_PROFILE,
      id: 'profile-new',
      billingAccountId: 'ba-new',
    });
    (prisma.priceBook.findFirst as Mock).mockResolvedValue(MOCK_PRICEBOOK);
    (prisma.contract.count as Mock).mockResolvedValue(0);
    (prisma.contract.create as Mock).mockResolvedValue(mockContract());
    (prisma.contract.findUniqueOrThrow as Mock).mockResolvedValue(mockContract());
    (prisma.districtInvoice.count as Mock).mockResolvedValue(0);
    (prisma.districtInvoice.create as Mock).mockResolvedValue(mockInvoice());
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue({
      ...mockInvoice(),
      contract: mockContract(),
    });
    (prisma.districtInvoice.update as Mock).mockResolvedValue(mockInvoice());

    await service.createDistrictContract({
      districtId: 'tenant-new',
      contractType: 'annual',
      studentCount: 100,
      pricePerStudent: 4.0,
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      paymentTerms: 'NET_30',
      contactEmail: 'admin@newschool.edu',
      contactName: 'New Admin',
    });

    expect(prisma.billingAccount.create).toHaveBeenCalledOnce();
    expect(prisma.districtBillingProfile.create).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Invoice Generation
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.generateInvoice', () => {
  it('generates an invoice with correct line items and amounts', async () => {
    (prisma.contract.findUniqueOrThrow as Mock).mockResolvedValue(mockContract());
    (prisma.districtInvoice.count as Mock).mockResolvedValue(0);
    (prisma.districtInvoice.create as Mock).mockResolvedValue(mockInvoice());
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue({
      ...mockInvoice(),
      contract: mockContract(),
    });
    (prisma.districtInvoice.update as Mock).mockResolvedValue(mockInvoice());

    const result = await service.generateInvoice(
      'contract-1',
      new Date('2025-08-01'),
      new Date('2026-08-01'),
    );

    expect(result.invoiceNumber).toMatch(/^INV-\d{4}-\d{3}$/);
    expect(result.contractId).toBe('contract-1');
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0]!.quantity).toBe(500);
    expect(result.subtotal).toBe(2000); // 500 × $4.00
    expect(result.taxAmount).toBe(0); // Tax-exempt
    expect(result.total).toBe(2000);
    expect(result.pdfUrl).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Payment Recording
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.recordPayment', () => {
  it('records payment and publishes INVOICE_PAID event', async () => {
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue({
      ...mockInvoice(),
      contract: mockContract(),
    });
    (prisma.districtInvoice.update as Mock).mockResolvedValue({
      ...mockInvoice(),
      status: 'PAID',
      amountPaidCents: BigInt(200000),
    });
    (prisma.districtInvoice.count as Mock).mockResolvedValue(0); // No pending invoices

    await service.recordPayment('inv-1', {
      amount: 2000.0,
      method: 'bank_transfer',
      referenceNumber: 'WIRE-20250815-001',
      paidAt: '2025-08-15T10:00:00Z',
    });

    // Invoice updated to PAID
    expect(prisma.districtInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          status: 'PAID',
          amountPaidCents: BigInt(200000),
        }),
      }),
    );

    // NATS event published
    expect(billingEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'billing.invoice.paid',
        invoiceId: 'inv-1',
        amount: 2000.0,
        method: 'bank_transfer',
      }),
    );

    // Confirmation email sent
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/notify/email'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Student Count Sync with 5% Overage Detection
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.syncStudentCount', () => {
  it('detects overage when enrollment exceeds 5% buffer', async () => {
    const contract = mockContract({
      metadataJson: {
        contractType: 'annual',
        studentCount: 500,
        currentStudentCount: 400,
        pricePerStudent: 4.0,
        paymentTerms: 'NET_30',
        contactEmail: 'jane@school.edu',
        contactName: 'Jane Admin',
      },
    });

    (prisma.contract.findFirst as Mock).mockResolvedValue(contract);

    // Tenant-svc returns 540 students (exceeds 500 × 1.05 = 525)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ count: 540 }),
    });

    (prisma.contract.update as Mock).mockResolvedValue(contract);

    // Mock overage invoice generation
    (prisma.contract.findUniqueOrThrow as Mock).mockResolvedValue(contract);
    (prisma.districtInvoice.count as Mock).mockResolvedValue(5);
    (prisma.districtInvoice.create as Mock).mockResolvedValue(
      mockInvoice({ id: 'overage-inv-1', invoiceNumber: 'INV-2025-006' }),
    );
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue({
      ...mockInvoice({ id: 'overage-inv-1' }),
      contract,
    });
    (prisma.districtInvoice.update as Mock).mockResolvedValue(
      mockInvoice({ id: 'overage-inv-1' }),
    );

    const result = await service.syncStudentCount('tenant-dist-001');

    expect(result.overageDetected).toBe(true);
    expect(result.currentStudents).toBe(540);
    expect(result.contractedStudents).toBe(500);
    expect(result.overageInvoiceId).toBeDefined();
    expect(result.utilizationPercent).toBe(108); // 540/500 × 100
  });

  it('does NOT flag overage when within 5% buffer', async () => {
    const contract = mockContract({
      metadataJson: {
        contractType: 'annual',
        studentCount: 500,
        currentStudentCount: 400,
        pricePerStudent: 4.0,
        paymentTerms: 'NET_30',
        contactEmail: 'jane@school.edu',
        contactName: 'Jane Admin',
      },
    });

    (prisma.contract.findFirst as Mock).mockResolvedValue(contract);

    // Tenant-svc returns 520 students (within 500 × 1.05 = 525)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ count: 520 }),
    });

    (prisma.contract.update as Mock).mockResolvedValue(contract);

    const result = await service.syncStudentCount('tenant-dist-001');

    expect(result.overageDetected).toBe(false);
    expect(result.currentStudents).toBe(520);
    expect(result.overageInvoiceId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Invoice PDF Redirect
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.getInvoicePdfUrl', () => {
  it('returns the PDF URL for an invoice', async () => {
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue(
      mockInvoice({ pdfUrl: '/invoices/INV-2025-001.pdf' }),
    );

    const url = await service.getInvoicePdfUrl('inv-1');
    expect(url).toBe('/invoices/INV-2025-001.pdf');
  });

  it('returns null when PDF is not available', async () => {
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue(
      mockInvoice({ pdfUrl: null }),
    );

    const url = await service.getInvoicePdfUrl('inv-1');
    expect(url).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Pilot Activation
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.activatePilot', () => {
  it('creates a pilot program with correct duration and email notifications', async () => {
    const mockPilot = {
      id: 'pilot-1',
      tenantId: 'tenant-pilot-001',
      type: 'DISTRICT_PILOT',
      name: 'District Pilot — 50 seats',
      seats: 50,
      seatsUsed: 0,
      startDate: new Date(),
      originalEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      primaryContactName: 'Pilot Lead',
      primaryContactEmail: 'pilot@school.edu',
      notes: 'Testing with 3rd graders',
      createdBy: '00000000-0000-0000-0000-000000000000',
      createdAt: new Date(),
    };

    (prisma.pilotProgram.create as Mock).mockResolvedValue(mockPilot);

    const result = await service.activatePilot({
      tenantId: 'tenant-pilot-001',
      studentLimit: 50,
      contactEmail: 'pilot@school.edu',
      contactName: 'Pilot Lead',
      notes: 'Testing with 3rd graders',
    });

    expect(result.tenantId).toBe('tenant-pilot-001');
    expect(result.studentLimit).toBe(50);
    expect(result.seatsUsed).toBe(0);
    expect(result.status).toBe('ACTIVE');
    expect(result.daysRemaining).toBe(90);
    expect(result.conversionRecommendation).toBeDefined();

    // Pilot was created with correct parameters
    expect(prisma.pilotProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-pilot-001',
          seats: 50,
          type: 'DISTRICT_PILOT',
          status: 'ACTIVE',
          primaryContactEmail: 'pilot@school.edu',
        }),
      }),
    );

    // Activation email sent
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/notify/email'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Invoice Scheduler
// ─────────────────────────────────────────────────────────────────────────────

describe('runInvoiceGeneration', () => {
  it('generates invoices for active contracts with past nextInvoiceDate', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const contract = mockContract({
      metadataJson: {
        contractType: 'monthly',
        studentCount: 200,
        currentStudentCount: 180,
        pricePerStudent: 4.0,
        paymentTerms: 'NET_30',
        contactEmail: 'admin@school.edu',
        contactName: 'Admin',
        nextInvoiceDate: pastDate.toISOString(),
      },
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    (prisma.contract.findMany as Mock).mockResolvedValue([contract]);
    (prisma.contract.findUniqueOrThrow as Mock).mockResolvedValue(contract);
    (prisma.contract.update as Mock).mockResolvedValue(contract);
    (prisma.districtInvoice.count as Mock).mockResolvedValue(3);
    (prisma.districtInvoice.create as Mock).mockResolvedValue(mockInvoice());
    (prisma.districtInvoice.findUniqueOrThrow as Mock).mockResolvedValue({
      ...mockInvoice(),
      contract,
    });
    (prisma.districtInvoice.update as Mock).mockResolvedValue(mockInvoice());

    const generated = await runInvoiceGeneration();

    expect(generated).toBe(1);
    expect(prisma.districtInvoice.create).toHaveBeenCalledOnce();
    // Next invoice date should have been advanced
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadataJson: expect.objectContaining({
            nextInvoiceDate: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('skips contracts without nextInvoiceDate in metadata', async () => {
    const contract = mockContract({
      metadataJson: {
        contractType: 'annual',
        studentCount: 500,
      },
    });

    (prisma.contract.findMany as Mock).mockResolvedValue([contract]);

    const generated = await runInvoiceGeneration();

    expect(generated).toBe(0);
    expect(prisma.districtInvoice.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pilot Status
// ─────────────────────────────────────────────────────────────────────────────

describe('EnterpriseBillingService.getPilotStatus', () => {
  it('returns pilot with conversion recommendation', async () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 10);

    (prisma.pilotProgram.findFirst as Mock).mockResolvedValue({
      id: 'pilot-2',
      tenantId: 'tenant-p',
      seats: 100,
      seatsUsed: 80, // 80% utilization
      startDate: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
      endDate,
      status: 'ACTIVE',
      primaryContactEmail: 'lead@school.edu',
      notes: null,
      createdAt: new Date(),
    });

    const result = await service.getPilotStatus('tenant-p');

    expect(result).not.toBeNull();
    expect(result!.studentLimit).toBe(100);
    expect(result!.seatsUsed).toBe(80);
    expect(result!.daysRemaining).toBeLessThanOrEqual(11);
    // High adoption + ending soon = convert recommendation
    expect(result!.conversionRecommendation).toContain('converting to full contract');
  });

  it('returns null when no active pilot exists', async () => {
    (prisma.pilotProgram.findFirst as Mock).mockResolvedValue(null);

    const result = await service.getPilotStatus('tenant-none');
    expect(result).toBeNull();
  });
});
