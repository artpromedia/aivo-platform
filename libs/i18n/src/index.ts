/**
 * @aivo/i18n - Internationalization Infrastructure
 *
 * Provides complete i18n support for AIVO platform:
 * - 27 language translations with ICU MessageFormat
 * - React Intl provider and hooks
 * - Number, date, and currency formatting
 * - Pluralization, gender, and select support
 * - RTL language detection
 * - Translation management utilities
 */

// Provider
export { AivoIntlProvider, type AivoIntlProviderProps } from './provider/index.js';

// Hooks
export {
  useTranslation,
  useLocale,
  useFormatMessage,
  useFormatNumber,
  useFormatDate,
  useFormatCurrency,
  useFormatRelativeTime,
  useFormatList,
  usePluralRules,
  useRTL,
} from './hooks/index.js';

// Utilities
export {
  loadMessages,
  loadMessagesAsync,
  getLocaleDirection,
  isRTLLocale,
  formatMessageWithValues,
  interpolateMessage,
  getBrowserLocale,
  getPreferredLocale,
  normalizeLocale,
  getSupportedLocale,
  getLanguageName,
  getRegionName,
} from './utils/index.js';

// Constants
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_METADATA,
  CURRENCY_BY_LOCALE,
  NUMBER_SYSTEMS,
  type Locale,
  type LocaleMetadata,
  type MessageDescriptor,
  type TranslationMessages,
} from './constants/index.js';

// Message loader
export { createMessageLoader, type MessageLoaderConfig } from './loader/index.js';

// Translation management
export {
  TranslationManager,
  createTranslationManager,
  extractTranslationKeys,
  validateTranslations,
  mergeTranslations,
  type TranslationPlatform,
  type TranslationStatus,
  type TranslationManagerConfig,
  type UploadOptions,
  type DownloadOptions,
} from './management/index.js';

// Messages
export {
  messageCatalog,
  getMessages,
  getAvailableMessageLocales,
  hasMessages,
  type SupportedMessageLocale,
} from './messages/index.js';
