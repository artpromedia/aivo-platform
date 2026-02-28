/**
 * Tutor Locale Adapter
 *
 * Builds locale-specific system prompt instructions for the AI tutor.
 *
 * The locale config map and resolution logic now live in
 * @aivo/i18n/tutor-locale-configs (shared with tutor-svc).
 * This module re-exports them and adds prompt-building functions.
 */

// Re-export shared config so existing consumers don't break
export {
  type TutorLocaleConfig,
  TUTOR_LOCALE_CONFIGS,
  resolveLocaleConfig,
  isVoiceAvailableForLocale,
  getVoiceEnabledLocales,
  getTextOnlyLocales,
} from '@aivo/i18n/tutor-locale-configs';

import { resolveLocaleConfig } from '@aivo/i18n/tutor-locale-configs';

// ──────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ──────────────────────────────────────────────────────────────────

/**
 * Build locale-specific system prompt instructions for the tutor AI.
 *
 * Injected into the subject tutor agent's system prompt.
 * Covers language, cultural context, curriculum alignment, and
 * text-optimization instructions for voice-unavailable locales.
 */
export function buildLocalePromptSection(locale: string): string {
  const config = resolveLocaleConfig(locale);

  let prompt = `
LOCALE INSTRUCTIONS (${config.locale}):
- You MUST respond entirely in ${config.nativeLanguageName} (${config.languageName}).
- Use ${config.measurementSystem} measurement system.
- Use locale-appropriate number formatting: ${config.numberFormat}
- ${config.exampleContext}
`;

  // Curriculum alignment
  prompt += `- Align explanations with ${config.curriculumStandard} curriculum standards where applicable.\n`;

  // Bilingual vocabulary support
  if (config.bilingualVocabulary) {
    prompt += `- When introducing subject-specific vocabulary, provide terms in both ${config.nativeLanguageName} and English.\n`;
    prompt += `  For example: "fracción (fraction)", "ecuación (equation)", "hipótesis (hypothesis)"\n`;
  }

  // RTL formatting instructions
  if (config.isRTL) {
    prompt += `
RTL LANGUAGE INSTRUCTIONS:
- Format all structured content for right-to-left reading.
- When showing mathematical expressions, maintain standard LTR mathematical notation but explain in RTL text.
- Use ${config.locale === 'ar' ? 'Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)' : 'standard numerals'} where culturally appropriate.
- Place mathematical operators correctly for RTL display context.
`;
  }

  // Voice availability — affects content strategy
  if (!config.piperVoiceAvailable) {
    prompt += `
TEXT-ONLY MODE (voice not available for ${config.nativeLanguageName}):
- Your responses will be displayed as text only — the student cannot hear them spoken.
- Use extra formatting to compensate for lack of audio:
  • Bullet points and numbered lists for step-by-step explanations
  • Bold text (**like this**) for key terms and important concepts
  • Emoji sparingly for engagement (🎯 ✅ 💡 🤔)
  • Shorter paragraphs (2-3 sentences max) for readability
- Keep responses slightly more concise since the student is reading, not listening.
- Ask only one question at a time to avoid overwhelming the reader.
`;
  }

  return prompt;
}

/**
 * Build curriculum-aware system prompt section.
 *
 * Uses the learner's curriculum standards from their profile
 * (set during onboarding via parent-svc → brain-engine).
 */
export function buildCurriculumPromptSection(
  curriculumStandards: string[],
  gradeLevel: number,
  stateCode?: string,
): string {
  if (!curriculumStandards || curriculumStandards.length === 0) {
    return '';
  }

  const standardsList = curriculumStandards.join(', ');
  let prompt = `
CURRICULUM ALIGNMENT:
- This student follows: ${standardsList}
- Grade level: ${gradeLevel}
`;

  if (stateCode) {
    prompt += `- State/region: ${stateCode}\n`;
  }

  prompt += `- Reference specific standard codes when explaining concepts (e.g., "This is related to CCSS.MATH.4.NF.1")
- Ensure examples and problem difficulty match the grade-level expectations of these standards.
- When the student shows mastery, preview the next standard in the progression.
`;

  return prompt;
}
