/**
 * IEP Content Translation Hook
 *
 * Translates IEP goal text fields (plainText, whatItMeans, howToHelp,
 * officialText, present-level plainText, service/accommodation explanations)
 * via the ai-orchestrator TranslationService when the user's locale is non-English.
 *
 * Translations are cached in-memory per locale + content hash to avoid
 * redundant API calls on re-renders.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================================================
// Types
// ============================================================================

interface PlainLanguageGoal {
  domain: string;
  officialText: string;
  plainText: string;
  currentProgress: number;
  target: number;
  whatItMeans: string;
  howToHelp: string;
}

interface PresentLevel {
  category: string;
  officialText: string;
  plainText: string;
}

interface ServiceDetail {
  type: string;
  provider: string;
  frequency: string;
  plainExplanation: string;
}

interface Accommodation {
  name: string;
  plainExplanation: string;
}

interface TranslatableIEP {
  goals: PlainLanguageGoal[];
  presentLevels: PresentLevel[];
  services: ServiceDetail[];
  accommodations: Accommodation[];
  eligibilityPlain: string;
}

interface TranslationResult<T> {
  data: T;
  isTranslating: boolean;
  error: string | null;
}

// ============================================================================
// Translation cache — avoids redundant calls across re-renders
// ============================================================================

const translationCache = new Map<string, string>();

function cacheKey(locale: string, text: string): string {
  // Simple hash: locale + first 80 chars (enough to be unique for our content)
  return `${locale}::${text.slice(0, 80)}`;
}

// ============================================================================
// API helper
// ============================================================================

async function translateTexts(texts: string[], targetLanguage: string): Promise<string[]> {
  const apiUrl = process.env.NEXT_PUBLIC_AI_API_URL || '/api/ai';

  // Check cache first — only translate un-cached texts
  const uncachedIndices: number[] = [];
  const results: string[] = new Array(texts.length);

  for (let i = 0; i < texts.length; i++) {
    const key = cacheKey(targetLanguage, texts[i]);
    const cached = translationCache.get(key);
    if (cached !== undefined) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
    }
  }

  if (uncachedIndices.length === 0) {
    return results; // All cached
  }

  // Batch translate uncached texts
  const toTranslate = uncachedIndices.map((i) => texts[i]);

  try {
    const res = await fetch(`${apiUrl}/translate/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: toTranslate,
        sourceLanguage: 'en',
        targetLanguage,
        contentType: 'general',
        preserveFormatting: true,
        educationalContext: 'IEP document for parent — use simple, clear language',
      }),
    });

    if (!res.ok) {
      throw new Error(`Translation API returned ${res.status}`);
    }

    const data = (await res.json()) as { translations?: string[] };
    const translations = data.translations ?? toTranslate; // fallback to originals

    for (let j = 0; j < uncachedIndices.length; j++) {
      const idx = uncachedIndices[j];
      const translated = translations[j] ?? texts[idx];
      results[idx] = translated;
      translationCache.set(cacheKey(targetLanguage, texts[idx]), translated);
    }
  } catch (error) {
    // On failure, return originals for uncached texts
    console.error('[IEP Translation] batch translate failed:', error);
    for (const idx of uncachedIndices) {
      results[idx] = texts[idx];
    }
  }

  return results;
}

// ============================================================================
// Hook
// ============================================================================

export function useIepTranslation<T extends TranslatableIEP>(
  iep: T,
): TranslationResult<T> {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const needsTranslation = useMemo(() => locale !== 'en' && !locale.startsWith('en-'), [locale]);

  const [translated, setTranslated] = useState<T>(iep);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateIep = useCallback(async () => {
    if (!needsTranslation) {
      setTranslated(iep);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      // Collect all translatable strings in a single flat array
      const texts: string[] = [];

      // Eligibility plain text
      texts.push(iep.eligibilityPlain);

      // Present levels
      for (const level of iep.presentLevels) {
        texts.push(level.plainText);
      }

      // Goals: plainText, whatItMeans, howToHelp
      for (const goal of iep.goals) {
        texts.push(goal.plainText);
        texts.push(goal.whatItMeans);
        texts.push(goal.howToHelp);
      }

      // Services
      for (const svc of iep.services) {
        texts.push(svc.plainExplanation);
      }

      // Accommodations
      for (const acc of iep.accommodations) {
        texts.push(acc.plainExplanation);
      }

      const translatedTexts = await translateTexts(texts, locale);

      // Reconstruct the IEP with translated strings
      let idx = 0;

      const translatedEligibilityPlain = translatedTexts[idx++];

      const translatedPresentLevels = iep.presentLevels.map((level) => ({
        ...level,
        plainText: translatedTexts[idx++],
      }));

      const translatedGoals = iep.goals.map((goal) => ({
        ...goal,
        plainText: translatedTexts[idx++],
        whatItMeans: translatedTexts[idx++],
        howToHelp: translatedTexts[idx++],
      }));

      const translatedServices = iep.services.map((svc) => ({
        ...svc,
        plainExplanation: translatedTexts[idx++],
      }));

      const translatedAccommodations = iep.accommodations.map((acc) => ({
        ...acc,
        plainExplanation: translatedTexts[idx++],
      }));

      setTranslated({
        ...iep,
        eligibilityPlain: translatedEligibilityPlain,
        presentLevels: translatedPresentLevels,
        goals: translatedGoals,
        services: translatedServices,
        accommodations: translatedAccommodations,
      } as T);
    } catch (e) {
      console.error('[IEP Translation] failed:', e);
      setError(e instanceof Error ? e.message : 'Translation failed');
      setTranslated(iep); // Fall back to English
    } finally {
      setIsTranslating(false);
    }
  }, [iep, locale, needsTranslation]);

  useEffect(() => {
    void translateIep();
  }, [translateIep]);

  return { data: translated, isTranslating, error };
}
