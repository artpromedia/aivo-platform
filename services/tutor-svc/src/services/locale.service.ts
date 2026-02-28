/**
 * Locale Service
 *
 * Re-exports tutor locale adapter functions for use within tutor-svc.
 * The canonical implementation now lives in @aivo/i18n/tutor-locale-configs.
 */

export {
  type TutorLocaleConfig,
  TUTOR_LOCALE_CONFIGS,
  resolveLocaleConfig,
  isVoiceAvailableForLocale,
  getVoiceEnabledLocales,
  getTextOnlyLocales,
} from '@aivo/i18n/tutor-locale-configs';
