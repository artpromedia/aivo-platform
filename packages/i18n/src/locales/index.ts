/**
 * Locale barrel export
 *
 * Provides static imports for all locale JSON files so they can be
 * loaded synchronously without dynamic `import()` or `fetch`.
 */

import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import pt from './pt.json';
import ar from './ar.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import hi from './hi.json';

export const locales = { en, es, fr, de, pt, ar, zh, ja, ko, hi } as const;

export type LocaleCode = keyof typeof locales;

export { en, es, fr, de, pt, ar, zh, ja, ko, hi };

export default locales;
