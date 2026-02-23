/**
 * Enterprise Billing Routes
 *
 * REST endpoints for district seat-based contracts, invoices,
 * payments, pilot programs, and usage tracking.
 *
 * Prefix: /api/v1/enterprise
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { enterpriseBillingService } from '../enterprise/enterprise-billing.service.js';
import {
  CreateContractSchema,
  RecordPaymentSchema,
  ActivatePilotSchema,
  IdParamSchema,
  TenantIdParamSchema,
} from '../enterprise/enterprise.schemas.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function enterpriseRoutes(app: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────
  // Contracts
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /contracts
   * Create a new district contract with initial invoice.
   */
  app.post(
    '/contracts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateContractSchema.parse(request.body);
      const result = await enterpriseBillingService.createDistrictContract(body);
      return reply.status(201).send(result);
    },
  );

  /**
   * GET /contracts/:id
   * Retrieve contract details with all invoices.
   */
  app.get(
    '/contracts/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const result = await enterpriseBillingService.getContract(id);
      return reply.send(result);
    },
  );

  /**
   * GET /contracts/:id/invoices
   * List all invoices for a contract.
   */
  app.get(
    '/contracts/:id/invoices',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const invoices = await enterpriseBillingService.getContractInvoices(id);
      return reply.send({ invoices });
    },
  );

  /**
   * GET /contracts/:id/usage
   * Get usage/enrollment data for a contract — triggers enrollment sync.
   */
  app.get(
    '/contracts/:id/usage',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const contract = await enterpriseBillingService.getContract(id);
      const usage = await enterpriseBillingService.syncStudentCount(contract.tenantId);
      return reply.send(usage);
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Invoices
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /invoices/:id
   * Get a specific invoice.
   */
  app.get(
    '/invoices/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const invoice = await enterpriseBillingService.getInvoice(id);
      return reply.send(invoice);
    },
  );

  /**
   * GET /invoices/:id/pdf
   * Redirect to the PDF download URL for an invoice.
   */
  app.get(
    '/invoices/:id/pdf',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const pdfUrl = await enterpriseBillingService.getInvoicePdfUrl(id);
      if (!pdfUrl) {
        return reply.status(404).send({ error: 'PDF not available for this invoice' });
      }
      return reply.redirect(302, pdfUrl);
    },
  );

  /**
   * POST /invoices/:id/payment
   * Record a manual payment against an invoice.
   */
  app.post(
    '/invoices/:id/payment',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = IdParamSchema.parse(request.params);
      const body = RecordPaymentSchema.parse(request.body);
      await enterpriseBillingService.recordPayment(id, body);
      return reply.status(200).send({ status: 'paid', invoiceId: id });
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Pilot Programs
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /pilots
   * Activate a new pilot program for a district.
   */
  app.post(
    '/pilots',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ActivatePilotSchema.parse(request.body);
      const result = await enterpriseBillingService.activatePilot(body);
      return reply.status(201).send(result);
    },
  );

  /**
   * GET /pilots/:tenantId
   * Get the current pilot status for a tenant.
   */
  app.get(
    '/pilots/:tenantId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = TenantIdParamSchema.parse(request.params);
      const pilot = await enterpriseBillingService.getPilotStatus(tenantId);
      if (!pilot) {
        return reply.status(404).send({ error: 'No active pilot found for this tenant' });
      }
      return reply.send(pilot);
    },
  );
}
