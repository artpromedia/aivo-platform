import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import translations
import enTutor from '../locales/en/tutor.json';
import enLearner from '../locales/en/learner.json';

const resources = {
  en: { tutor: enTutor, learner: enLearner },
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- i18next chaining API types unresolvable */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'tutor',
    ns: ['tutor', 'learner'],
    supportedLngs: ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi', 'sw'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['cookie', 'navigator'],
      lookupCookie: 'NEXT_LOCALE',
      caches: ['cookie'],
    },
  });
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

export default i18n;
