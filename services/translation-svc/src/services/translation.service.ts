/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * Translation Service
 *
 * Core service for managing translations including:
 * - CRUD operations for translation entries
 * - Machine translation integration
 * - Translation memory
 * - Glossary management
 */

import type { SupportedLocale, TranslationNamespace } from '@aivo/i18n';
import { Translate } from '@google-cloud/translate/build/src/v2';

import sql from '../db';
import type {
  TranslationEntry,
  TranslationStatus,
  TranslationMemoryEntry,
  GlossaryTerm,
  TranslationBundle,
  TranslationStats,
  TranslationDiff,
  MachineTranslationRequest,
  MachineTranslationResult,
  TranslationProvider,
  TranslationSource,
} from '../types';

/**
 * Translation service configuration
 */
export interface TranslationServiceConfig {
  defaultProvider: TranslationProvider;
  googleApiKey?: string;
  deeplApiKey?: string;
  azureApiKey?: string;
  azureRegion?: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

// Database row types
interface TranslationRow {
  id: string;
  key: string;
  locale: string;
  namespace: string;
  value: string;
  context: string | null;
  description: string | null;
  status: string;
  source: string;
  plural_form: string | null;
  max_length: number | null;
  screenshot_url: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface TranslationMemoryRow {
  id: string;
  source_locale: string;
  source_text: string;
  target_locale: string;
  target_text: string;
  context: string | null;
  quality: number;
  usage_count: number;
  created_at: Date;
  last_used_at: Date;
}

interface GlossaryTermRow {
  id: string;
  term: string;
  base_locale: string;
  definition: string;
  category: string | null;
  do_not_translate: boolean;
  case_sensitive: boolean;
  created_at: Date;
  updated_at: Date;
}

interface GlossaryTranslationRow {
  locale: string;
  translation: string;
}

/**
 * Translation Service
 */
export class TranslationService {
  private config: TranslationServiceConfig;
  private googleTranslate: Translate | null = null;

  constructor(config: TranslationServiceConfig) {
    this.config = config;

    if (config.googleApiKey) {
      this.googleTranslate = new Translate({ key: config.googleApiKey });
    }
  }

  // ==================== Translation CRUD ====================

  /**
   * Get a translation by key
   */
  async getTranslation(
    locale: SupportedLocale,
    namespace: TranslationNamespace,
    key: string
  ): Promise<TranslationEntry | null> {
    const rows = await sql<TranslationRow[]>`
      SELECT * FROM translations
      WHERE locale = ${locale}
        AND namespace = ${namespace}
        AND key = ${key}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return this.rowToEntry(rows[0]);
  }

  /**
   * Get all translations for a locale and namespace
   */
  async getTranslations(
    locale: SupportedLocale,
    namespace: TranslationNamespace
  ): Promise<TranslationEntry[]> {
    const rows = await sql<TranslationRow[]>`
      SELECT * FROM translations
      WHERE locale = ${locale}
        AND namespace = ${namespace}
      ORDER BY key
    `;

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Create or update a translation
   */
  async upsertTranslation(
    entry: Omit<TranslationEntry, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<TranslationEntry> {
    const rows = await sql<TranslationRow[]>`
      INSERT INTO translations (
        key, locale, namespace, value, context, description,
        status, source, plural_form, max_length, screenshot_url,
        created_by, updated_by
      ) VALUES (
        ${entry.key}, ${entry.locale}, ${entry.namespace}, ${entry.value},
        ${entry.context ?? null}, ${entry.description ?? null},
        ${entry.status}, ${entry.source}, ${entry.pluralForm ?? null},
        ${entry.maxLength ?? null}, ${entry.screenshot ?? null},
        ${entry.createdBy ?? null}, ${entry.updatedBy ?? null}
      )
      ON CONFLICT (locale, namespace, key)
      DO UPDATE SET
        value = EXCLUDED.value,
        context = EXCLUDED.context,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        source = EXCLUDED.source,
        plural_form = EXCLUDED.plural_form,
        max_length = EXCLUDED.max_length,
        screenshot_url = EXCLUDED.screenshot_url,
        updated_by = EXCLUDED.updated_by
      RETURNING *
    `;

    return this.rowToEntry(rows[0]);
  }

  /**
   * Delete a translation
   */
  async deleteTranslation(
    locale: SupportedLocale,
    namespace: TranslationNamespace,
    key: string
  ): Promise<boolean> {
    const result = await sql`
      DELETE FROM translations
      WHERE locale = ${locale}
        AND namespace = ${namespace}
        AND key = ${key}
    `;

    return result.count > 0;
  }

  /**
   * Update translation status
   */
  async updateStatus(
    id: string,
    status: TranslationStatus,
    userId?: string
  ): Promise<TranslationEntry> {
    const rows = await sql<TranslationRow[]>`
      UPDATE translations
      SET status = ${status}, updated_by = ${userId ?? null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      throw new Error(`Translation with id ${id} not found`);
    }

    return this.rowToEntry(rows[0]);
  }

  // ==================== Machine Translation ====================

  /**
   * Translate text using machine translation
   */
  async machineTranslate(request: MachineTranslationRequest): Promise<MachineTranslationResult> {
    const provider = request.provider ?? this.config.defaultProvider;

    // Check translation memory first
    const memoryResults = await this.checkTranslationMemory(
      request.texts,
      request.sourceLocale,
      request.targetLocale
    );

    // Get texts that need machine translation
    const textsToTranslate: string[] = [];
    const memoryHits = new Map<number, string>();

    request.texts.forEach((text, index) => {
      const memoryHit = memoryResults.find((m) => m.sourceText === text);
      if (memoryHit && memoryHit.quality >= 80) {
        memoryHits.set(index, memoryHit.targetText);
      } else {
        textsToTranslate.push(text);
      }
    });

    let machineResults: MachineTranslationResult['translations'] = [];

    if (textsToTranslate.length > 0) {
      switch (provider) {
        case 'google':
          machineResults = await this.translateWithGoogle(
            textsToTranslate,
            request.sourceLocale,
            request.targetLocale
          );
          break;
        case 'deepl':
          machineResults = await this.translateWithDeepL(
            textsToTranslate,
            request.sourceLocale,
            request.targetLocale
          );
          break;
        default:
          throw new Error(`Unsupported translation provider: ${provider}`);
      }

      // Store in translation memory
      for (const result of machineResults) {
        await this.addToTranslationMemory({
          sourceLocale: request.sourceLocale,
          sourceText: result.sourceText,
          targetLocale: request.targetLocale,
          targetText: result.translatedText,
          quality: result.confidence ?? 70,
        });
      }
    }

    // Combine results
    const translations: MachineTranslationResult['translations'] = [];
    let machineIndex = 0;

    request.texts.forEach((text, index) => {
      if (memoryHits.has(index)) {
        translations.push({
          sourceText: text,
          translatedText: memoryHits.get(index)!,
          confidence: 100,
          provider: 'memory' as TranslationProvider,
        });
      } else {
        translations.push(machineResults[machineIndex++]);
      }
    });

    return { translations };
  }

  /**
   * Translate with Google Cloud Translation
   */
  private async translateWithGoogle(
    texts: string[],
    sourceLocale: SupportedLocale,
    targetLocale: SupportedLocale
  ): Promise<MachineTranslationResult['translations']> {
    if (!this.config.googleApiKey || !this.googleTranslate) {
      throw new Error('Google API key not configured');
    }

    const results: MachineTranslationResult['translations'] = [];

    // Google Translate API supports batch translation
    const [translations] = await this.googleTranslate.translate(texts, {
      from: sourceLocale,
      to: targetLocale,
    });

    const translatedArray = Array.isArray(translations) ? translations : [translations];

    for (let i = 0; i < texts.length; i++) {
      results.push({
        sourceText: texts[i],
        translatedText: translatedArray[i] ?? texts[i],
        confidence: 85,
        provider: 'google' as TranslationProvider,
      });
    }

    return results;
  }

  /**
   * Translate with DeepL
   */
  private async translateWithDeepL(
    texts: string[],
    sourceLocale: SupportedLocale,
    targetLocale: SupportedLocale
  ): Promise<MachineTranslationResult['translations']> {
    if (!this.config.deeplApiKey) {
      throw new Error('DeepL API key not configured');
    }

    // DeepL uses different locale codes
    const deeplSourceLang = this.toDeepLLanguage(sourceLocale);
    const deeplTargetLang = this.toDeepLLanguage(targetLocale);

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${this.config.deeplApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: texts,
        source_lang: deeplSourceLang,
        target_lang: deeplTargetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      translations: { text: string; detected_source_language?: string }[];
    };

    return texts.map((text, index) => ({
      sourceText: text,
      translatedText: data.translations[index]?.text ?? text,
      confidence: 90,
      provider: 'deepl' as TranslationProvider,
    }));
  }

  /**
   * Convert locale to DeepL language code
   */
  private toDeepLLanguage(locale: SupportedLocale): string {
    const mapping: Record<string, string> = {
      en: 'EN',
      'en-US': 'EN-US',
      'en-GB': 'EN-GB',
      es: 'ES',
      'es-MX': 'ES',
      fr: 'FR',
      de: 'DE',
      it: 'IT',
      pt: 'PT-PT',
      'pt-BR': 'PT-BR',
      zh: 'ZH',
      ja: 'JA',
      ko: 'KO',
    };
    return mapping[locale] ?? locale.toUpperCase().split('-')[0];
  }

  // ==================== Translation Memory ====================

  /**
   * Check translation memory for existing translations
   */
  async checkTranslationMemory(
    texts: string[],
    sourceLocale: SupportedLocale,
    targetLocale: SupportedLocale
  ): Promise<TranslationMemoryEntry[]> {
    if (texts.length === 0) {
      return [];
    }

    // Use exact matching for now (fuzzy matching could be added with pg_trgm)
    const rows = await sql<TranslationMemoryRow[]>`
      SELECT * FROM translation_memory
      WHERE source_locale = ${sourceLocale}
        AND target_locale = ${targetLocale}
        AND source_text = ANY(${texts})
      ORDER BY quality DESC
    `;

    // Update usage count for hits
    if (rows.length > 0) {
      await sql`
        UPDATE translation_memory
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = ANY(${rows.map((r) => r.id)})
      `;
    }

    return rows.map((row) => ({
      id: row.id,
      sourceLocale: row.source_locale as SupportedLocale,
      sourceText: row.source_text,
      targetLocale: row.target_locale as SupportedLocale,
      targetText: row.target_text,
      context: row.context ?? undefined,
      quality: row.quality,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    }));
  }

  /**
   * Add entry to translation memory
   */
  async addToTranslationMemory(
    entry: Omit<TranslationMemoryEntry, 'id' | 'usageCount' | 'createdAt' | 'lastUsedAt'>
  ): Promise<TranslationMemoryEntry> {
    const rows = await sql<TranslationMemoryRow[]>`
      INSERT INTO translation_memory (
        source_locale, source_text, target_locale, target_text, context, quality
      ) VALUES (
        ${entry.sourceLocale}, ${entry.sourceText},
        ${entry.targetLocale}, ${entry.targetText},
        ${entry.context ?? null}, ${entry.quality}
      )
      ON CONFLICT (source_locale, target_locale, md5(source_text), md5(COALESCE(context, '')))
      DO UPDATE SET
        target_text = EXCLUDED.target_text,
        quality = GREATEST(translation_memory.quality, EXCLUDED.quality),
        usage_count = translation_memory.usage_count + 1,
        last_used_at = NOW()
      RETURNING *
    `;

    const row = rows[0];
    return {
      id: row.id,
      sourceLocale: row.source_locale as SupportedLocale,
      sourceText: row.source_text,
      targetLocale: row.target_locale as SupportedLocale,
      targetText: row.target_text,
      context: row.context ?? undefined,
      quality: row.quality,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  }

  // ==================== Glossary ====================

  /**
   * Get glossary terms
   */
  async getGlossaryTerms(locale: SupportedLocale, category?: string): Promise<GlossaryTerm[]> {
    const baseQuery = sql<(GlossaryTermRow & { translations_json: string })[]>`
      SELECT
        gt.*,
        COALESCE(
          json_agg(
            json_build_object('locale', gtr.locale, 'translation', gtr.translation)
          ) FILTER (WHERE gtr.id IS NOT NULL),
          '[]'
        )::text as translations_json
      FROM glossary_terms gt
      LEFT JOIN glossary_translations gtr ON gt.id = gtr.term_id
      WHERE gt.base_locale = ${locale}
        ${category ? sql`AND gt.category = ${category}` : sql``}
      GROUP BY gt.id
      ORDER BY gt.term
    `;

    const rows = await baseQuery;

    return rows.map((row) => {
      const translationsArray = JSON.parse(row.translations_json) as GlossaryTranslationRow[];
      const translations: Record<SupportedLocale, string> = {} as Record<SupportedLocale, string>;
      for (const tr of translationsArray) {
        if (tr.locale && tr.translation) {
          translations[tr.locale as SupportedLocale] = tr.translation;
        }
      }

      return {
        id: row.id,
        term: row.term,
        locale: row.base_locale as SupportedLocale,
        definition: row.definition,
        translations,
        category: row.category ?? undefined,
        doNotTranslate: row.do_not_translate,
        caseSensitive: row.case_sensitive,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  /**
   * Add glossary term
   */
  async addGlossaryTerm(
    term: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GlossaryTerm> {
    // Insert term
    const termRows = await sql<GlossaryTermRow[]>`
      INSERT INTO glossary_terms (
        term, base_locale, definition, category, do_not_translate, case_sensitive
      ) VALUES (
        ${term.term}, ${term.locale}, ${term.definition},
        ${term.category ?? null}, ${term.doNotTranslate ?? false}, ${term.caseSensitive ?? true}
      )
      RETURNING *
    `;

    const termRow = termRows[0];

    // Insert translations
    const translationEntries = Object.entries(term.translations);
    if (translationEntries.length > 0) {
      for (const [locale, translation] of translationEntries) {
        await sql`
          INSERT INTO glossary_translations (term_id, locale, translation)
          VALUES (${termRow.id}, ${locale}, ${translation})
        `;
      }
    }

    return {
      id: termRow.id,
      term: termRow.term,
      locale: termRow.base_locale as SupportedLocale,
      definition: termRow.definition,
      translations: term.translations,
      category: termRow.category ?? undefined,
      doNotTranslate: termRow.do_not_translate,
      caseSensitive: termRow.case_sensitive,
      createdAt: termRow.created_at,
      updatedAt: termRow.updated_at,
    };
  }

  /**
   * Apply glossary to text
   */
  async applyGlossary(
    text: string,
    sourceLocale: SupportedLocale,
    targetLocale: SupportedLocale
  ): Promise<string> {
    const terms = await this.getGlossaryTerms(sourceLocale);
    let result = text;

    for (const term of terms) {
      if (term.doNotTranslate) {
        // Preserve original term
        continue;
      }

      const translation = term.translations[targetLocale];
      if (translation) {
        const flags = term.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(`\\b${this.escapeRegex(term.term)}\\b`, flags);
        result = result.replace(regex, translation);
      }
    }

    return result;
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ==================== Bundle Management ====================

  /**
   * Export translations as bundle
   */
  async exportBundle(
    locale: SupportedLocale,
    namespace: TranslationNamespace,
    options: { includeUnpublished?: boolean } = {}
  ): Promise<TranslationBundle> {
    const entries = await this.getTranslations(locale, namespace);

    const filteredEntries = options.includeUnpublished
      ? entries
      : entries.filter((e) => e.status === 'published');

    const translations: Record<string, string> = {};
    for (const entry of filteredEntries) {
      translations[entry.key] = entry.value;
    }

    return {
      locale,
      namespace,
      version: new Date().toISOString(),
      translations,
      metadata: {
        exportedAt: new Date(),
      },
    };
  }

  /**
   * Import translations from bundle
   */
  async importBundle(
    bundle: TranslationBundle,
    options: { overwrite?: boolean; status?: TranslationStatus } = {}
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const { overwrite = false, status = 'pending_review' } = options;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [key, value] of Object.entries(bundle.translations)) {
      try {
        const existing = await this.getTranslation(bundle.locale, bundle.namespace, key);

        if (existing && !overwrite) {
          skipped++;
          continue;
        }

        await this.upsertTranslation({
          key,
          locale: bundle.locale,
          namespace: bundle.namespace,
          value,
          status,
          source: 'imported' as TranslationSource,
        });

        imported++;
      } catch (error) {
        errors.push(`Failed to import key "${key}": ${error}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Compare bundles and get diff
   */
  compareBundles(source: TranslationBundle, target: TranslationBundle): TranslationDiff {
    const sourceKeys = new Set(Object.keys(source.translations));
    const targetKeys = new Set(Object.keys(target.translations));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];

    for (const key of sourceKeys) {
      if (!targetKeys.has(key)) {
        removed.push(key);
      } else if (source.translations[key] !== target.translations[key]) {
        modified.push(key);
      } else {
        unchanged.push(key);
      }
    }

    for (const key of targetKeys) {
      if (!sourceKeys.has(key)) {
        added.push(key);
      }
    }

    return { added, removed, modified, unchanged };
  }

  // ==================== Statistics ====================

  /**
   * Get translation statistics
   */
  async getStats(
    locale: SupportedLocale,
    namespace: TranslationNamespace
  ): Promise<TranslationStats> {
    const entries = await this.getTranslations(locale, namespace);

    const totalKeys = entries.length;
    const translatedKeys = entries.filter((e) => e.value?.trim()).length;
    const approvedKeys = entries.filter(
      (e) => e.status === 'approved' || e.status === 'published'
    ).length;
    const pendingKeys = entries.filter((e) => e.status === 'pending_review').length;

    const lastEntry =
      entries.length > 0
        ? entries.reduce(
            (latest, entry) => (entry.updatedAt > latest.updatedAt ? entry : latest),
            entries[0]
          )
        : null;

    return {
      locale,
      namespace,
      totalKeys,
      translatedKeys,
      approvedKeys,
      pendingKeys,
      completionPercentage: totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0,
      lastUpdated: lastEntry?.updatedAt ?? new Date(),
    };
  }

  /**
   * Get missing translations
   */
  async getMissingTranslations(
    sourceLocale: SupportedLocale,
    targetLocale: SupportedLocale,
    namespace: TranslationNamespace
  ): Promise<string[]> {
    const sourceEntries = await this.getTranslations(sourceLocale, namespace);
    const targetEntries = await this.getTranslations(targetLocale, namespace);

    const targetKeys = new Set(targetEntries.map((e) => e.key));

    return sourceEntries.filter((e) => !targetKeys.has(e.key)).map((e) => e.key);
  }

  // ==================== Helpers ====================

  /**
   * Convert database row to TranslationEntry
   */
  private rowToEntry(row: TranslationRow): TranslationEntry {
    return {
      id: row.id,
      key: row.key,
      locale: row.locale as SupportedLocale,
      namespace: row.namespace as TranslationNamespace,
      value: row.value,
      context: row.context ?? undefined,
      description: row.description ?? undefined,
      status: row.status as TranslationStatus,
      source: row.source as TranslationSource,
      pluralForm: row.plural_form ?? undefined,
      maxLength: row.max_length ?? undefined,
      screenshot: row.screenshot_url ?? undefined,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by ?? undefined,
      updatedBy: row.updated_by ?? undefined,
    };
  }
}
