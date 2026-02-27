/**
 * Web-marketing locale barrel export
 *
 * Provides static imports for all marketing locale JSON files so they can be
 * loaded synchronously without dynamic `import()` or `fetch`.
 */

import en from './en/marketing.json';
import es from './es/marketing.json';
import fr from './fr/marketing.json';
import de from './de/marketing.json';
import pt from './pt/marketing.json';
import ar from './ar/marketing.json';
import zh from './zh/marketing.json';
import ja from './ja/marketing.json';
import ko from './ko/marketing.json';
import hi from './hi/marketing.json';

export const marketingTranslations = { en, es, fr, de, pt, ar, zh, ja, ko, hi } as const;

export type MarketingLocaleCode = keyof typeof marketingTranslations;

export { en, es, fr, de, pt, ar, zh, ja, ko, hi };

export default marketingTranslations;
