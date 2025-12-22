/**
 * Phone Validation Service
 *
 * Comprehensive phone number validation using libphonenumber-js:
 * - Parse and validate phone numbers
 * - Convert to E.164 format
 * - Detect number type (mobile/landline)
 * - Country support validation
 * - Carrier lookup integration with Twilio
 */

import {
  parsePhoneNumberWithError,
  getCountryCallingCode,
  type CountryCode,
  type PhoneNumber,
  ParseError,
} from 'libphonenumber-js';

import { twilioProvider } from './twilio.js';
import type {
  PhoneValidationResult,
  CarrierLookupResult,
  PhoneNumberType,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Countries supported for SMS (can be expanded)
 */
const SUPPORTED_COUNTRIES: Set<CountryCode> = new Set([
  'US', // United States
  'CA', // Canada
  'GB', // United Kingdom
  'AU', // Australia
  'NZ', // New Zealand
  'IE', // Ireland
  'DE', // Germany
  'FR', // France
  'ES', // Spain
  'IT', // Italy
  'NL', // Netherlands
  'BE', // Belgium
  'AT', // Austria
  'CH', // Switzerland
  'SE', // Sweden
  'NO', // Norway
  'DK', // Denmark
  'FI', // Finland
  'PT', // Portugal
  'PL', // Poland
  'IN', // India
  'SG', // Singapore
  'HK', // Hong Kong
  'JP', // Japan
  'MX', // Mexico
  'BR', // Brazil
]);

/**
 * Countries that require carrier lookup to verify mobile
 */
const REQUIRE_CARRIER_LOOKUP: Set<CountryCode> = new Set([
  'US',
  'CA',
]);

/**
 * Phone number types that can receive SMS
 */
const SMS_CAPABLE_TYPES: Set<PhoneNumberType> = new Set([
  'mobile',
  'voip', // Some VoIP can receive SMS
]);

// ══════════════════════════════════════════════════════════════════════════════
// PHONE VALIDATION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class PhoneValidationService {
  private readonly carrierCache = new Map<string, { result: CarrierLookupResult; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Validate and normalize a phone number
   */
  async validate(
    phoneNumber: string,
    options: {
      defaultCountry?: CountryCode;
      requireMobile?: boolean;
      lookupCarrier?: boolean;
    } = {}
  ): Promise<PhoneValidationResult> {
    const { defaultCountry = 'US', requireMobile = true, lookupCarrier = false } = options;

    // Basic cleanup
    const cleaned = this.cleanPhoneNumber(phoneNumber);

    if (!cleaned) {
      return {
        isValid: false,
        reason: 'Phone number is empty or invalid',
      };
    }

    // Parse the phone number
    let parsed: PhoneNumber;
    try {
      parsed = parsePhoneNumberWithError(cleaned, defaultCountry);
    } catch (error) {
      const parseError = error as ParseError;
      return {
        isValid: false,
        reason: this.getParseErrorMessage(parseError),
      };
    }

    // Check if valid
    if (!parsed.isValid()) {
      return {
        isValid: false,
        e164: parsed.format('E.164'),
        countryCode: parsed.country,
        reason: 'Phone number format is invalid',
      };
    }

    // Check country support
    if (parsed.country && !SUPPORTED_COUNTRIES.has(parsed.country)) {
      return {
        isValid: false,
        e164: parsed.format('E.164'),
        countryCode: parsed.country,
        reason: `Country ${parsed.country} is not currently supported for SMS`,
      };
    }

    // Determine number type from libphonenumber
    const libraryType = parsed.getType();
    let type = this.mapLibraryType(libraryType);
    let carrier: string | undefined;
    let smsCapable = SMS_CAPABLE_TYPES.has(type);

    // For US/CA, carrier lookup is more reliable than libphonenumber
    if (lookupCarrier || (requireMobile && parsed.country && REQUIRE_CARRIER_LOOKUP.has(parsed.country))) {
      const carrierResult = await this.lookupCarrier(parsed.format('E.164'));
      
      if (!carrierResult.error) {
        type = carrierResult.type;
        carrier = carrierResult.carrierName;
        smsCapable = SMS_CAPABLE_TYPES.has(type) || type === 'unknown';
      }
    }

    // Block landlines if mobile required
    if (requireMobile && type === 'landline') {
      return {
        isValid: false,
        e164: parsed.format('E.164'),
        countryCode: parsed.country,
        nationalNumber: parsed.nationalNumber,
        type,
        carrier,
        smsCapable: false,
        reason: 'Landline numbers cannot receive SMS. Please use a mobile number.',
      };
    }

    return {
      isValid: true,
      e164: parsed.format('E.164'),
      countryCode: parsed.country,
      nationalNumber: parsed.nationalNumber,
      type,
      carrier,
      smsCapable,
    };
  }

  /**
   * Quick validation without carrier lookup
   */
  validateFormat(phoneNumber: string, defaultCountry: CountryCode = 'US'): PhoneValidationResult {
    const cleaned = this.cleanPhoneNumber(phoneNumber);

    if (!cleaned) {
      return {
        isValid: false,
        reason: 'Phone number is empty or invalid',
      };
    }

    try {
      const parsed = parsePhoneNumberWithError(cleaned, defaultCountry);
      
      if (!parsed.isValid()) {
        return {
          isValid: false,
          reason: 'Invalid phone number format',
        };
      }

      return {
        isValid: true,
        e164: parsed.format('E.164'),
        countryCode: parsed.country,
        nationalNumber: parsed.nationalNumber,
        type: this.mapLibraryType(parsed.getType()),
      };
    } catch {
      return {
        isValid: false,
        reason: 'Could not parse phone number',
      };
    }
  }

  /**
   * Convert phone number to E.164 format
   */
  toE164(phoneNumber: string, defaultCountry: CountryCode = 'US'): string | null {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    
    try {
      const parsed = parsePhoneNumberWithError(cleaned, defaultCountry);
      return parsed.format('E.164');
    } catch {
      return null;
    }
  }

  /**
   * Format phone number for display
   */
  formatForDisplay(phoneNumber: string, format: 'national' | 'international' = 'national'): string {
    try {
      const parsed = parsePhoneNumberWithError(phoneNumber);
      
      return format === 'national' 
        ? parsed.formatNational() 
        : parsed.formatInternational();
    } catch {
      return phoneNumber;
    }
  }

  /**
   * Lookup carrier information
   */
  async lookupCarrier(e164Number: string): Promise<CarrierLookupResult> {
    // Check cache
    const cached = this.carrierCache.get(e164Number);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    // Use Twilio for carrier lookup
    const result = await twilioProvider.lookupCarrier(e164Number);

    // Cache result
    this.carrierCache.set(e164Number, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Check if a country is supported
   */
  isCountrySupported(countryCode: string): boolean {
    return SUPPORTED_COUNTRIES.has(countryCode as CountryCode);
  }

  /**
   * Get list of supported countries
   */
  getSupportedCountries(): Array<{ code: CountryCode; callingCode: string }> {
    return Array.from(SUPPORTED_COUNTRIES).map((code) => ({
      code,
      callingCode: `+${getCountryCallingCode(code)}`,
    }));
  }

  /**
   * Mask phone number for logging/display
   */
  maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replaceAll(/\D/g, '');
    if (cleaned.length < 4) return '****';
    return cleaned.substring(0, 3) + '****' + cleaned.substring(cleaned.length - 2);
  }

  /**
   * Check if two phone numbers are the same
   */
  isSameNumber(phone1: string, phone2: string, defaultCountry: CountryCode = 'US'): boolean {
    const e164_1 = this.toE164(phone1, defaultCountry);
    const e164_2 = this.toE164(phone2, defaultCountry);
    return e164_1 !== null && e164_1 === e164_2;
  }

  /**
   * Clear carrier cache
   */
  clearCache(): void {
    this.carrierCache.clear();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private cleanPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return '';
    }

    // Remove common formatting but keep + for international
    return phoneNumber
      .trim()
      .replaceAll(/[\s\-.()[\]]/g, '')
      .replace(/^00/, '+'); // Convert 00 prefix to +
  }

  private mapLibraryType(type: string | undefined): PhoneNumberType {
    switch (type) {
      case 'MOBILE':
        return 'mobile';
      case 'FIXED_LINE':
        return 'landline';
      case 'FIXED_LINE_OR_MOBILE':
        return 'mobile'; // Assume mobile for safety
      case 'VOIP':
        return 'voip';
      case 'TOLL_FREE':
        return 'toll_free';
      case 'PREMIUM_RATE':
        return 'premium_rate';
      default:
        return 'unknown';
    }
  }

  private getParseErrorMessage(error: ParseError): string {
    switch (error.message) {
      case 'NOT_A_NUMBER':
        return 'The input does not appear to be a phone number';
      case 'INVALID_COUNTRY':
        return 'Invalid or unsupported country code';
      case 'TOO_SHORT':
        return 'Phone number is too short';
      case 'TOO_LONG':
        return 'Phone number is too long';
      default:
        return 'Invalid phone number format';
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const phoneValidationService = new PhoneValidationService();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export function validatePhoneNumber(
  phoneNumber: string,
  options?: {
    defaultCountry?: CountryCode;
    requireMobile?: boolean;
    lookupCarrier?: boolean;
  }
): Promise<PhoneValidationResult> {
  return phoneValidationService.validate(phoneNumber, options);
}

export function validatePhoneFormat(
  phoneNumber: string,
  defaultCountry?: CountryCode
): PhoneValidationResult {
  return phoneValidationService.validateFormat(phoneNumber, defaultCountry);
}

export function toE164(phoneNumber: string, defaultCountry?: CountryCode): string | null {
  return phoneValidationService.toE164(phoneNumber, defaultCountry);
}

export function maskPhone(phoneNumber: string): string {
  return phoneValidationService.maskPhoneNumber(phoneNumber);
}
