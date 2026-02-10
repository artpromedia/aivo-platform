/**
 * Consent Banner & Privacy Preference Center
 *
 * GDPR/CCPA/LGPD compliant consent management UI components.
 * Features:
 * - Cookie consent banner with granular controls
 * - Privacy preference center modal
 * - Consent persistence and synchronization
 * - RTL and localization support
 * - Accessibility compliant (WCAG 2.1 AA)
 */

'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export type ConsentCategory =
  | 'essential'
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'thirdParty'
  | 'aiFeatures';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected' | 'partial';

/** @deprecated Use ConsentStatus instead */
export type ConsentState = ConsentStatus;

export interface ConsentPreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  thirdParty: boolean;
  aiFeatures: boolean;
}

export interface ConsentRecord {
  preferences: ConsentPreferences;
  consentedAt: string;
  version: string;
  source: 'banner' | 'preferences' | 'api';
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentContextValue {
  preferences: ConsentPreferences;
  status: ConsentStatus;
  hasConsented: boolean;
  showBanner: boolean;
  showPreferences: boolean;
  updatePreferences: (prefs: Partial<ConsentPreferences>) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  closeBanner: () => void;
  resetConsent: () => void;
}

/** Action methods available on the consent context */
export type ConsentActions = Pick<
  ConsentContextValue,
  | 'updatePreferences'
  | 'acceptAll'
  | 'rejectAll'
  | 'openPreferences'
  | 'closePreferences'
  | 'closeBanner'
  | 'resetConsent'
>;

export interface ConsentProviderProps {
  children: React.ReactNode;
  /** API endpoint to save consent */
  apiEndpoint?: string;
  /** Tenant ID for multi-tenant support */
  tenantId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Privacy policy version */
  policyVersion?: string;
  /** Whether to show banner automatically */
  autoShowBanner?: boolean;
  /** Callback when consent changes */
  onConsentChange?: (preferences: ConsentPreferences) => void;
  /** Custom storage key */
  storageKey?: string;
  /** Expiration days for consent cookie */
  expirationDays?: number;
}

export interface ConsentBannerProps {
  /** Banner position */
  position?: 'bottom' | 'top' | 'bottom-left' | 'bottom-right';
  /** Whether to show "manage preferences" link */
  showManageLink?: boolean;
  /** Custom class name */
  className?: string;
  /** Translations */
  translations?: ConsentTranslations;
}

export interface ConsentPreferenceCenterProps {
  /** Custom class name */
  className?: string;
  /** Translations */
  translations?: ConsentTranslations;
}

export interface ConsentTranslations {
  bannerTitle?: string;
  bannerDescription?: string;
  acceptAll?: string;
  rejectAll?: string;
  managePreferences?: string;
  savePreferences?: string;
  preferencesTitle?: string;
  preferencesDescription?: string;
  essential?: string;
  essentialDescription?: string;
  analytics?: string;
  analyticsDescription?: string;
  marketing?: string;
  marketingDescription?: string;
  personalization?: string;
  personalizationDescription?: string;
  thirdParty?: string;
  thirdPartyDescription?: string;
  aiFeatures?: string;
  aiFeaturesDescription?: string;
  privacyPolicy?: string;
  cookiePolicy?: string;
  required?: string;
}

/* ==========================================================================
   Default Values
   ========================================================================== */

const DEFAULT_PREFERENCES: ConsentPreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  personalization: false,
  thirdParty: false,
  aiFeatures: false,
};

const DEFAULT_TRANSLATIONS: ConsentTranslations = {
  bannerTitle: 'We value your privacy',
  bannerDescription:
    'We use cookies and similar technologies to improve your experience, analyze site usage, and assist with personalization. You can manage your preferences or accept all cookies.',
  acceptAll: 'Accept All',
  rejectAll: 'Reject All',
  managePreferences: 'Manage Preferences',
  savePreferences: 'Save Preferences',
  preferencesTitle: 'Privacy Preferences',
  preferencesDescription:
    'Choose which cookies and data collection you allow. Essential cookies are required for the site to function.',
  essential: 'Essential Cookies',
  essentialDescription:
    'Required for core functionality like security, account access, and saving your preferences.',
  analytics: 'Analytics Cookies',
  analyticsDescription:
    'Help us understand how you use our platform so we can improve the learning experience.',
  marketing: 'Marketing Cookies',
  marketingDescription:
    'Used to deliver relevant educational content and measure the effectiveness of campaigns.',
  personalization: 'Personalization',
  personalizationDescription:
    'Enable personalized learning paths and content recommendations based on your progress.',
  thirdParty: 'Third-Party Services',
  thirdPartyDescription:
    'Allow integrations with external services like Google Classroom and LMS platforms.',
  aiFeatures: 'AI Features',
  aiFeaturesDescription:
    'Enable AI-powered tutoring, homework help, and adaptive learning features.',
  privacyPolicy: 'Privacy Policy',
  cookiePolicy: 'Cookie Policy',
  required: '(Required)',
};

const STORAGE_KEY = 'aivo-consent-preferences';
const POLICY_VERSION = '2.0';

/* ==========================================================================
   Consent Context
   ========================================================================== */

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}

/* ==========================================================================
   Consent Provider
   ========================================================================== */

export function ConsentProvider({
  children,
  apiEndpoint,
  tenantId,
  userId,
  policyVersion = POLICY_VERSION,
  autoShowBanner = true,
  onConsentChange,
  storageKey = STORAGE_KEY,
  expirationDays = 365,
}: ConsentProviderProps): React.ReactElement {
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
  const [hasConsented, setHasConsented] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const saved = loadConsentFromStorage(storageKey);
    if (saved?.version === policyVersion) {
      setPreferences(saved.preferences);
      setHasConsented(true);
      setShowBanner(false);
    } else if (autoShowBanner) {
      setShowBanner(true);
    }
  }, [storageKey, policyVersion, autoShowBanner]);

  // Derive consent status
  const status: ConsentStatus = React.useMemo(() => {
    if (!hasConsented) return 'pending';
    const nonEssential = [
      'analytics',
      'marketing',
      'personalization',
      'thirdParty',
      'aiFeatures',
    ] as const;
    const allAccepted = nonEssential.every((key) => preferences[key]);
    const allRejected = nonEssential.every((key) => !preferences[key]);
    if (allAccepted) return 'accepted';
    if (allRejected) return 'rejected';
    return 'partial';
  }, [hasConsented, preferences]);

  // Save preferences
  const savePreferences = useCallback(
    async (newPrefs: ConsentPreferences, source: 'banner' | 'preferences') => {
      const record: ConsentRecord = {
        preferences: newPrefs,
        consentedAt: new Date().toISOString(),
        version: policyVersion,
        source,
      };

      // Save to localStorage
      saveConsentToStorage(storageKey, record, expirationDays);

      // Save to API if available
      if (apiEndpoint) {
        try {
          await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId,
              userId,
              ...record,
            }),
          });
        } catch (error) {
          console.error('Failed to save consent to API:', error);
        }
      }

      setPreferences(newPrefs);
      setHasConsented(true);
      setShowBanner(false);
      setShowPreferences(false);
      onConsentChange?.(newPrefs);
    },
    [apiEndpoint, tenantId, userId, policyVersion, storageKey, expirationDays, onConsentChange]
  );

  const updatePreferences = useCallback(
    (partial: Partial<ConsentPreferences>) => {
      const newPrefs = { ...preferences, ...partial, essential: true };
      void savePreferences(newPrefs, 'preferences');
    },
    [preferences, savePreferences]
  );

  const acceptAll = useCallback(() => {
    void savePreferences(
      {
        essential: true,
        analytics: true,
        marketing: true,
        personalization: true,
        thirdParty: true,
        aiFeatures: true,
      },
      'banner'
    );
  }, [savePreferences]);

  const rejectAll = useCallback(() => {
    void savePreferences(
      {
        essential: true,
        analytics: false,
        marketing: false,
        personalization: false,
        thirdParty: false,
        aiFeatures: false,
      },
      'banner'
    );
  }, [savePreferences]);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(storageKey);
    setPreferences(DEFAULT_PREFERENCES);
    setHasConsented(false);
    setShowBanner(true);
  }, [storageKey]);

  const value: ConsentContextValue = {
    preferences,
    status,
    hasConsented,
    showBanner,
    showPreferences,
    updatePreferences,
    acceptAll,
    rejectAll,
    openPreferences: () => setShowPreferences(true),
    closePreferences: () => setShowPreferences(false),
    closeBanner: () => setShowBanner(false),
    resetConsent,
  };

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

/* ==========================================================================
   Consent Banner Component
   ========================================================================== */

export function ConsentBanner({
  position = 'bottom',
  showManageLink = true,
  className = '',
  translations: customTranslations,
}: ConsentBannerProps): React.ReactElement | null {
  const { showBanner, acceptAll, rejectAll, openPreferences } = useConsent();
  const t = { ...DEFAULT_TRANSLATIONS, ...customTranslations };

  if (!showBanner) return null;

  const positionClasses: Record<string, string> = {
    bottom: 'fixed inset-x-0 bottom-0',
    top: 'fixed inset-x-0 top-0',
    'bottom-left': 'fixed bottom-4 left-4 max-w-md',
    'bottom-right': 'fixed bottom-4 right-4 max-w-md',
  };

  return (
    <div
      className={`${positionClasses[position]} z-[9999] ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-banner-title"
    >
      <div className="bg-white dark:bg-gray-900 shadow-2xl border-t border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2
                id="consent-banner-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t.bannerTitle}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t.bannerDescription}</p>
              <div className="mt-2 flex gap-4 text-sm">
                <a
                  href="/privacy"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.privacyPolicy}
                </a>
                <a
                  href="/cookies"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.cookiePolicy}
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {showManageLink && (
                <button
                  type="button"
                  onClick={openPreferences}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t.managePreferences}
                </button>
              )}
              <button
                type="button"
                onClick={rejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {t.rejectAll}
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                {t.acceptAll}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Privacy Preference Center Modal
   ========================================================================== */

export function ConsentPreferenceCenter({
  className = '',
  translations: customTranslations,
}: ConsentPreferenceCenterProps): React.ReactElement | null {
  const {
    showPreferences,
    closePreferences,
    preferences,
    updatePreferences,
    acceptAll,
    rejectAll,
  } = useConsent();
  const [localPrefs, setLocalPrefs] = useState<ConsentPreferences>(preferences);
  const t = { ...DEFAULT_TRANSLATIONS, ...customTranslations };

  // Sync local state when preferences change
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  if (!showPreferences) return null;

  const categories: {
    key: keyof ConsentPreferences;
    label: string;
    description: string;
    required: boolean;
  }[] = [
    { key: 'essential', label: t.essential!, description: t.essentialDescription!, required: true },
    {
      key: 'analytics',
      label: t.analytics!,
      description: t.analyticsDescription!,
      required: false,
    },
    {
      key: 'marketing',
      label: t.marketing!,
      description: t.marketingDescription!,
      required: false,
    },
    {
      key: 'personalization',
      label: t.personalization!,
      description: t.personalizationDescription!,
      required: false,
    },
    {
      key: 'thirdParty',
      label: t.thirdParty!,
      description: t.thirdPartyDescription!,
      required: false,
    },
    {
      key: 'aiFeatures',
      label: t.aiFeatures!,
      description: t.aiFeaturesDescription!,
      required: false,
    },
  ];

  const handleToggle = (key: keyof ConsentPreferences) => {
    if (key === 'essential') return; // Cannot toggle essential
    setLocalPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    updatePreferences(localPrefs);
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={closePreferences} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t.preferencesTitle}
              </h2>
              <button
                type="button"
                onClick={closePreferences}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {t.preferencesDescription}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
            <div className="space-y-4">
              {categories.map(({ key, label, description, required }) => (
                <div
                  key={key}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1 me-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                      {required && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t.required}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localPrefs[key]}
                    disabled={required}
                    onClick={() => handleToggle(key)}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                      ${localPrefs[key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}
                      ${required ? 'cursor-not-allowed opacity-75' : ''}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                        transition duration-200 ease-in-out
                        ${localPrefs[key] ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={rejectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t.rejectAll}
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t.acceptAll}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                {t.savePreferences}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Cookie Consent Manager (Floating Button)
   ========================================================================== */

export interface ConsentManagerButtonProps {
  /** Button position */
  position?: 'bottom-left' | 'bottom-right';
  /** Custom class name */
  className?: string;
  /** Aria label */
  ariaLabel?: string;
}

export function ConsentManagerButton({
  position = 'bottom-left',
  className = '',
  ariaLabel = 'Manage cookie preferences',
}: ConsentManagerButtonProps): React.ReactElement {
  const { openPreferences, hasConsented } = useConsent();

  if (!hasConsented) return <></>;

  const positionClass = position === 'bottom-left' ? 'left-4' : 'right-4';

  return (
    <button
      type="button"
      onClick={openPreferences}
      className={`fixed bottom-4 ${positionClass} z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow ${className}`}
      aria-label={ariaLabel}
    >
      <svg
        className="w-5 h-5 text-gray-600 dark:text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
}

/* ==========================================================================
   Storage Utilities
   ========================================================================== */

function loadConsentFromStorage(key: string): ConsentRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as ConsentRecord;
  } catch {
    return null;
  }
}

function saveConsentToStorage(key: string, record: ConsentRecord, expirationDays: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(record));

    // Also set a cookie for server-side access
    const expires = new Date();
    expires.setDate(expires.getDate() + expirationDays);
    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(record.preferences))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (error) {
    console.error('Failed to save consent to storage:', error);
  }
}

/* ==========================================================================
   Exports
   ========================================================================== */

export default {
  ConsentProvider,
  ConsentBanner,
  ConsentPreferenceCenter,
  ConsentManagerButton,
  useConsent,
};
