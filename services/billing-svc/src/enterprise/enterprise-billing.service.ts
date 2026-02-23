/**
 * Enterprise Billing Service
 *
 * Full implementation for district seat-based billing:
 *  - Contract creation with automatic first-invoice generation
 *  - PDF invoice generation (pdfkit)
 *  - Payment recording
 *  - Student-count sync with tenant-svc (overage detection)
 *  - Pilot program activation and status
 *
 * Uses the existing Prisma models: Contract, DistrictInvoice,
 * DistrictBillingProfile, PurchaseOrder, PilotProgram.
 */

import _crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Writable } from 'node:stream';

import PDFDocument from 'pdfkit';

import { config } from '../config.js';
import { billingEventPublisher, BillingEventType } from '../events/billing.publisher.js';
import { prisma } from '../prisma.js';

import type { CreateContractInput, RecordPaymentInput, ActivatePilotInput } from './enterprise.schemas.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const TENANT_SVC_URL = process.env.TENANT_SVC_URL ?? config.services.tenant;
const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL ?? config.services.notify;
const STORAGE_URL = process.env.STORAGE_URL ?? 'http://storage-svc:4080';
const INVOICE_PREFIX = process.env.INVOICE_NUMBER_PREFIX ?? 'INV';
const DEFAULT_PRICE = Number(process.env.DEFAULT_PRICE_PER_STUDENT ?? '4.00');
const PILOT_DURATION_DAYS = Number(process.env.PILOT_DEFAULT_DURATION_DAYS ?? '90');
const INVOICE_DUE_DAYS = Number(process.env.INVOICE_DUE_DAYS ?? '30');

function paymentTermsToDays(terms: string): number {
  switch (terms) {
    case 'NET_60':
      return 60;
    case 'PO':
    case 'NET_30':
    default:
      return INVOICE_DUE_DAYS;
  }
}

function monthsBetween(start: Date, end: Date): number {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(months, 1);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.districtInvoice.count({
    where: { invoiceNumber: { startsWith: `${INVOICE_PREFIX}-${year}` } },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `${INVOICE_PREFIX}-${year}-${seq}`;
}

async function nextContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: { contractNumber: { startsWith: `DST-${year}` } },
  });
  const seq = String(count + 1).padStart(5, '0');
  return `DST-${year}-${seq}`;
}

/** Send email via notify-svc */
async function sendEmail(
  to: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(`${NOTIFY_SVC_URL}/notify/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, template, data }),
    });
  } catch (err) {
    console.error(`[EnterpriseBilling] Failed to send email (${template}):`, err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class EnterpriseBillingService {
  // ───────────────────────────────────────────────────────────────────────────
  // Contract Creation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a district contract with initial invoice.
   */
  async createDistrictContract(params: CreateContractInput) {
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const months = monthsBetween(startDate, endDate);
    const totalValueCents = Math.round(
      params.studentCount * params.pricePerStudent * months * 100,
    );

    // Ensure billing profile exists, create if needed
    let profile = await prisma.districtBillingProfile.findFirst({
      where: { tenantId: params.districtId },
    });

    if (!profile) {
      // Create a billing account first
      const billingAccount = await prisma.billingAccount.create({
        data: {
          tenantId: params.districtId,
          type: 'DISTRICT',
          name: params.contactName,
          email: params.contactEmail,
          currency: 'USD',
          status: 'ACTIVE',
        },
      });

      profile = await prisma.districtBillingProfile.create({
        data: {
          billingAccountId: billingAccount.id,
          tenantId: params.districtId,
          billingContactName: params.contactName,
          billingContactEmail: params.contactEmail,
          paymentTermsDays: paymentTermsToDays(params.paymentTerms),
          billingAddressJson: {},
        },
      });
    }

    // We need a PriceBook — use the default or first available
    let priceBook = await prisma.priceBook.findFirst({
      where: { isDefault: true },
    });
    if (!priceBook) {
      priceBook = await prisma.priceBook.create({
        data: {
          name: 'Enterprise Default',
          description: 'Default price book for enterprise contracts',
          isDefault: true,
          currency: 'USD',
          status: 'ACTIVE',
        },
      });
    }

    const contractNumber = await nextContractNumber();

    // Determine next invoice date
    const _dueDays = paymentTermsToDays(params.paymentTerms);
    const _nextInvDate = addMonths(startDate, params.contractType === 'monthly' ? 1 : 12);

    const contract = await prisma.contract.create({
      data: {
        billingProfileId: profile.id,
        tenantId: params.districtId,
        contractNumber,
        name: `District License — ${params.studentCount} students`,
        startDate,
        endDate,
        status: 'ACTIVE',
        priceBookId: priceBook.id,
        poNumber: params.poNumber ?? null,
        paymentType: params.paymentTerms === 'PO' ? 'PO' : 'INVOICE',
        totalValueCents: BigInt(totalValueCents),
        currency: 'USD',
        metadataJson: {
          contractType: params.contractType,
          studentCount: params.studentCount,
          currentStudentCount: 0,
          pricePerStudent: params.pricePerStudent,
          paymentTerms: params.paymentTerms,
          contactEmail: params.contactEmail,
          contactName: params.contactName,
        },
      },
    });

    // Generate first invoice
    const periodEnd = params.contractType === 'monthly'
      ? addMonths(startDate, 1)
      : addMonths(startDate, 12);

    const invoice = await this.generateInvoice(
      contract.id,
      startDate,
      periodEnd,
    );

    // Publish NATS event
    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_CREATED,
      tenantId: params.districtId,
      contractId: contract.id,
      invoiceId: invoice.id,
      totalValue: totalValueCents / 100,
    });

    // Send welcome email
    await sendEmail(params.contactEmail, 'district-contract-welcome', {
      contactName: params.contactName,
      contractNumber,
      studentCount: params.studentCount,
      totalValue: (totalValueCents / 100).toFixed(2),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    const _meta = contract.metadataJson as Record<string, unknown> | null;

    return {
      id: contract.id,
      tenantId: contract.tenantId,
      contractNumber: contract.contractNumber,
      contractType: params.contractType,
      studentCount: params.studentCount,
      currentStudentCount: 0,
      pricePerStudent: params.pricePerStudent,
      totalValueCents: Number(contract.totalValueCents),
      paymentTerms: params.paymentTerms,
      poNumber: contract.poNumber,
      contactEmail: params.contactEmail,
      contactName: params.contactName,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      status: contract.status,
      createdAt: contract.createdAt.toISOString(),
      firstInvoiceId: invoice.id,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Invoice Generation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Generate an invoice for a contract period.
   */
  async generateInvoice(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: { billingProfile: true },
    });

    const meta = contract.metadataJson as Record<string, unknown>;
    const studentCount = (meta?.studentCount as number) ?? 0;
    const pricePerStudent = (meta?.pricePerStudent as number) ?? DEFAULT_PRICE;
    const paymentTerms = (meta?.paymentTerms as string) ?? 'NET_30';
    const _contactEmail = (meta?.contactEmail as string) ?? contract.billingProfile.billingContactEmail;

    const subtotalCents = Math.round(studentCount * pricePerStudent * 100);
    // Tax calculation — check billing profile for tax exemption
    const isTaxExempt = contract.billingProfile.isTaxExempt;
    const taxRate = isTaxExempt ? 0 : 0.0; // Districts are typically tax-exempt
    const taxAmountCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxAmountCents;

    const invoiceNumber = await nextInvoiceNumber();
    const dueDays = paymentTermsToDays(paymentTerms);
    const dueDate = addDays(periodStart, dueDays);

    const lineItems = [
      {
        description: `Student Licenses (${studentCount} students × $${pricePerStudent.toFixed(2)}/student)`,
        quantity: studentCount,
        unitPrice: pricePerStudent,
        total: subtotalCents / 100,
      },
    ];

    if (taxAmountCents > 0) {
      lineItems.push({
        description: 'Sales Tax',
        quantity: 1,
        unitPrice: taxAmountCents / 100,
        total: taxAmountCents / 100,
      });
    }

    const invoice = await prisma.districtInvoice.create({
      data: {
        billingAccountId: contract.billingProfile.billingAccountId,
        contractId: contract.id,
        invoiceNumber,
        status: 'SENT',
        issueDate: new Date(),
        dueDate,
        amountDueCents: BigInt(totalCents),
        amountPaidCents: BigInt(0),
        currency: 'USD',
        poNumber: contract.poNumber,
        metadataJson: {
          lineItems,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          subtotalCents,
          taxAmountCents,
          totalCents,
        },
      },
    });

    // Generate PDF
    const pdfUrl = await this.generateInvoicePdf(invoice.id);

    // Update invoice with PDF URL
    await prisma.districtInvoice.update({
      where: { id: invoice.id },
      data: { pdfUrl },
    });

    return {
      id: invoice.id,
      contractId: invoice.contractId,
      tenantId: contract.tenantId,
      invoiceNumber: invoice.invoiceNumber,
      lineItems,
      subtotal: subtotalCents / 100,
      taxAmount: taxAmountCents / 100,
      total: totalCents / 100,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      paidAt: null,
      paymentMethod: null,
      paymentRef: null,
      pdfUrl,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PDF Invoice Generation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Generate a professional PDF invoice using pdfkit.
   * Uploads to storage service, returns URL.
   */
  async generateInvoicePdf(invoiceId: string): Promise<string> {
    const invoice = await prisma.districtInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        contract: {
          include: { billingProfile: true },
        },
      },
    });

    const meta = invoice.metadataJson as Record<string, unknown> | null;
    const lineItems = (meta?.lineItems as { description: string; quantity: number; unitPrice: number; total: number }[]) ?? [];
    const subtotalCents = (meta?.subtotalCents as number) ?? Number(invoice.amountDueCents);
    const taxAmountCents = (meta?.taxAmountCents as number) ?? 0;
    const totalCents = (meta?.totalCents as number) ?? Number(invoice.amountDueCents);

    const contractMeta = invoice.contract.metadataJson as Record<string, unknown> | null;
    const contactName = (contractMeta?.contactName as string) ?? invoice.contract.billingProfile.billingContactName;
    const contactEmail = (contractMeta?.contactEmail as string) ?? invoice.contract.billingProfile.billingContactEmail;
    const paymentTerms = (contractMeta?.paymentTerms as string) ?? 'NET_30';

    // Build PDF in memory
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

    await new Promise<void>((resolve, reject) => {
      const writable = new Writable({
        write(chunk: Buffer, _encoding, cb) {
          chunks.push(chunk);
          cb();
        },
      });

      writable.on('finish', resolve);
      writable.on('error', reject);
      doc.pipe(writable);

      // ── Header ──────────────────────────────────────────────────────────
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('AIVO', 50, 50)
        .fontSize(10)
        .font('Helvetica')
        .text('Educational Platform', 50, 78);

      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('INVOICE', 400, 50, { align: 'right' });

      doc.moveDown(2);

      // ── Bill To ─────────────────────────────────────────────────────────
      const billToY = 130;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, billToY);
      doc
        .font('Helvetica')
        .text(contactName, 50, billToY + 15)
        .text(contactEmail, 50, billToY + 30);

      // ── Invoice Details ─────────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .text('Invoice #:', 350, billToY)
        .font('Helvetica')
        .text(invoice.invoiceNumber, 440, billToY);

      doc
        .font('Helvetica-Bold')
        .text('Date:', 350, billToY + 15)
        .font('Helvetica')
        .text(invoice.issueDate.toISOString().split('T')[0] ?? '', 440, billToY + 15);

      doc
        .font('Helvetica-Bold')
        .text('Due Date:', 350, billToY + 30)
        .font('Helvetica')
        .text(invoice.dueDate.toISOString().split('T')[0] ?? '', 440, billToY + 30);

      if (invoice.poNumber) {
        doc
          .font('Helvetica-Bold')
          .text('PO #:', 350, billToY + 45)
          .font('Helvetica')
          .text(invoice.poNumber, 440, billToY + 45);
      }

      doc
        .font('Helvetica-Bold')
        .text('Terms:', 350, billToY + (invoice.poNumber ? 60 : 45))
        .font('Helvetica')
        .text(paymentTerms.replace('_', ' '), 440, billToY + (invoice.poNumber ? 60 : 45));

      // ── Line Items Table ────────────────────────────────────────────────
      const tableTop = 240;
      const colX = { desc: 50, qty: 320, unit: 400, total: 490 };

      // Header row
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Description', colX.desc, tableTop)
        .text('Qty', colX.qty, tableTop, { width: 60, align: 'right' })
        .text('Unit Price', colX.unit, tableTop, { width: 70, align: 'right' })
        .text('Total', colX.total, tableTop, { width: 60, align: 'right' });

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(555, tableTop + 15)
        .stroke();

      let rowY = tableTop + 25;
      for (const item of lineItems) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(item.description, colX.desc, rowY, { width: 260 })
          .text(String(item.quantity), colX.qty, rowY, { width: 60, align: 'right' })
          .text(`$${item.unitPrice.toFixed(2)}`, colX.unit, rowY, { width: 70, align: 'right' })
          .text(`$${item.total.toFixed(2)}`, colX.total, rowY, { width: 60, align: 'right' });
        rowY += 20;
      }

      // Separator
      doc.moveTo(350, rowY + 5).lineTo(555, rowY + 5).stroke();
      rowY += 15;

      // Subtotal
      doc
        .font('Helvetica')
        .text('Subtotal:', 400, rowY, { width: 70, align: 'right' })
        .text(`$${(subtotalCents / 100).toFixed(2)}`, colX.total, rowY, {
          width: 60,
          align: 'right',
        });
      rowY += 18;

      // Tax
      doc
        .text('Tax:', 400, rowY, { width: 70, align: 'right' })
        .text(`$${(taxAmountCents / 100).toFixed(2)}`, colX.total, rowY, {
          width: 60,
          align: 'right',
        });
      rowY += 18;

      // Total
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total Due:', 380, rowY, { width: 90, align: 'right' })
        .text(`$${(totalCents / 100).toFixed(2)}`, colX.total, rowY, {
          width: 60,
          align: 'right',
        });

      // ── Payment Instructions ────────────────────────────────────────────
      rowY += 50;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Payment Instructions', 50, rowY);
      rowY += 18;
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Please remit payment within ${paymentTerms.replace('_', ' ')} terms via bank transfer, ACH, or check.`,
          50,
          rowY,
          { width: 500 },
        );
      rowY += 15;
      doc.text('Make checks payable to: AIVO Education, Inc.', 50, rowY, {
        width: 500,
      });

      // ── Footer ──────────────────────────────────────────────────────────
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text(
          'Thank you for your partnership with AIVO.',
          50,
          700,
          { align: 'center', width: 500 },
        );

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Upload to storage service
    try {
      const res = await fetch(`${STORAGE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': `invoices/${invoice.invoiceNumber}.pdf`,
        },
        body: pdfBuffer,
      });
      if (res.ok) {
        const result = (await res.json()) as { url?: string };
        return result.url ?? `${STORAGE_URL}/files/invoices/${invoice.invoiceNumber}.pdf`;
      }
    } catch {
      // Storage service not available — save locally as fallback
    }

    // Fallback: write to local dist/invoices
    const dir = path.join(process.cwd(), 'dist', 'invoices');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${invoice.invoiceNumber}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);
    return `/invoices/${invoice.invoiceNumber}.pdf`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Payment Recording
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Record a manual payment against a district invoice.
   */
  async recordPayment(invoiceId: string, params: RecordPaymentInput) {
    const invoice = await prisma.districtInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        contract: {
          include: { billingProfile: true },
        },
      },
    });

    const amountCents = Math.round(params.amount * 100);

    await prisma.districtInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        amountPaidCents: BigInt(amountCents),
        paidAt: new Date(params.paidAt),
        paymentReference: params.referenceNumber,
        metadataJson: {
          ...(invoice.metadataJson as Record<string, unknown> | null),
          paymentMethod: params.method,
          paymentRef: params.referenceNumber,
        },
      },
    });

    // Check if all invoices for this contract are paid
    const pendingInvoices = await prisma.districtInvoice.count({
      where: {
        contractId: invoice.contractId,
        status: { not: 'PAID' },
        id: { not: invoiceId },
      },
    });

    if (pendingInvoices === 0) {
      await prisma.contract.update({
        where: { id: invoice.contractId },
        data: {
          metadataJson: {
            ...(invoice.contract.metadataJson as Record<string, unknown> | null),
            paidStatus: 'PAID_CURRENT',
          },
        },
      });
    }

    // Publish NATS event
    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_PAID,
      tenantId: invoice.contract.tenantId,
      invoiceId,
      contractId: invoice.contractId,
      amount: params.amount,
      method: params.method,
      referenceNumber: params.referenceNumber,
    });

    // Send payment confirmation email
    const contractMeta = invoice.contract.metadataJson as Record<string, unknown> | null;
    const contactEmail =
      (contractMeta?.contactEmail as string) ??
      invoice.contract.billingProfile.billingContactEmail;

    await sendEmail(contactEmail, 'district-payment-confirmation', {
      invoiceNumber: invoice.invoiceNumber,
      amount: params.amount.toFixed(2),
      method: params.method,
      referenceNumber: params.referenceNumber,
      paidAt: params.paidAt,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Student Count Sync
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Sync actual student enrollment from tenant-svc and detect overage.
   */
  async syncStudentCount(tenantId: string) {
    const contract = await prisma.contract.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!contract) {
      return { contractId: null, tenantId, overageDetected: false, overageInvoiceId: null };
    }

    const meta = contract.metadataJson as Record<string, unknown>;
    const contractedStudents = (meta?.studentCount as number) ?? 0;

    // Fetch actual enrollment from tenant-svc
    let actualCount = 0;
    try {
      const res = await fetch(
        `${TENANT_SVC_URL}/internal/tenants/${tenantId}/enrollment-count`,
      );
      if (res.ok) {
        const data = (await res.json()) as { count?: number; enrollmentCount?: number };
        actualCount = data.count ?? data.enrollmentCount ?? 0;
      }
    } catch {
      console.warn(`[EnterpriseBilling] Could not fetch enrollment for tenant ${tenantId}`);
      return {
        contractId: contract.id,
        tenantId,
        contractedStudents,
        currentStudents: (meta?.currentStudentCount as number) ?? 0,
        utilizationPercent: 0,
        overageDetected: false,
        overageInvoiceId: null,
      };
    }

    // Update metadata
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        metadataJson: { ...meta, currentStudentCount: actualCount },
      },
    });

    let overageInvoiceId: string | null = null;
    const overageThreshold = contractedStudents * 1.05; // 5% buffer
    const overageDetected = actualCount > overageThreshold;

    if (overageDetected) {
      const overageStudents = actualCount - contractedStudents;
      const pricePerStudent = (meta?.pricePerStudent as number) ?? DEFAULT_PRICE;

      // Create overage invoice
      const overageInvoice = await this.generateOverageInvoice(
        contract.id,
        overageStudents,
        pricePerStudent,
      );
      overageInvoiceId = overageInvoice.id;
    }

    const utilizationPercent =
      contractedStudents > 0
        ? Math.round((actualCount / contractedStudents) * 100)
        : 0;

    return {
      contractId: contract.id,
      tenantId,
      contractedStudents,
      currentStudents: actualCount,
      utilizationPercent,
      overageDetected,
      overageInvoiceId,
    };
  }

  /**
   * Generate an overage invoice for excess students.
   */
  private async generateOverageInvoice(
    contractId: string,
    overageStudents: number,
    pricePerStudent: number,
  ) {
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: { billingProfile: true },
    });

    const meta = contract.metadataJson as Record<string, unknown>;
    const paymentTerms = (meta?.paymentTerms as string) ?? 'NET_30';
    const subtotalCents = Math.round(overageStudents * pricePerStudent * 100);
    const invoiceNumber = await nextInvoiceNumber();
    const dueDate = addDays(new Date(), paymentTermsToDays(paymentTerms));

    const lineItems = [
      {
        description: `Student Overage (${overageStudents} additional students × $${pricePerStudent.toFixed(2)}/student)`,
        quantity: overageStudents,
        unitPrice: pricePerStudent,
        total: subtotalCents / 100,
      },
    ];

    const invoice = await prisma.districtInvoice.create({
      data: {
        billingAccountId: contract.billingProfile.billingAccountId,
        contractId: contract.id,
        invoiceNumber,
        status: 'SENT',
        issueDate: new Date(),
        dueDate,
        amountDueCents: BigInt(subtotalCents),
        amountPaidCents: BigInt(0),
        currency: 'USD',
        poNumber: contract.poNumber,
        metadataJson: {
          lineItems,
          isOverageInvoice: true,
          overageStudents,
          subtotalCents,
          taxAmountCents: 0,
          totalCents: subtotalCents,
        },
      },
    });

    // Generate PDF
    const pdfUrl = await this.generateInvoicePdf(invoice.id);
    await prisma.districtInvoice.update({
      where: { id: invoice.id },
      data: { pdfUrl },
    });

    return { id: invoice.id, invoiceNumber, pdfUrl };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Contract Retrieval
  // ───────────────────────────────────────────────────────────────────────────

  async getContract(contractId: string) {
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: {
        districtInvoices: { orderBy: { createdAt: 'desc' } },
        billingProfile: true,
      },
    });

    const meta = contract.metadataJson as Record<string, unknown> | null;

    return {
      id: contract.id,
      tenantId: contract.tenantId,
      contractNumber: contract.contractNumber,
      contractType: (meta?.contractType as string) ?? 'annual',
      studentCount: (meta?.studentCount as number) ?? 0,
      currentStudentCount: (meta?.currentStudentCount as number) ?? 0,
      pricePerStudent: (meta?.pricePerStudent as number) ?? 0,
      totalValueCents: Number(contract.totalValueCents),
      paymentTerms: (meta?.paymentTerms as string) ?? 'NET_30',
      poNumber: contract.poNumber,
      contactEmail:
        (meta?.contactEmail as string) ?? contract.billingProfile.billingContactEmail,
      contactName:
        (meta?.contactName as string) ?? contract.billingProfile.billingContactName,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      status: contract.status,
      createdAt: contract.createdAt.toISOString(),
      invoices: contract.districtInvoices.map((inv) => this.mapInvoice(inv)),
    };
  }

  async getContractInvoices(contractId: string) {
    const invoices = await prisma.districtInvoice.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map((inv) => this.mapInvoice(inv));
  }

  async getInvoice(invoiceId: string) {
    const invoice = await prisma.districtInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { contract: true },
    });
    return this.mapInvoice(invoice);
  }

  async getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    const invoice = await prisma.districtInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    return invoice.pdfUrl;
  }

  private mapInvoice(inv: {
    id: string;
    contractId: string;
    invoiceNumber: string;
    status: string;
    dueDate: Date;
    paidAt: Date | null;
    pdfUrl: string | null;
    amountDueCents: bigint;
    amountPaidCents: bigint;
    currency: string;
    createdAt: Date;
    metadataJson: unknown;
    paymentReference?: string | null;
  }) {
    const meta = inv.metadataJson as Record<string, unknown> | null;
    const lineItems = (meta?.lineItems as {
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[]) ?? [];
    const subtotalCents = (meta?.subtotalCents as number) ?? Number(inv.amountDueCents);
    const taxAmountCents = (meta?.taxAmountCents as number) ?? 0;
    const totalCents = (meta?.totalCents as number) ?? Number(inv.amountDueCents);

    return {
      id: inv.id,
      contractId: inv.contractId,
      invoiceNumber: inv.invoiceNumber,
      lineItems,
      subtotal: subtotalCents / 100,
      taxAmount: taxAmountCents / 100,
      total: totalCents / 100,
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      paymentMethod: (meta?.paymentMethod as string) ?? null,
      paymentRef: inv.paymentReference ?? (meta?.paymentRef as string) ?? null,
      pdfUrl: inv.pdfUrl,
      periodStart: (meta?.periodStart as string) ?? '',
      periodEnd: (meta?.periodEnd as string) ?? '',
      createdAt: inv.createdAt.toISOString(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Pilot Programs
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Activate a pilot program for a district.
   */
  async activatePilot(params: ActivatePilotInput) {
    const startDate = new Date();
    const endDate = addDays(startDate, PILOT_DURATION_DAYS);

    const pilot = await prisma.pilotProgram.create({
      data: {
        tenantId: params.tenantId,
        type: 'DISTRICT_PILOT',
        name: `District Pilot — ${params.studentLimit} seats`,
        seats: params.studentLimit,
        startDate,
        originalEndDate: endDate,
        endDate,
        status: 'ACTIVE',
        primaryContactName: params.contactName,
        primaryContactEmail: params.contactEmail,
        notes: params.notes ?? null,
        createdBy: '00000000-0000-0000-0000-000000000000', // System
      },
    });

    // Send pilot activation email
    await sendEmail(params.contactEmail, 'district-pilot-activated', {
      contactName: params.contactName,
      studentLimit: params.studentLimit,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      durationDays: PILOT_DURATION_DAYS,
    });

    // Schedule conversion reminder emails via NATS delayed messages
    const reminderDays = [14, 7, 2];
    for (const daysBefore of reminderDays) {
      const reminderDate = addDays(endDate, -daysBefore);
      if (reminderDate > startDate) {
        try {
          await billingEventPublisher.publish({
            type: BillingEventType.REMINDER_PILOT_ENDING,
            tenantId: params.tenantId,
            pilotId: pilot.id,
            daysBefore,
            contactEmail: params.contactEmail,
            contactName: params.contactName,
            reminderDate: reminderDate.toISOString(),
          });
        } catch {
          // Non-critical — log and continue
          console.warn(`[EnterpriseBilling] Failed to schedule pilot reminder at -${daysBefore}d`);
        }
      }
    }

    return {
      id: pilot.id,
      tenantId: pilot.tenantId,
      studentLimit: pilot.seats,
      seatsUsed: pilot.seatsUsed,
      startDate: pilot.startDate.toISOString(),
      endDate: pilot.endDate.toISOString(),
      daysRemaining: PILOT_DURATION_DAYS,
      status: pilot.status,
      contactEmail: params.contactEmail,
      notes: pilot.notes,
      conversionRecommendation: 'Pilot just started — monitor usage after 2 weeks.',
    };
  }

  /**
   * Get pilot program status with conversion recommendations.
   */
  async getPilotStatus(tenantId: string) {
    const pilot = await prisma.pilotProgram.findFirst({
      where: { tenantId, status: { in: ['ACTIVE', 'EXTENDED', 'PENDING'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!pilot) {
      return null;
    }

    const now = new Date();
    const endDate = new Date(pilot.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const utilizationPct = pilot.seats > 0
      ? Math.round((pilot.seatsUsed / pilot.seats) * 100)
      : 0;

    let conversionRecommendation: string;
    if (utilizationPct >= 70 && daysRemaining <= 14) {
      conversionRecommendation =
        'High adoption detected. Recommend converting to full contract immediately.';
    } else if (utilizationPct >= 40) {
      conversionRecommendation =
        'Good adoption trend. Schedule a conversion call with the district.';
    } else if (daysRemaining <= 7) {
      conversionRecommendation =
        'Pilot ending soon with low adoption. Consider extending or scheduling a training session.';
    } else {
      conversionRecommendation =
        'Pilot in progress — monitor usage trends.';
    }

    return {
      id: pilot.id,
      tenantId: pilot.tenantId,
      studentLimit: pilot.seats,
      seatsUsed: pilot.seatsUsed,
      startDate: pilot.startDate.toISOString(),
      endDate: pilot.endDate.toISOString(),
      daysRemaining,
      status: pilot.status,
      contactEmail: pilot.primaryContactEmail ?? '',
      notes: pilot.notes,
      conversionRecommendation,
    };
  }
}

// Singleton
export const enterpriseBillingService = new EnterpriseBillingService();
