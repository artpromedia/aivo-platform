import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enParent from '@/locales/en/parent.json';
import esParent from '@/locales/es/parent.json';
import frParent from '@/locales/fr/parent.json';
import deParent from '@/locales/de/parent.json';
import ptParent from '@/locales/pt/parent.json';
import zhParent from '@/locales/zh/parent.json';
import jaParent from '@/locales/ja/parent.json';
import koParent from '@/locales/ko/parent.json';
import arParent from '@/locales/ar/parent.json';
import hiParent from '@/locales/hi/parent.json';

const resources = {
  en: { parent: enParent },
  es: { parent: esParent },
  fr: { parent: frParent },
  de: { parent: deParent },
  pt: { parent: ptParent },
  zh: { parent: zhParent },
  ja: { parent: jaParent },
  ko: { parent: koParent },
  ar: { parent: arParent },
  hi: { parent: hiParent },
};

// Only use LanguageDetector in the browser — during SSR the APIs it
// relies on (localStorage, navigator) don't exist, which causes the
// detected language to differ between server and client and triggers
// React hydration error #418.
if (typeof globalThis.window !== 'undefined') {
  i18n.use(LanguageDetector);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'parent',
    ns: ['parent'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;

export const supportedLanguages = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Português', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
];
