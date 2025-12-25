/**
 * Translation Service API Routes
 */

import type { SupportedLocale, TranslationNamespace } from '@aivo/i18n';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { TranslationService } from '../services/translation.service';

const app = new Hono();

// Initialize service (in production, inject via DI)
const translationService = new TranslationService({
  defaultProvider: 'google',
  cacheEnabled: true,
  cacheTTL: 3600,
});

// Schemas
const localeSchema = z.string() as z.ZodType<SupportedLocale>;
const namespaceSchema = z.string() as z.ZodType<TranslationNamespace>;

const translationEntrySchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string(),
  context: z.string().optional(),
  description: z.string().optional(),
  pluralForm: z.string().optional(),
  maxLength: z.number().optional(),
});

const machineTranslateSchema = z.object({
  texts: z.array(z.string()).min(1).max(100),
  sourceLocale: localeSchema,
  targetLocale: localeSchema,
  provider: z.enum(['google', 'deepl', 'azure', 'amazon']).optional(),
  format: z.enum(['text', 'html']).optional(),
});

const importBundleSchema = z.object({
  locale: localeSchema,
  namespace: namespaceSchema,
  translations: z.record(z.string()),
  overwrite: z.boolean().optional(),
});

// ==================== Translation CRUD ====================

/**
 * Get all translations for a locale and namespace
 */
app.get('/translations/:locale/:namespace', async (c) => {
  const { locale, namespace } = c.req.param();

  try {
    const translations = await translationService.getTranslations(
      locale as SupportedLocale,
      namespace as TranslationNamespace
    );

    return c.json({ translations });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return c.json({ error: 'Failed to fetch translations' }, 500);
  }
});

/**
 * Get a single translation
 */
app.get('/translations/:locale/:namespace/:key', async (c) => {
  const { locale, namespace, key } = c.req.param();

  try {
    const translation = await translationService.getTranslation(
      locale as SupportedLocale,
      namespace as TranslationNamespace,
      key
    );

    if (!translation) {
      return c.json({ error: 'Translation not found' }, 404);
    }

    return c.json({ translation });
  } catch (error) {
    console.error('Error fetching translation:', error);
    return c.json({ error: 'Failed to fetch translation' }, 500);
  }
});

/**
 * Create or update a translation
 */
app.put(
  '/translations/:locale/:namespace',
  zValidator('json', translationEntrySchema),
  async (c) => {
    const { locale, namespace } = c.req.param();
    const body = c.req.valid('json');

    try {
      const translation = await translationService.upsertTranslation({
        ...body,
        locale: locale as SupportedLocale,
        namespace: namespace as TranslationNamespace,
        status: 'pending_review',
        source: 'manual',
      });

      return c.json({ translation }, 201);
    } catch (error) {
      console.error('Error upserting translation:', error);
      return c.json({ error: 'Failed to save translation' }, 500);
    }
  }
);

/**
 * Delete a translation
 */
app.delete('/translations/:locale/:namespace/:key', async (c) => {
  const { locale, namespace, key } = c.req.param();

  try {
    const deleted = await translationService.deleteTranslation(
      locale as SupportedLocale,
      namespace as TranslationNamespace,
      key
    );

    if (!deleted) {
      return c.json({ error: 'Translation not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting translation:', error);
    return c.json({ error: 'Failed to delete translation' }, 500);
  }
});

/**
 * Update translation status
 */
app.patch(
  '/translations/:id/status',
  zValidator(
    'json',
    z.object({ status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'published']) })
  ),
  async (c) => {
    const { id } = c.req.param();
    const { status } = c.req.valid('json');

    try {
      const translation = await translationService.updateStatus(id, status);
      return c.json({ translation });
    } catch (error) {
      console.error('Error updating status:', error);
      return c.json({ error: 'Failed to update status' }, 500);
    }
  }
);

// ==================== Machine Translation ====================

/**
 * Translate text using machine translation
 */
app.post('/translate', zValidator('json', machineTranslateSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    const result = await translationService.machineTranslate(body);
    return c.json(result);
  } catch (error) {
    console.error('Error in machine translation:', error);
    return c.json({ error: 'Failed to translate' }, 500);
  }
});

// ==================== Bundle Management ====================

/**
 * Export translations as bundle
 */
app.get('/bundles/:locale/:namespace', async (c) => {
  const { locale, namespace } = c.req.param();
  const includeUnpublished = c.req.query('includeUnpublished') === 'true';

  try {
    const bundle = await translationService.exportBundle(
      locale as SupportedLocale,
      namespace as TranslationNamespace,
      { includeUnpublished }
    );

    return c.json(bundle);
  } catch (error) {
    console.error('Error exporting bundle:', error);
    return c.json({ error: 'Failed to export bundle' }, 500);
  }
});

/**
 * Import translations from bundle
 */
app.post('/bundles/import', zValidator('json', importBundleSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    const result = await translationService.importBundle(
      {
        locale: body.locale,
        namespace: body.namespace,
        version: new Date().toISOString(),
        translations: body.translations,
        metadata: { exportedAt: new Date() },
      },
      { overwrite: body.overwrite }
    );

    return c.json(result);
  } catch (error) {
    console.error('Error importing bundle:', error);
    return c.json({ error: 'Failed to import bundle' }, 500);
  }
});

// ==================== Statistics ====================

/**
 * Get translation statistics
 */
app.get('/stats/:locale/:namespace', async (c) => {
  const { locale, namespace } = c.req.param();

  try {
    const stats = await translationService.getStats(
      locale as SupportedLocale,
      namespace as TranslationNamespace
    );

    return c.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

/**
 * Get missing translations
 */
app.get('/missing/:sourceLocale/:targetLocale/:namespace', async (c) => {
  const { sourceLocale, targetLocale, namespace } = c.req.param();

  try {
    const missingKeys = await translationService.getMissingTranslations(
      sourceLocale as SupportedLocale,
      targetLocale as SupportedLocale,
      namespace as TranslationNamespace
    );

    return c.json({ missingKeys, count: missingKeys.length });
  } catch (error) {
    console.error('Error fetching missing translations:', error);
    return c.json({ error: 'Failed to fetch missing translations' }, 500);
  }
});

// ==================== Glossary ====================

/**
 * Get glossary terms
 */
app.get('/glossary/:locale', async (c) => {
  const { locale } = c.req.param();
  const category = c.req.query('category');

  try {
    const terms = await translationService.getGlossaryTerms(locale as SupportedLocale, category);

    return c.json({ terms });
  } catch (error) {
    console.error('Error fetching glossary:', error);
    return c.json({ error: 'Failed to fetch glossary' }, 500);
  }
});

/**
 * Add glossary term
 */
app.post(
  '/glossary',
  zValidator(
    'json',
    z.object({
      term: z.string().min(1),
      locale: localeSchema,
      definition: z.string(),
      translations: z.record(z.string()).optional(),
      category: z.string().optional(),
      doNotTranslate: z.boolean().optional(),
      caseSensitive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const term = await translationService.addGlossaryTerm({
        ...body,
        translations: (body.translations ?? {}) as Record<SupportedLocale, string>,
      });

      return c.json({ term }, 201);
    } catch (error) {
      console.error('Error adding glossary term:', error);
      return c.json({ error: 'Failed to add glossary term' }, 500);
    }
  }
);

export { app as translationRoutes };
