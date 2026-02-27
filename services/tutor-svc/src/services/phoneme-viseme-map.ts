/**
 * IPA Phoneme → Rive Viseme Mapping
 *
 * Maps International Phonetic Alphabet symbols from Piper/espeak-ng
 * to mouth open amounts for the animated tutor avatar.
 *
 * Mouth shapes are simplified to a single axis (0=closed, 1=wide open)
 * which works well for 2D cartoon-style avatars.
 */

export interface VisemeMapping {
  mouthOpen: number;  // 0.0 (closed) to 1.0 (wide open)
  visemeId: number;   // Standard viseme ID for reference
  category: string;   // Phoneme category for debugging
}

const PHONEME_TO_VISEME: Record<string, VisemeMapping> = {
  // ── Silence ──
  ' ':  { mouthOpen: 0.00, visemeId: 0, category: 'silence' },
  '':   { mouthOpen: 0.00, visemeId: 0, category: 'silence' },

  // ── Bilabial stops/nasals (lips closed) ──
  'p':  { mouthOpen: 0.00, visemeId: 21, category: 'bilabial' },
  'b':  { mouthOpen: 0.00, visemeId: 21, category: 'bilabial' },
  'm':  { mouthOpen: 0.00, visemeId: 21, category: 'bilabial' },

  // ── Labiodental (bottom lip near teeth) ──
  'f':  { mouthOpen: 0.10, visemeId: 18, category: 'labiodental' },
  'v':  { mouthOpen: 0.10, visemeId: 18, category: 'labiodental' },

  // ── Dental (tongue between teeth) ──
  '\u03b8': { mouthOpen: 0.12, visemeId: 17, category: 'dental' },  // θ
  '\u00f0': { mouthOpen: 0.12, visemeId: 17, category: 'dental' },  // ð

  // ── Alveolar (tongue tap behind teeth) ──
  't':  { mouthOpen: 0.15, visemeId: 19, category: 'alveolar' },
  'd':  { mouthOpen: 0.15, visemeId: 19, category: 'alveolar' },
  'n':  { mouthOpen: 0.15, visemeId: 19, category: 'alveolar' },
  'l':  { mouthOpen: 0.20, visemeId: 14, category: 'alveolar' },
  's':  { mouthOpen: 0.12, visemeId: 15, category: 'alveolar' },
  'z':  { mouthOpen: 0.12, visemeId: 15, category: 'alveolar' },

  // ── Post-alveolar (lips slightly forward) ──
  '\u0283':     { mouthOpen: 0.18, visemeId: 16, category: 'postalveolar' }, // ʃ
  '\u0292':     { mouthOpen: 0.18, visemeId: 16, category: 'postalveolar' }, // ʒ
  't\u0283':    { mouthOpen: 0.18, visemeId: 16, category: 'postalveolar' }, // tʃ
  'd\u0292':    { mouthOpen: 0.18, visemeId: 16, category: 'postalveolar' }, // dʒ

  // ── Retroflex ──
  '\u0279': { mouthOpen: 0.22, visemeId: 13, category: 'retroflex' }, // ɹ

  // ── Velar (back of mouth) ──
  'k':      { mouthOpen: 0.15, visemeId: 20, category: 'velar' },
  'g':      { mouthOpen: 0.15, visemeId: 20, category: 'velar' },
  '\u014b': { mouthOpen: 0.15, visemeId: 20, category: 'velar' }, // ŋ

  // ── Glottal ──
  'h':  { mouthOpen: 0.20, visemeId: 12, category: 'glottal' },

  // ── Glides ──
  'w':  { mouthOpen: 0.25, visemeId: 7, category: 'glide' },
  'j':  { mouthOpen: 0.30, visemeId: 6, category: 'glide' },

  // ── Close vowels (small opening) ──
  'i':      { mouthOpen: 0.30, visemeId: 6, category: 'close_vowel' },
  '\u026a': { mouthOpen: 0.30, visemeId: 6, category: 'close_vowel' }, // ɪ
  'u':      { mouthOpen: 0.25, visemeId: 7, category: 'close_vowel' },
  '\u028a': { mouthOpen: 0.28, visemeId: 4, category: 'close_vowel' }, // ʊ

  // ── Mid vowels (medium opening) ──
  'e':      { mouthOpen: 0.45, visemeId: 4, category: 'mid_vowel' },
  '\u025b': { mouthOpen: 0.50, visemeId: 4, category: 'mid_vowel' }, // ɛ
  '\u0259': { mouthOpen: 0.35, visemeId: 1, category: 'mid_vowel' }, // ə
  '\u025d': { mouthOpen: 0.38, visemeId: 5, category: 'mid_vowel' }, // ɝ
  '\u025a': { mouthOpen: 0.35, visemeId: 5, category: 'mid_vowel' }, // ɚ
  'o':      { mouthOpen: 0.45, visemeId: 8, category: 'mid_vowel' },
  '\u0254': { mouthOpen: 0.55, visemeId: 3, category: 'mid_vowel' }, // ɔ

  // ── Open vowels (wide opening) ──
  'a':      { mouthOpen: 0.80, visemeId: 2, category: 'open_vowel' },
  '\u0251': { mouthOpen: 0.85, visemeId: 2, category: 'open_vowel' }, // ɑ
  '\u00e6': { mouthOpen: 0.75, visemeId: 1, category: 'open_vowel' }, // æ
  '\u028c': { mouthOpen: 0.65, visemeId: 1, category: 'open_vowel' }, // ʌ

  // ── Diphthongs (transition — use peak opening) ──
  'a\u026a':     { mouthOpen: 0.75, visemeId: 11, category: 'diphthong' }, // aɪ
  'a\u028a':     { mouthOpen: 0.80, visemeId: 9, category: 'diphthong' },  // aʊ
  '\u0254\u026a': { mouthOpen: 0.60, visemeId: 10, category: 'diphthong' }, // ɔɪ
  'e\u026a':     { mouthOpen: 0.50, visemeId: 4, category: 'diphthong' },  // eɪ
  'o\u028a':     { mouthOpen: 0.50, visemeId: 8, category: 'diphthong' },  // oʊ
};

/**
 * Map an IPA phoneme to a viseme (mouth open amount).
 * Falls back to a sensible default for unknown phonemes.
 */
export function mapPhonemeToViseme(phoneme: string): VisemeMapping {
  // Try exact match first
  if (PHONEME_TO_VISEME[phoneme]) {
    return PHONEME_TO_VISEME[phoneme]!;
  }

  // Try first character (for multi-char phonemes like affricates)
  if (phoneme.length > 1 && PHONEME_TO_VISEME[phoneme[0]!]) {
    return PHONEME_TO_VISEME[phoneme[0]!]!;
  }

  // Default: slightly open mouth
  return { mouthOpen: 0.20, visemeId: 1, category: 'unknown' };
}

/**
 * Convert an array of phoneme events from the Piper TTS engine
 * into viseme events for the Rive avatar.
 */
export function mapPhonemeEventsToVisemes(
  phonemeEvents: Array<{
    offset_ms: number;
    phoneme: string;
    duration_ms: number;
  }>,
): Array<{
  offsetMs: number;
  visemeId: number;
  mouthOpen: number;
  durationMs: number;
}> {
  return phonemeEvents.map((event) => {
    const viseme = mapPhonemeToViseme(event.phoneme);
    return {
      offsetMs: event.offset_ms,
      visemeId: viseme.visemeId,
      mouthOpen: viseme.mouthOpen,
      durationMs: event.duration_ms,
    };
  });
}
