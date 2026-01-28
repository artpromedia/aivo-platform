import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin, Languages, Banknote, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface LocalePreferences {
  language: string;
  country: string;
  currency: string;
  timezone: string;
  curriculumFramework?: string;
  dateFormat: string;
  timeFormat: string;
}

export interface DetectedLocale {
  countryCode: string;
  countryName: string;
  language: string;
  currency: string;
  timezone: string;
  curriculumFramework?: string;
  hasLocalPayment: boolean;
  confidence: number;
  detectionMethod: 'ip' | 'browser' | 'manual';
}

export interface LocalePickerProps {
  value: LocalePreferences;
  onChange: (preferences: LocalePreferences) => void;
  detectedLocale?: DetectedLocale | null;
  isLoading?: boolean;
  showCurriculum?: boolean;
  compact?: boolean;
  className?: string;
}

// Supported languages with native names
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', flag: '🇲🇽' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', flag: '🇨🇦' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'ar-SA', name: 'Arabic (Saudi)', nativeName: 'العربية (السعودية)', flag: '🇸🇦', rtl: true },
  { code: 'ar-AE', name: 'Arabic (UAE)', nativeName: 'العربية (الإمارات)', flag: '🇦🇪', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦' },
];

// Countries with region info
const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'Americas' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'Americas' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'Americas' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'Americas' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'Americas' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Middle East' },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia' },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'Asia' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'Asia' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
];

// Currencies
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
];

// Curriculum frameworks
const CURRICULUM_FRAMEWORKS = [
  { code: 'COMMON_CORE', name: 'Common Core (US)', countries: ['US'] },
  { code: 'NGSS', name: 'Next Generation Science Standards (US)', countries: ['US'] },
  { code: 'TEKS', name: 'Texas Essential Knowledge and Skills', countries: ['US'] },
  { code: 'UK_NATIONAL_CURRICULUM', name: 'UK National Curriculum', countries: ['GB', 'NG', 'KE', 'GH'] },
  { code: 'CURRICULUM_FOR_EXCELLENCE', name: 'Curriculum for Excellence (Scotland)', countries: ['GB'] },
  { code: 'CBSE', name: 'CBSE (India)', countries: ['IN', 'AE'] },
  { code: 'ICSE', name: 'ICSE (India)', countries: ['IN'] },
  { code: 'ONTARIO_CURRICULUM', name: 'Ontario Curriculum', countries: ['CA'] },
  { code: 'BC_CURRICULUM', name: 'British Columbia Curriculum', countries: ['CA'] },
  { code: 'QUEBEC_QEP', name: 'Quebec Education Program', countries: ['CA'] },
  { code: 'UAE_MOE', name: 'UAE Ministry of Education', countries: ['AE'] },
  { code: 'CAPS', name: 'CAPS (South Africa)', countries: ['ZA'] },
  { code: 'AUSTRALIAN_CURRICULUM', name: 'Australian Curriculum', countries: ['AU'] },
  { code: 'NEW_ZEALAND_CURRICULUM', name: 'New Zealand Curriculum', countries: ['NZ'] },
  { code: 'IB_PYP', name: 'IB Primary Years Programme', countries: ['US', 'GB', 'AE', 'IN', 'SG', 'AU', 'ZA'] },
  { code: 'IB_MYP', name: 'IB Middle Years Programme', countries: ['US', 'GB', 'AE', 'IN', 'SG', 'AU', 'ZA'] },
  { code: 'IB_DP', name: 'IB Diploma Programme', countries: ['US', 'GB', 'AE', 'IN', 'SG', 'AU', 'ZA'] },
  { code: 'CAMBRIDGE_PRIMARY', name: 'Cambridge Primary', countries: ['GB', 'AE', 'IN', 'SG', 'ZA', 'NG', 'KE'] },
  { code: 'CAMBRIDGE_SECONDARY', name: 'Cambridge IGCSE', countries: ['GB', 'AE', 'IN', 'SG', 'ZA', 'NG', 'KE'] },
];

/**
 * LocalePicker - Component for selecting language, country, currency, and curriculum preferences
 * Used during registration and in user settings
 */
export const LocalePicker: React.FC<LocalePickerProps> = ({
  value,
  onChange,
  detectedLocale,
  isLoading = false,
  showCurriculum = false,
  compact = false,
  className,
}) => {
  const [availableCurricula, setAvailableCurricula] = useState(CURRICULUM_FRAMEWORKS);

  // Filter curricula based on selected country
  useEffect(() => {
    if (value.country) {
      const filtered = CURRICULUM_FRAMEWORKS.filter(
        (c) => c.countries.includes(value.country) || c.countries.length === 0
      );
      setAvailableCurricula(filtered.length > 0 ? filtered : CURRICULUM_FRAMEWORKS);
    }
  }, [value.country]);

  const handleChange = (field: keyof LocalePreferences, newValue: string) => {
    onChange({ ...value, [field]: newValue });
  };

  // Group countries by region for better UX
  const groupedCountries = COUNTRIES.reduce((acc, country) => {
    if (!acc[country.region]) {
      acc[country.region] = [];
    }
    acc[country.region].push(country);
    return acc;
  }, {} as Record<string, typeof COUNTRIES>);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Detecting your location...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Detection notice */}
      {detectedLocale && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            We detected you're in{' '}
            <strong>{detectedLocale.countryName}</strong>. 
            Feel free to adjust your preferences below.
          </span>
          <Badge variant="outline" className="ml-auto">
            {Math.round(detectedLocale.confidence * 100)}% confident
          </Badge>
        </div>
      )}

      <div className={cn('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2')}>
        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Language
          </Label>
          <Select
            value={value.language}
            onValueChange={(v) => handleChange('language', v)}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    {lang.rtl && (
                      <Badge variant="outline" className="text-xs">RTL</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Country
          </Label>
          <Select
            value={value.country}
            onValueChange={(v) => handleChange('country', v)}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedCountries).map(([region, countries]) => (
                <React.Fragment key={region}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {region}
                  </div>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Currency
          </Label>
          <Select
            value={value.currency}
            onValueChange={(v) => handleChange('currency', v)}
          >
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{currency.symbol}</span>
                    <span>{currency.name}</span>
                    <span className="text-muted-foreground">({currency.code})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Curriculum (optional, for educators) */}
        {showCurriculum && (
          <div className="space-y-2">
            <Label htmlFor="curriculum" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Curriculum Framework
            </Label>
            <Select
              value={value.curriculumFramework || ''}
              onValueChange={(v) => handleChange('curriculumFramework', v)}
            >
              <SelectTrigger id="curriculum">
                <SelectValue placeholder="Select curriculum" />
              </SelectTrigger>
              <SelectContent>
                {availableCurricula.map((curriculum) => (
                  <SelectItem key={curriculum.code} value={curriculum.code}>
                    {curriculum.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This helps us align content with your educational standards.
            </p>
          </div>
        )}
      </div>

      {/* Time format preference */}
      {!compact && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-2">
            <Label htmlFor="dateFormat" className="text-sm">Date Format</Label>
            <Select
              value={value.dateFormat}
              onValueChange={(v) => handleChange('dateFormat', v)}
            >
              <SelectTrigger id="dateFormat" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (DE)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeFormat" className="text-sm">Time Format</Label>
            <Select
              value={value.timeFormat}
              onValueChange={(v) => handleChange('timeFormat', v)}
            >
              <SelectTrigger id="timeFormat" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (1:30 PM)</SelectItem>
                <SelectItem value="24h">24-hour (13:30)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalePicker;
