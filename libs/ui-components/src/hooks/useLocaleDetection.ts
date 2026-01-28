import { useState, useEffect, useCallback } from 'react';
import type { LocalePreferences, DetectedLocale } from '../components/locale-picker/LocalePicker';

const GEOLOCATION_SERVICE_URL = process.env.NEXT_PUBLIC_GEOLOCATION_URL || 'http://localhost:4090';

interface UseLocaleDetectionOptions {
  /** Auto-detect on mount */
  autoDetect?: boolean;
  /** Timeout for detection in ms */
  timeout?: number;
  /** Callback when detection completes */
  onDetected?: (locale: DetectedLocale) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseLocaleDetectionResult {
  /** Detected locale from IP/browser */
  detectedLocale: DetectedLocale | null;
  /** Current user preferences (may be modified from detected) */
  preferences: LocalePreferences;
  /** Update preferences */
  setPreferences: React.Dispatch<React.SetStateAction<LocalePreferences>>;
  /** Loading state */
  isLoading: boolean;
  /** Error if detection failed */
  error: Error | null;
  /** Manually trigger detection */
  detectLocale: () => Promise<void>;
  /** Reset to detected defaults */
  resetToDetected: () => void;
  /** Check if user has overridden any setting */
  hasOverrides: boolean;
}

// Default preferences fallback
const DEFAULT_PREFERENCES: LocalePreferences = {
  language: 'en',
  country: 'US',
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
};

// Country to default currency mapping
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'NZD',
  IN: 'INR',
  ZA: 'ZAR',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  AE: 'AED',
  SA: 'SAR',
  IL: 'ILS',
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  SG: 'SGD',
  BR: 'BRL',
  MX: 'MXN',
  ID: 'IDR',
  TH: 'THB',
  MY: 'MYR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
};

// Country to default date format mapping
const COUNTRY_DATE_FORMAT_MAP: Record<string, string> = {
  US: 'MM/DD/YYYY',
  CA: 'YYYY-MM-DD',
  GB: 'DD/MM/YYYY',
  AU: 'DD/MM/YYYY',
  NZ: 'DD/MM/YYYY',
  IN: 'DD/MM/YYYY',
  ZA: 'YYYY/MM/DD',
  DE: 'DD.MM.YYYY',
  FR: 'DD/MM/YYYY',
  JP: 'YYYY/MM/DD',
  CN: 'YYYY-MM-DD',
  KR: 'YYYY-MM-DD',
};

// Country to default time format mapping
const COUNTRY_TIME_FORMAT_MAP: Record<string, '12h' | '24h'> = {
  US: '12h',
  CA: '12h',
  AU: '12h',
  PH: '12h',
  IN: '12h',
  GB: '24h',
  DE: '24h',
  FR: '24h',
  JP: '24h',
  CN: '24h',
  KR: '24h',
};

/**
 * useLocaleDetection - Hook for automatic locale detection and preference management
 * 
 * Features:
 * - IP-based location detection via geolocation service
 * - Browser language detection fallback
 * - Timezone detection from browser
 * - Persistent preference storage
 * - Override tracking
 * 
 * @example
 * ```tsx
 * const { 
 *   detectedLocale, 
 *   preferences, 
 *   setPreferences, 
 *   isLoading 
 * } = useLocaleDetection({ autoDetect: true });
 * 
 * return (
 *   <LocalePicker
 *     value={preferences}
 *     onChange={setPreferences}
 *     detectedLocale={detectedLocale}
 *     isLoading={isLoading}
 *   />
 * );
 * ```
 */
export function useLocaleDetection(
  options: UseLocaleDetectionOptions = {}
): UseLocaleDetectionResult {
  const { autoDetect = true, timeout = 5000, onDetected, onError } = options;

  const [detectedLocale, setDetectedLocale] = useState<DetectedLocale | null>(null);
  const [preferences, setPreferences] = useState<LocalePreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Detect locale from browser as fallback
  const detectFromBrowser = useCallback((): DetectedLocale => {
    const browserLanguage = navigator.language || 'en';
    const languageParts = browserLanguage.split('-');
    const language = browserLanguage;
    const countryFromLang = languageParts[1]?.toUpperCase() || 'US';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

    // Try to infer country from timezone
    let country = countryFromLang;
    if (timezone.startsWith('America/')) {
      if (timezone.includes('Toronto') || timezone.includes('Vancouver')) {
        country = 'CA';
      } else if (timezone.includes('Mexico')) {
        country = 'MX';
      } else if (timezone.includes('Sao_Paulo')) {
        country = 'BR';
      } else {
        country = 'US';
      }
    } else if (timezone.startsWith('Europe/')) {
      if (timezone.includes('London')) country = 'GB';
      else if (timezone.includes('Berlin')) country = 'DE';
      else if (timezone.includes('Paris')) country = 'FR';
      else if (timezone.includes('Madrid')) country = 'ES';
      else if (timezone.includes('Amsterdam')) country = 'NL';
    } else if (timezone.startsWith('Asia/')) {
      if (timezone.includes('Tokyo')) country = 'JP';
      else if (timezone.includes('Shanghai') || timezone.includes('Hong_Kong')) country = 'CN';
      else if (timezone.includes('Seoul')) country = 'KR';
      else if (timezone.includes('Singapore')) country = 'SG';
      else if (timezone.includes('Kolkata') || timezone.includes('Mumbai')) country = 'IN';
      else if (timezone.includes('Dubai')) country = 'AE';
      else if (timezone.includes('Riyadh')) country = 'SA';
      else if (timezone.includes('Jakarta')) country = 'ID';
      else if (timezone.includes('Bangkok')) country = 'TH';
    } else if (timezone.startsWith('Africa/')) {
      if (timezone.includes('Johannesburg')) country = 'ZA';
      else if (timezone.includes('Lagos')) country = 'NG';
      else if (timezone.includes('Nairobi')) country = 'KE';
      else if (timezone.includes('Cairo')) country = 'EG';
    } else if (timezone.startsWith('Australia/') || timezone.startsWith('Pacific/Auckland')) {
      country = timezone.includes('Auckland') ? 'NZ' : 'AU';
    }

    const currency = COUNTRY_CURRENCY_MAP[country] || 'USD';

    return {
      countryCode: country,
      countryName: getCountryName(country),
      language,
      currency,
      timezone,
      hasLocalPayment: false,
      confidence: 0.6, // Lower confidence for browser detection
      detectionMethod: 'browser',
    };
  }, []);

  // Detect locale from geolocation service
  const detectLocale = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Try IP-based detection first
      const response = await fetch(`${GEOLOCATION_SERVICE_URL}/api/v1/locate`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geolocation service error: ${response.status}`);
      }

      const data = await response.json();

      const detected: DetectedLocale = {
        countryCode: data.countryCode,
        countryName: data.countryName || getCountryName(data.countryCode),
        language: data.language || navigator.language || 'en',
        currency: data.currency || COUNTRY_CURRENCY_MAP[data.countryCode] || 'USD',
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        curriculumFramework: data.curriculumFramework,
        hasLocalPayment: data.hasLocalPayment || false,
        confidence: data.confidence || 0.9,
        detectionMethod: 'ip',
      };

      setDetectedLocale(detected);

      // Set initial preferences based on detection
      const newPreferences: LocalePreferences = {
        language: detected.language,
        country: detected.countryCode,
        currency: detected.currency,
        timezone: detected.timezone,
        curriculumFramework: detected.curriculumFramework,
        dateFormat: COUNTRY_DATE_FORMAT_MAP[detected.countryCode] || 'MM/DD/YYYY',
        timeFormat: COUNTRY_TIME_FORMAT_MAP[detected.countryCode] || '12h',
      };
      setPreferences(newPreferences);

      onDetected?.(detected);
    } catch (err) {
      clearTimeout(timeoutId);

      // Fall back to browser detection
      const browserDetected = detectFromBrowser();
      setDetectedLocale(browserDetected);

      const newPreferences: LocalePreferences = {
        language: browserDetected.language,
        country: browserDetected.countryCode,
        currency: browserDetected.currency,
        timezone: browserDetected.timezone,
        dateFormat: COUNTRY_DATE_FORMAT_MAP[browserDetected.countryCode] || 'MM/DD/YYYY',
        timeFormat: COUNTRY_TIME_FORMAT_MAP[browserDetected.countryCode] || '12h',
      };
      setPreferences(newPreferences);

      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        onError?.(err);
      }

      onDetected?.(browserDetected);
    } finally {
      setIsLoading(false);
    }
  }, [timeout, detectFromBrowser, onDetected, onError]);

  // Reset to detected defaults
  const resetToDetected = useCallback(() => {
    if (detectedLocale) {
      setPreferences({
        language: detectedLocale.language,
        country: detectedLocale.countryCode,
        currency: detectedLocale.currency,
        timezone: detectedLocale.timezone,
        curriculumFramework: detectedLocale.curriculumFramework,
        dateFormat: COUNTRY_DATE_FORMAT_MAP[detectedLocale.countryCode] || 'MM/DD/YYYY',
        timeFormat: COUNTRY_TIME_FORMAT_MAP[detectedLocale.countryCode] || '12h',
      });
    }
  }, [detectedLocale]);

  // Check if user has overridden any detected setting
  const hasOverrides = detectedLocale
    ? preferences.language !== detectedLocale.language ||
      preferences.country !== detectedLocale.countryCode ||
      preferences.currency !== detectedLocale.currency
    : false;

  // Auto-detect on mount
  useEffect(() => {
    if (autoDetect) {
      detectLocale();
    }
  }, [autoDetect, detectLocale]);

  return {
    detectedLocale,
    preferences,
    setPreferences,
    isLoading,
    error,
    detectLocale,
    resetToDetected,
    hasOverrides,
  };
}

// Helper to get country name from code
function getCountryName(code: string): string {
  const names: Record<string, string> = {
    US: 'United States',
    CA: 'Canada',
    GB: 'United Kingdom',
    AU: 'Australia',
    NZ: 'New Zealand',
    IN: 'India',
    ZA: 'South Africa',
    NG: 'Nigeria',
    KE: 'Kenya',
    GH: 'Ghana',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    IL: 'Israel',
    JP: 'Japan',
    CN: 'China',
    KR: 'South Korea',
    SG: 'Singapore',
    BR: 'Brazil',
    MX: 'Mexico',
    ID: 'Indonesia',
    TH: 'Thailand',
    MY: 'Malaysia',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    IT: 'Italy',
    NL: 'Netherlands',
    EG: 'Egypt',
  };
  return names[code] || code;
}

export default useLocaleDetection;
