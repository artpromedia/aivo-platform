/**
 * Message Translation Service
 *
 * Provides on-demand translation of messages using an external translation API.
 * Supports caching of translated messages to avoid repeated API calls.
 *
 * PRD: "Message translation for multilingual parent-teacher communication."
 *
 * Architecture:
 * - Uses a configurable translation provider (Google Translate API, DeepL, etc.)
 * - Falls back to a no-op translator when no API key is configured
 * - Caches translations per message + target locale for performance
 * - Exposes a REST endpoint for the client to request translations
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SupportedLocale =
  | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' | 'ko'
  | 'ar' | 'hi' | 'vi' | 'tl' | 'ru' | 'uk' | 'pl' | 'it';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLocale: string;
  targetLocale: string;
  cached: boolean;
}

export interface DetectedLanguage {
  locale: string;
  confidence: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY || '';
const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'google'; // 'google' | 'deepl'
const TRANSLATION_API_URL = process.env.TRANSLATION_API_URL || 'https://translation.googleapis.com/language/translate/v2';

const SUPPORTED_LOCALES = new Set<string>([
  'en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko',
  'ar', 'hi', 'vi', 'tl', 'ru', 'uk', 'pl', 'it',
]);

// ══════════════════════════════════════════════════════════════════════════════
// TRANSLATION CACHE
// ══════════════════════════════════════════════════════════════════════════════

// Cache key: `${messageId}:${targetLocale}` → translated text
const translationCache = new Map<string, { text: string; timestamp: number }>();

/** Cache TTL: 24 hours */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Max cache entries before eviction */
const MAX_CACHE_SIZE = 10_000;

function getCacheKey(messageIdOrText: string, targetLocale: string): string {
  return `${messageIdOrText}::${targetLocale}`;
}

function getCached(key: string): string | null {
  const entry = translationCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    translationCache.delete(key);
    return null;
  }

  return entry.text;
}

function setCache(key: string, text: string): void {
  // Evict oldest entries if cache is full
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, { text, timestamp: Date.now() });
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSLATION PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Translate text using Google Cloud Translation API v2.
 */
async function translateWithGoogle(
  text: string,
  targetLocale: string,
  sourceLocale?: string,
): Promise<{ translatedText: string; detectedSource: string }> {
  const params = new URLSearchParams({
    q: text,
    target: targetLocale,
    key: TRANSLATION_API_KEY,
    format: 'text',
  });
  if (sourceLocale) {
    params.set('source', sourceLocale);
  }

  const response = await fetch(`${TRANSLATION_API_URL}?${params.toString()}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    data: {
      translations: Array<{
        translatedText: string;
        detectedSourceLanguage?: string;
      }>;
    };
  };

  const translation = data.data.translations[0];
  return {
    translatedText: translation.translatedText,
    detectedSource: translation.detectedSourceLanguage || sourceLocale || 'unknown',
  };
}

/**
 * Translate text using DeepL API.
 */
async function translateWithDeepL(
  text: string,
  targetLocale: string,
  sourceLocale?: string,
): Promise<{ translatedText: string; detectedSource: string }> {
  const apiUrl = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';

  const body: Record<string, unknown> = {
    text: [text],
    target_lang: targetLocale.toUpperCase(),
  };
  if (sourceLocale) {
    body.source_lang = sourceLocale.toUpperCase();
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${TRANSLATION_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    translations: Array<{
      text: string;
      detected_source_language?: string;
    }>;
  };

  const translation = data.translations[0];
  return {
    translatedText: translation.text,
    detectedSource: translation.detected_source_language?.toLowerCase() || sourceLocale || 'unknown',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a locale is supported for translation.
 */
export function isSupportedLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.has(locale.toLowerCase().split('-')[0]);
}

/**
 * Get the list of supported translation locales.
 */
export function getSupportedLocales(): string[] {
  return Array.from(SUPPORTED_LOCALES);
}

/**
 * Translate a message to the target locale.
 *
 * Uses cached translations when available. Falls back gracefully
 * if the translation API is not configured.
 *
 * @param messageId - Unique message ID (for caching)
 * @param text - The message content to translate
 * @param targetLocale - Target locale (e.g., 'es', 'fr')
 * @param sourceLocale - Optional source locale (auto-detected if omitted)
 */
export async function translateMessage(
  messageId: string,
  text: string,
  targetLocale: string,
  sourceLocale?: string,
): Promise<TranslationResult> {
  const normalizedTarget = targetLocale.toLowerCase().split('-')[0];

  // Don't translate if source and target are the same
  if (sourceLocale && sourceLocale.toLowerCase().split('-')[0] === normalizedTarget) {
    return {
      originalText: text,
      translatedText: text,
      sourceLocale: sourceLocale,
      targetLocale: normalizedTarget,
      cached: false,
    };
  }

  // Check cache
  const cacheKey = getCacheKey(messageId, normalizedTarget);
  const cached = getCached(cacheKey);
  if (cached) {
    return {
      originalText: text,
      translatedText: cached,
      sourceLocale: sourceLocale || 'auto',
      targetLocale: normalizedTarget,
      cached: true,
    };
  }

  // If no API key configured, return original text with a note
  if (!TRANSLATION_API_KEY) {
    console.warn('[Translation] No translation API key configured — returning original text');
    return {
      originalText: text,
      translatedText: text,
      sourceLocale: sourceLocale || 'unknown',
      targetLocale: normalizedTarget,
      cached: false,
    };
  }

  // Call translation provider
  try {
    const result = TRANSLATION_PROVIDER === 'deepl'
      ? await translateWithDeepL(text, normalizedTarget, sourceLocale)
      : await translateWithGoogle(text, normalizedTarget, sourceLocale);

    // Cache the result
    setCache(cacheKey, result.translatedText);

    return {
      originalText: text,
      translatedText: result.translatedText,
      sourceLocale: result.detectedSource,
      targetLocale: normalizedTarget,
      cached: false,
    };
  } catch (error) {
    console.error(`[Translation] Failed to translate message ${messageId}:`, error);
    // Graceful fallback: return original text
    return {
      originalText: text,
      translatedText: text,
      sourceLocale: sourceLocale || 'unknown',
      targetLocale: normalizedTarget,
      cached: false,
    };
  }
}

/**
 * Clear the translation cache (for testing / ops).
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}
