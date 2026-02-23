/**
 * Curriculum Trigger Service
 *
 * Fires HTTP calls to curriculum-svc after district onboarding to kick off
 * AI-generated curriculum for the newly activated tenant.
 *
 * This is a fire-and-forget service — failures are logged but do not block
 * the go-live flow.
 */

const CURRICULUM_SVC_URL =
  process.env.CURRICULUM_SVC_URL ?? 'http://localhost:4012';

/** Minimal shape returned by GET /generation/templates */
interface TemplateInfo {
  id: string;
  name: string;
  subject: string;
  gradeBand: string;
}

interface TriggerResult {
  templateId: string;
  templateName: string;
  jobId?: string;
  status: 'triggered' | 'skipped' | 'failed';
  reason?: string;
}

export interface CurriculumTriggerRequest {
  tenantId: string;
  stateCode: string;
  curriculumStandards: string[];
  triggeredBy?: string;
}

/**
 * Trigger curriculum generation for a newly-onboarded district.
 *
 * 1. Fetches all active curriculum templates from curriculum-svc
 * 2. POSTs a generation trigger for each template, using the district's
 *    resolved curriculum standards (e.g., TEKS, COMMON_CORE, NGSS)
 *
 * Runs in the background — logs results but never throws.
 */
export async function triggerCurriculumGeneration(
  request: CurriculumTriggerRequest,
  log: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void },
): Promise<void> {
  const { tenantId, stateCode, curriculumStandards, triggeredBy } = request;

  log.info(
    { tenantId, stateCode, curriculumStandards },
    '[CurriculumTrigger] Starting curriculum generation for district',
  );

  // ── 1. Fetch available templates ─────────────────────────────────────────
  let templates: TemplateInfo[];
  try {
    const res = await fetch(`${CURRICULUM_SVC_URL}/generation/templates`);
    if (!res.ok) {
      log.error(
        { status: res.status, url: `${CURRICULUM_SVC_URL}/generation/templates` },
        '[CurriculumTrigger] Failed to fetch templates',
      );
      return;
    }
    const body = (await res.json()) as { templates: TemplateInfo[] };
    templates = body.templates ?? [];
  } catch (err) {
    log.error(
      { err },
      '[CurriculumTrigger] Could not reach curriculum-svc to fetch templates',
    );
    return;
  }

  if (templates.length === 0) {
    log.warn('[CurriculumTrigger] No curriculum templates found — skipping generation');
    return;
  }

  log.info(
    { count: templates.length },
    '[CurriculumTrigger] Found templates, triggering generation',
  );

  // ── 2. Trigger generation for each template ─────────────────────────────
  const results: TriggerResult[] = [];

  for (const tpl of templates) {
    try {
      const res = await fetch(`${CURRICULUM_SVC_URL}/generation/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          templateId: tpl.id,
          targetStandards: curriculumStandards,
          stateCode,
          triggeredBy: triggeredBy ?? 'onboarding:go-live',
        }),
      });

      if (res.status === 201) {
        const body = (await res.json()) as { job?: { id: string } };
        results.push({
          templateId: tpl.id,
          templateName: tpl.name,
          jobId: body.job?.id,
          status: 'triggered',
        });
      } else if (res.status === 409) {
        // Already generated — idempotency guard
        results.push({
          templateId: tpl.id,
          templateName: tpl.name,
          status: 'skipped',
          reason: 'Curriculum already exists for this template + academic year',
        });
      } else {
        const text = await res.text().catch(() => 'unknown');
        results.push({
          templateId: tpl.id,
          templateName: tpl.name,
          status: 'failed',
          reason: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        });
      }
    } catch (err) {
      results.push({
        templateId: tpl.id,
        templateName: tpl.name,
        status: 'failed',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 3. Log summary ──────────────────────────────────────────────────────
  const triggered = results.filter((r) => r.status === 'triggered').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  log.info(
    { tenantId, triggered, skipped, failed, total: results.length },
    '[CurriculumTrigger] Generation trigger complete',
  );

  if (failed > 0) {
    log.warn(
      { failures: results.filter((r) => r.status === 'failed') },
      '[CurriculumTrigger] Some template triggers failed',
    );
  }
}
