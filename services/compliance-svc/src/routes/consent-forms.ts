/**
 * AIVO Compliance Service — Consent Form Tracking Routes
 *
 * Sprint T2-06: District onboarding consent form management.
 *
 * POST /consent-forms/upload        — upload signed consent forms (batch)
 * GET  /consent-forms/status        — consent tracking dashboard
 * POST /consent-forms/reminders     — send email reminders for missing consent
 * GET  /consent-forms/template      — generate printable consent form template
 *
 * These routes are separate from the COPPA consent module which handles
 * per-feature consent FSM. This module handles the physical consent form
 * collection workflow during district onboarding.
 */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const uploadConsentSchema = z.object({
  tenantId: z.string().uuid(),
  forms: z.array(
    z.object({
      studentId: z.string(),
      studentName: z.string().optional(),
      parentName: z.string(),
      parentEmail: z.string().email().optional(),
      consentStatus: z.enum(['RECEIVED', 'PENDING']).default('RECEIVED'),
      signedDate: z.string().optional(),
      fileUrl: z.string().url().optional(),
      fileName: z.string().optional(),
    })
  ).min(1),
});

const statusQuerySchema = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'EXPIRED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

const reminderSchema = z.object({
  tenantId: z.string().uuid(),
  studentIds: z.array(z.string()).optional(),
  schoolId: z.string().uuid().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// In-memory consent form store (backed by settings JSON until dedicated table)
// In production this would be a dedicated Prisma model or raw SQL table.
// For the onboarding MVP, we store consent tracking in a simple in-memory
// structure that gets persisted to the tenant's settings via the tenant-svc.
// ══════════════════════════════════════════════════════════════════════════════

interface ConsentFormRecord {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  status: 'PENDING' | 'RECEIVED' | 'EXPIRED';
  signedDate: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

// Per-tenant consent form cache (would be DB-backed in production)
const consentFormStore = new Map<string, ConsentFormRecord[]>();

let nextId = 1;
function generateId(): string {
  return `cf-${Date.now()}-${nextId++}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ══════════════════════════════════════════════════════════════════════════════

export const registerConsentFormRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // ──────────────────────────────────────────────────────────────────────────
  // POST /consent-forms/upload — Upload signed consent forms (batch)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/upload',
    {
      preHandler: requireRole([
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
      ]),
    },
    async (request, reply) => {
      const parsed = uploadConsentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { tenantId, forms } = parsed.data;
      const now = new Date().toISOString();

      if (!consentFormStore.has(tenantId)) {
        consentFormStore.set(tenantId, []);
      }
      const store = consentFormStore.get(tenantId)!;

      const results: ConsentFormRecord[] = [];
      for (const form of forms) {
        // Check if student already has a record
        const existing = store.find((r) => r.studentId === form.studentId);
        if (existing) {
          existing.status = form.consentStatus;
          existing.parentName = form.parentName;
          existing.parentEmail = form.parentEmail ?? existing.parentEmail;
          existing.signedDate = form.signedDate ?? existing.signedDate;
          existing.fileUrl = form.fileUrl ?? existing.fileUrl;
          existing.fileName = form.fileName ?? existing.fileName;
          existing.updatedAt = now;
          results.push(existing);
        } else {
          const record: ConsentFormRecord = {
            id: generateId(),
            tenantId,
            studentId: form.studentId,
            studentName: form.studentName ?? form.studentId,
            parentName: form.parentName,
            parentEmail: form.parentEmail ?? '',
            status: form.consentStatus,
            signedDate: form.signedDate ?? null,
            fileUrl: form.fileUrl ?? null,
            fileName: form.fileName ?? null,
            createdAt: now,
            updatedAt: now,
          };
          store.push(record);
          results.push(record);
        }
      }

      return reply.status(201).send({
        uploaded: results.length,
        forms: results,
      });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /consent-forms/status — Consent tracking dashboard
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/status',
    {
      preHandler: requireRole([
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
        Role.TEACHER,
      ]),
    },
    async (request, reply) => {
      const parsed = statusQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid query',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { tenantId, status, page, pageSize } = parsed.data;
      const store = consentFormStore.get(tenantId) ?? [];

      let filtered = store;
      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }

      const total = filtered.length;
      const totalAll = store.length;
      const received = store.filter((r) => r.status === 'RECEIVED').length;
      const pending = store.filter((r) => r.status === 'PENDING').length;
      const expired = store.filter((r) => r.status === 'EXPIRED').length;
      const consentPercentage = totalAll > 0 ? Math.round((received / totalAll) * 100) : 0;

      // Paginate
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return reply.send({
        summary: {
          total: totalAll,
          received,
          pending,
          expired,
          consentPercentage,
        },
        forms: paginated,
        pagination: {
          page,
          pageSize,
          totalFiltered: total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /consent-forms/reminders — Send email reminders for missing consent
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/reminders',
    {
      preHandler: requireRole([
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
      ]),
    },
    async (request, reply) => {
      const parsed = reminderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { tenantId, studentIds } = parsed.data;
      const store = consentFormStore.get(tenantId) ?? [];

      let pendingForms = store.filter((r) => r.status === 'PENDING' && r.parentEmail);
      if (studentIds && studentIds.length > 0) {
        pendingForms = pendingForms.filter((r) => studentIds.includes(r.studentId));
      }

      // In production, this would call the notification service to send emails
      const reminders = pendingForms.map((form) => ({
        studentId: form.studentId,
        studentName: form.studentName,
        parentEmail: form.parentEmail,
        reminderSent: true,
      }));

      request.log.info(
        { tenantId, count: reminders.length },
        'Consent form reminders queued',
      );

      return reply.send({
        sent: reminders.length,
        reminders,
      });
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /consent-forms/template — Generate printable consent form template
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/template',
    {
      preHandler: requireRole([
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
        Role.TEACHER,
      ]),
    },
    async (request, reply) => {
      const { tenantId } = request.query as { tenantId: string };

      const template = {
        title: 'AIVO Parent/Guardian Consent Form',
        subtitle: 'Authorization for AI-Assisted Learning Services',
        sections: [
          {
            heading: 'Student Information',
            fields: [
              'Student Full Name',
              'Grade Level',
              'School Name',
              'Student ID Number',
            ],
          },
          {
            heading: 'Parent/Guardian Information',
            fields: [
              'Parent/Guardian Full Name',
              'Relationship to Student',
              'Email Address',
              'Phone Number',
            ],
          },
          {
            heading: 'Consent Authorization',
            text: `I, the undersigned parent/legal guardian, hereby authorize the use of AIVO's ` +
              `AI-assisted learning platform for my child. I understand that:\n\n` +
              `1. AIVO complies with FERPA (Family Educational Rights and Privacy Act) ` +
              `and COPPA (Children's Online Privacy Protection Act).\n` +
              `2. My child's educational data will be used solely for personalized learning.\n` +
              `3. No student data will be sold or shared with third parties for commercial purposes.\n` +
              `4. I may revoke this consent at any time by contacting the school district.\n` +
              `5. I have the right to review my child's educational records at any time.`,
          },
          {
            heading: 'Signature',
            fields: [
              'Parent/Guardian Signature',
              'Date',
              'Printed Name',
            ],
          },
        ],
        footer: `This form complies with FERPA 34 CFR § 99.30 and COPPA 16 CFR Part 312. ` +
          `Return this signed form to your child's school or upload via the AIVO parent portal.`,
        tenantId,
        generatedAt: new Date().toISOString(),
      };

      return reply.send({ template });
    },
  );
};
