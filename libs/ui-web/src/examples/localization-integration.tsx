/**
 * Localization Integration Guide for Aivo Web Applications
 *
 * This file demonstrates how to integrate the i18n system into web applications.
 * Copy and adapt these patterns for your specific app.
 */

import React from 'react';

// Import from the i18n library
import {
  LocaleProvider,
  useLocale,
  useTranslations,
  LocaleSwitcher,
  FormattedCurrency,
  FormattedDateTime,
  FormattedScore,
  FormattedDuration,
  FormattedXP,
  FormattedPluralText,
} from '@aivo/ui-web';

/* ==========================================================================
   Basic Setup - Root App Component
   ========================================================================== */

/**
 * Example: Wrapping your app with LocaleProvider
 *
 * The LocaleProvider should be placed at the root of your app,
 * typically wrapping your router and other providers.
 */
export function AppWithLocalization({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider
      defaultLocale="en"
      persistLocale={true}
      onLocaleChange={(locale) => {
        console.log(`Locale changed to: ${locale}`);
        // You might want to track this in analytics
      }}
    >
      {children}
    </LocaleProvider>
  );
}

/* ==========================================================================
   Using Translations in Components
   ========================================================================== */

/**
 * Example: Using translations in a component
 */
export function WelcomeMessage({ userName }: { userName: string }) {
  const t = useTranslations();

  return (
    <div className="welcome-message">
      {/* Simple translation */}
      <h1>{t('common.welcomeBack', { name: userName })}</h1>

      {/* Translation with default fallback */}
      <p>{t('dashboard.subtitle', undefined, 'Your learning journey continues!')}</p>
    </div>
  );
}

/**
 * Example: Using the locale hook for conditional logic
 */
export function DirectionalComponent() {
  const { locale, isRTL, direction } = useLocale();

  return (
    <div style={{ direction }} className={isRTL ? 'rtl-layout' : 'ltr-layout'}>
      <p>Current locale: {locale}</p>
      <p>Text direction: {direction}</p>
    </div>
  );
}

/* ==========================================================================
   Locale Switcher Integration
   ========================================================================== */

/**
 * Example: Header with locale switcher
 */
export function HeaderWithLocale() {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="logo">
        <img src="/logo.svg" alt="Aivo" />
      </div>

      <nav className="flex items-center gap-4">
        {/* Compact variant for headers */}
        <LocaleSwitcher variant="compact" />
      </nav>
    </header>
  );
}

/**
 * Example: Settings page with full locale selector
 */
export function SettingsLocaleSection() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();

  return (
    <section className="settings-section">
      <h2>{t('settings.language', undefined, 'Language')}</h2>
      <p className="text-muted">
        {t('settings.languageDescription', undefined, 'Choose your preferred language')}
      </p>

      {/* Inline variant shows all options at once */}
      <LocaleSwitcher variant="inline" showFlags showNativeName />
    </section>
  );
}

/* ==========================================================================
   Formatted Components - Educational Use Cases
   ========================================================================== */

/**
 * Example: Learning progress card with localized numbers
 */
interface ProgressCardProps {
  score: number;
  timeSpent: number; // seconds
  xpEarned: number;
  coinsEarned: number;
  currency: string;
  subscriptionPrice: number;
}

export function ProgressCard({
  score,
  timeSpent,
  xpEarned,
  coinsEarned,
  currency,
  subscriptionPrice,
}: ProgressCardProps) {
  const t = useTranslations();

  return (
    <div className="progress-card rounded-lg border p-6 space-y-4">
      {/* Score with color coding */}
      <div className="flex justify-between items-center">
        <span>{t('progress.score', undefined, 'Score')}</span>
        <FormattedScore value={score} colorCoded />
      </div>

      {/* Time spent with localized duration */}
      <div className="flex justify-between items-center">
        <span>{t('progress.timeSpent', undefined, 'Time Spent')}</span>
        <FormattedDuration seconds={timeSpent} format="long" />
      </div>

      {/* XP with compact notation for large numbers */}
      <div className="flex justify-between items-center">
        <span>{t('progress.xpEarned', undefined, 'XP Earned')}</span>
        <FormattedXP value={xpEarned} compact={xpEarned > 1000} />
      </div>

      {/* Currency display */}
      <div className="flex justify-between items-center">
        <span>{t('billing.price', undefined, 'Price')}</span>
        <FormattedCurrency value={subscriptionPrice} currency={currency} />
      </div>
    </div>
  );
}

/**
 * Example: Activity completion with plural forms
 */
export function ActivityStatus({ remaining, completed }: { remaining: number; completed: number }) {
  const t = useTranslations();

  return (
    <div className="activity-status">
      <FormattedPluralText
        value={remaining}
        zero={<span className="text-green-600">🎉 {t('activities.allDone', undefined, 'All done!')}</span>}
        one={<span>{t('activities.oneRemaining', undefined, '1 activity remaining')}</span>}
        other={<span>{remaining} {t('activities.remaining', undefined, 'activities remaining')}</span>}
      />

      <FormattedPluralText
        value={completed}
        zero={<span className="text-muted">{t('activities.noneCompleted', undefined, 'No activities completed yet')}</span>}
        one={<span>✓ {t('activities.oneCompleted', undefined, '1 activity completed')}</span>}
        other={<span>✓ {completed} {t('activities.completed', undefined, 'activities completed')}</span>}
      />
    </div>
  );
}

/**
 * Example: Date display for assignments
 */
export function AssignmentDueDate({ dueDate }: { dueDate: Date }) {
  const t = useTranslations();

  return (
    <div className="assignment-date">
      <span className="label">{t('assignment.dueDate', undefined, 'Due')}: </span>
      <FormattedDateTime value={dueDate} format="long" />
    </div>
  );
}

/* ==========================================================================
   RTL Support Example
   ========================================================================== */

/**
 * Example: RTL-aware navigation
 */
export function NavigationArrows({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { isRTL } = useLocale();
  const t = useTranslations();

  // Swap arrow directions for RTL
  const prevIcon = isRTL ? '→' : '←';
  const nextIcon = isRTL ? '←' : '→';

  return (
    <div className="flex gap-4">
      <button onClick={onPrevious} className="btn btn-secondary">
        <span className="rtl-flip">{prevIcon}</span>
        <span className="ms-2">{t('common.previous', undefined, 'Previous')}</span>
      </button>

      <button onClick={onNext} className="btn btn-primary">
        <span className="me-2">{t('common.next', undefined, 'Next')}</span>
        <span className="rtl-flip">{nextIcon}</span>
      </button>
    </div>
  );
}

/* ==========================================================================
   SSR / Next.js Integration
   ========================================================================== */

/**
 * Example: Next.js App Router integration
 *
 * In your app/layout.tsx:
 *
 * ```tsx
 * import { LocaleProvider } from '@aivo/ui-web';
 * import { cookies, headers } from 'next/headers';
 *
 * export default function RootLayout({ children }) {
 *   // Get locale from cookie or Accept-Language header
 *   const cookieStore = cookies();
 *   const headersList = headers();
 *
 *   const savedLocale = cookieStore.get('aivo-locale')?.value;
 *   const acceptLanguage = headersList.get('accept-language');
 *   const browserLocale = acceptLanguage?.split(',')[0]?.split('-')[0];
 *
 *   const initialLocale = savedLocale || browserLocale || 'en';
 *
 *   return (
 *     <html lang={initialLocale}>
 *       <body>
 *         <LocaleProvider defaultLocale={initialLocale}>
 *           {children}
 *         </LocaleProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

/* ==========================================================================
   Dynamic Message Loading (Advanced)
   ========================================================================== */

/**
 * Example: Custom message loader for dynamic content
 *
 * If you have large translation files or want to load them on-demand:
 *
 * ```tsx
 * import { LocaleProvider } from '@aivo/ui-web';
 *
 * const loadMessages = async (locale: string) => {
 *   // Dynamic import based on locale
 *   const messages = await import(`../messages/${locale}.json`);
 *   return messages.default;
 * };
 *
 * export function App() {
 *   return (
 *     <LocaleProvider
 *       defaultLocale="en"
 *       loadMessages={loadMessages}
 *     >
 *       <YourApp />
 *     </LocaleProvider>
 *   );
 * }
 * ```
 */

export default {
  AppWithLocalization,
  WelcomeMessage,
  DirectionalComponent,
  HeaderWithLocale,
  SettingsLocaleSection,
  ProgressCard,
  ActivityStatus,
  AssignmentDueDate,
  NavigationArrows,
};
