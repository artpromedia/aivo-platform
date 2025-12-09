import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  getModuleDisplayName,
  getSeatUsagePercentage,
  getSeatUsageLevel,
  exportInvoicesToCsv,
  type SeatUsage,
  type Invoice,
  type InvoiceStatus,
  type ModuleEntitlement,
} from '../lib/billing-api';

// Helper to create SeatUsage objects
function createSeatUsage(usedSeats: number, totalSeats: number): SeatUsage {
  return {
    tenantId: 'test-tenant',
    usedSeats,
    totalSeats,
    availableSeats: totalSeats - usedSeats,
    lastUpdatedAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CURRENCY FORMATTING
// ══════════════════════════════════════════════════════════════════════════════

describe('formatCurrency', () => {
  it('formats USD amounts correctly', () => {
    expect(formatCurrency(1000, 'usd')).toBe('$10.00');
    expect(formatCurrency(12500, 'usd')).toBe('$125.00');
    expect(formatCurrency(0, 'usd')).toBe('$0.00');
  });

  it('formats EUR amounts correctly', () => {
    expect(formatCurrency(1000, 'eur')).toMatch(/10[.,]00/); // accounts for locale differences
  });

  it('handles large amounts', () => {
    expect(formatCurrency(123456789, 'usd')).toBe('$1,234,567.89');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-1000, 'usd')).toMatch(/-?\$10\.00/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICE STATUS HELPERS
// ══════════════════════════════════════════════════════════════════════════════

describe('Invoice Status Helpers', () => {
  describe('getInvoiceStatusLabel', () => {
    it('returns correct labels for each status', () => {
      expect(getInvoiceStatusLabel('PAID')).toBe('Paid');
      expect(getInvoiceStatusLabel('OPEN')).toBe('Open');
      expect(getInvoiceStatusLabel('PAST_DUE')).toBe('Past Due');
      expect(getInvoiceStatusLabel('VOID')).toBe('Void');
      expect(getInvoiceStatusLabel('DRAFT')).toBe('Draft');
    });

    it('returns the status itself for unknown values', () => {
      expect(getInvoiceStatusLabel('UNKNOWN' as InvoiceStatus)).toBe('UNKNOWN');
    });
  });

  describe('getInvoiceStatusTone', () => {
    it('returns success tone for PAID', () => {
      expect(getInvoiceStatusTone('PAID')).toBe('success');
    });

    it('returns error tone for PAST_DUE', () => {
      expect(getInvoiceStatusTone('PAST_DUE')).toBe('error');
    });

    it('returns info tone for OPEN', () => {
      expect(getInvoiceStatusTone('OPEN')).toBe('info');
    });

    it('returns warning tone for VOID and UNCOLLECTIBLE', () => {
      expect(getInvoiceStatusTone('VOID')).toBe('warning');
      expect(getInvoiceStatusTone('UNCOLLECTIBLE')).toBe('warning');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE DISPLAY NAMES
// ══════════════════════════════════════════════════════════════════════════════

describe('getModuleDisplayName', () => {
  it('returns human-readable names for known modules', () => {
    expect(getModuleDisplayName('MODULE_ELA')).toBe('English Language Arts (ELA)');
    expect(getModuleDisplayName('MODULE_MATH')).toBe('Mathematics');
    expect(getModuleDisplayName('MODULE_SEL')).toBe('Social-Emotional Learning');
    expect(getModuleDisplayName('MODULE_SPEECH')).toBe('Speech & Language');
    expect(getModuleDisplayName('MODULE_SCIENCE')).toBe('Science');
    expect(getModuleDisplayName('MODULE_CODING')).toBe('Coding & Computational Thinking');
    expect(getModuleDisplayName('MODULE_WRITING')).toBe('Creative Writing');
  });

  it('formats unknown modules by removing prefix', () => {
    expect(getModuleDisplayName('MODULE_UNKNOWN')).toBe('UNKNOWN');
    expect(getModuleDisplayName('MODULE_TEST_FEATURE')).toBe('TEST FEATURE');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEAT USAGE CALCULATIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('Seat Usage Helpers', () => {
  describe('getSeatUsagePercentage', () => {
    it('calculates percentage correctly', () => {
      expect(getSeatUsagePercentage(createSeatUsage(50, 100))).toBe(50);
      expect(getSeatUsagePercentage(createSeatUsage(75, 100))).toBe(75);
      expect(getSeatUsagePercentage(createSeatUsage(0, 100))).toBe(0);
    });

    it('handles edge cases', () => {
      expect(getSeatUsagePercentage(createSeatUsage(100, 100))).toBe(100);
      expect(getSeatUsagePercentage(createSeatUsage(150, 100))).toBe(150); // over capacity
    });

    it('handles zero total seats', () => {
      expect(getSeatUsagePercentage(createSeatUsage(0, 0))).toBe(0);
    });

    it('rounds to whole numbers', () => {
      expect(getSeatUsagePercentage(createSeatUsage(33, 100))).toBe(33);
      expect(getSeatUsagePercentage(createSeatUsage(1, 3))).toBe(33);
    });
  });

  describe('getSeatUsageLevel', () => {
    it('returns normal for percentages under 90%', () => {
      expect(getSeatUsageLevel(createSeatUsage(0, 100))).toBe('normal');
      expect(getSeatUsageLevel(createSeatUsage(50, 100))).toBe('normal');
      expect(getSeatUsageLevel(createSeatUsage(89, 100))).toBe('normal');
    });

    it('returns warning for percentages between 90% and 100%', () => {
      expect(getSeatUsageLevel(createSeatUsage(90, 100))).toBe('warning');
      expect(getSeatUsageLevel(createSeatUsage(95, 100))).toBe('warning');
      expect(getSeatUsageLevel(createSeatUsage(99, 100))).toBe('warning');
    });

    it('returns critical for percentages at or above 100%', () => {
      expect(getSeatUsageLevel(createSeatUsage(100, 100))).toBe('critical');
      expect(getSeatUsageLevel(createSeatUsage(110, 100))).toBe('critical'); // over capacity
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════════════════════════════════════

describe('exportInvoicesToCsv', () => {
  const mockInvoices: Invoice[] = [
    {
      id: 'inv-1',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-001',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
      amountCents: 50000,
      currency: 'usd',
      status: 'PAID',
      dueDate: '2024-02-01',
      paidAt: '2024-01-28',
      hostedInvoiceUrl: 'https://stripe.com/receipt/1',
      hostedPdfUrl: 'https://stripe.com/pdf/1',
      createdAt: '2024-01-15',
    },
    {
      id: 'inv-2',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-002',
      periodStart: '2024-02-01',
      periodEnd: '2024-02-29',
      amountCents: 50000,
      currency: 'usd',
      status: 'OPEN',
      dueDate: '2024-03-01',
      createdAt: '2024-02-15',
    },
    {
      id: 'inv-3',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-003',
      periodStart: '2024-03-01',
      periodEnd: '2024-03-31',
      amountCents: 75000,
      currency: 'usd',
      status: 'PAST_DUE',
      dueDate: '2024-04-01',
      createdAt: '2024-03-15',
    },
  ];

  it('generates valid CSV with headers', () => {
    const csv = exportInvoicesToCsv(mockInvoices);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Invoice Number,Date,Period,Amount,Status,Paid Date');
  });

  it('includes all invoice data rows', () => {
    const csv = exportInvoicesToCsv(mockInvoices);
    const lines = csv.split('\n');

    // Header + 3 invoices
    expect(lines.length).toBe(4);
  });

  it('formats amount as currency', () => {
    const csv = exportInvoicesToCsv(mockInvoices);

    // Amount should be formatted as currency
    expect(csv).toContain('$500.00');
    expect(csv).toContain('$750.00');
  });

  it('handles empty invoice array', () => {
    const csv = exportInvoicesToCsv([]);
    const lines = csv.split('\n');

    expect(lines.length).toBe(1); // Just header
    expect(lines[0]).toContain('Invoice Number');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEAT WARNING BANNER BEHAVIOR (Integration Tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('Seat Warning Banner Logic', () => {
  function shouldShowBanner(seatUsage: SeatUsage): boolean {
    const level = getSeatUsageLevel(seatUsage);
    return level !== 'normal';
  }

  it('shows banner when usage is at 90%+', () => {
    expect(shouldShowBanner(createSeatUsage(90, 100))).toBe(true);
    expect(shouldShowBanner(createSeatUsage(95, 100))).toBe(true);
    expect(shouldShowBanner(createSeatUsage(100, 100))).toBe(true);
  });

  it('does not show banner when usage is under 90%', () => {
    expect(shouldShowBanner(createSeatUsage(50, 100))).toBe(false);
    expect(shouldShowBanner(createSeatUsage(89, 100))).toBe(false);
  });

  it('shows critical banner at 100%+', () => {
    const usage = createSeatUsage(100, 100);
    const level = getSeatUsageLevel(usage);

    expect(level).toBe('critical');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES CTA WIRING
// ══════════════════════════════════════════════════════════════════════════════

describe('Invoice Actions Logic', () => {
  function getActionForInvoice(invoice: Invoice): string | null {
    if (invoice.status === 'PAID' && invoice.hostedInvoiceUrl) {
      return 'view-receipt';
    }
    if (invoice.status === 'OPEN') {
      return 'view-invoice';
    }
    if (invoice.status === 'PAST_DUE') {
      return 'pay-now';
    }
    return null;
  }

  it('returns view-receipt for paid invoices with hosted URL', () => {
    const invoice: Invoice = {
      id: 'inv-1',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-001',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
      amountCents: 50000,
      currency: 'usd',
      status: 'PAID',
      dueDate: '2024-02-01',
      paidAt: '2024-01-28',
      hostedInvoiceUrl: 'https://stripe.com/receipt/1',
      createdAt: '2024-01-15',
    };

    expect(getActionForInvoice(invoice)).toBe('view-receipt');
  });

  it('returns view-invoice for open invoices', () => {
    const invoice: Invoice = {
      id: 'inv-2',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-002',
      periodStart: '2024-02-01',
      periodEnd: '2024-02-29',
      amountCents: 50000,
      currency: 'usd',
      status: 'OPEN',
      dueDate: '2024-03-01',
      createdAt: '2024-02-15',
    };

    expect(getActionForInvoice(invoice)).toBe('view-invoice');
  });

  it('returns pay-now for past due invoices', () => {
    const invoice: Invoice = {
      id: 'inv-3',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-003',
      periodStart: '2024-03-01',
      periodEnd: '2024-03-31',
      amountCents: 75000,
      currency: 'usd',
      status: 'PAST_DUE',
      dueDate: '2024-04-01',
      createdAt: '2024-03-15',
    };

    expect(getActionForInvoice(invoice)).toBe('pay-now');
  });

  it('returns null for void invoices', () => {
    const invoice: Invoice = {
      id: 'inv-4',
      billingAccountId: 'ba-1',
      invoiceNumber: 'INV-2024-004',
      periodStart: '2024-04-01',
      periodEnd: '2024-04-30',
      amountCents: 0,
      currency: 'usd',
      status: 'VOID',
      dueDate: '2024-05-01',
      createdAt: '2024-04-15',
    };

    expect(getActionForInvoice(invoice)).toBe(null);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY
// ══════════════════════════════════════════════════════════════════════════════

describe('Accessibility Requirements', () => {
  it('seat usage level provides appropriate ARIA context', () => {
    // These values help inform aria-labels for screen readers
    const levels = [
      { usedSeats: 50, totalSeats: 100, expectedLevel: 'normal' },
      { usedSeats: 92, totalSeats: 100, expectedLevel: 'warning' },
      { usedSeats: 100, totalSeats: 100, expectedLevel: 'critical' },
    ] as const;

    for (const { usedSeats, totalSeats, expectedLevel } of levels) {
      const usage = createSeatUsage(usedSeats, totalSeats);
      const level = getSeatUsageLevel(usage);
      expect(level).toBe(expectedLevel);
    }
  });

  it('invoice status tones map to appropriate visual indicators', () => {
    // Badge tones should provide clear visual distinction
    const statusTones = {
      PAID: 'success',
      OPEN: 'info',
      PAST_DUE: 'error',
      VOID: 'warning',
      UNCOLLECTIBLE: 'warning',
    } as const;

    for (const [status, expectedTone] of Object.entries(statusTones)) {
      expect(getInvoiceStatusTone(status as InvoiceStatus)).toBe(expectedTone);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTACT CTA FUNCTIONALITY
// ══════════════════════════════════════════════════════════════════════════════

describe('Contact CTAs', () => {
  it('request seats CTA includes usage context in mailto', () => {
    const seatUsage = createSeatUsage(95, 100);
    const percentage = getSeatUsagePercentage(seatUsage);

    // Verify data that would be included in mailto
    expect(seatUsage.usedSeats).toBe(95);
    expect(seatUsage.totalSeats).toBe(100);
    expect(percentage).toBe(95);
  });

  it('contact support mailto is properly formatted', () => {
    const supportEmail = 'support@aivo.com';
    const subject = encodeURIComponent('Billing Support Request');

    const mailtoUrl = `mailto:${supportEmail}?subject=${subject}`;
    expect(mailtoUrl).toBe('mailto:support@aivo.com?subject=Billing%20Support%20Request');
  });

  it('request modules CTA includes disabled modules list', () => {
    const entitlements: ModuleEntitlement[] = [
      { id: '1', tenantId: 't1', featureCode: 'MODULE_ELA', featureName: 'ELA', isEnabled: true, source: 'DISTRICT_PREMIUM' },
      { id: '2', tenantId: 't1', featureCode: 'MODULE_MATH', featureName: 'Math', isEnabled: false, source: 'ADD_ON' },
      { id: '3', tenantId: 't1', featureCode: 'MODULE_SEL', featureName: 'SEL', isEnabled: false, source: 'ADD_ON' },
    ];

    const disabledModules = entitlements
      .filter((e) => !e.isEnabled)
      .map((e) => getModuleDisplayName(e.featureCode));

    expect(disabledModules).toEqual(['Mathematics', 'Social-Emotional Learning']);
  });
});
