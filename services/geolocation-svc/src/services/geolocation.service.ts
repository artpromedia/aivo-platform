import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { CityResponse, Reader } from 'maxmind';
import * as maxmind from 'maxmind';

import type { PrismaClient } from '../../generated/prisma-client';
import { logger } from '../utils/logger';

import type { CacheService } from './cache.service';


export interface LocationResult {
  // Geographic
  countryCode: string;
  countryName: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
  timezone?: string;
  
  // Inferred defaults
  language: string;
  currency: string;
  curriculumFramework?: string;
  
  // Formatting preferences
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
  
  // Additional metadata
  hasLocalPayment: boolean;
  complianceRequirements: string[];
  
  // Detection metadata
  confidence: number;
  detectionMethod: 'ip' | 'browser' | 'manual';
}

export interface DetectionInput {
  ip?: string;
  browserLanguage?: string;
  browserTimezone?: string;
}

export class GeolocationService {
  private maxmindReader: Reader<CityResponse> | null = null;
  private readonly CACHE_TTL = 86400; // 24 hours
  private readonly CACHE_PREFIX = 'geo:';
  
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: CacheService,
  ) {}
  
  /**
   * Initialize the MaxMind GeoIP database
   */
  async initialize(): Promise<void> {
    const dbPath = process.env.MAXMIND_DB_PATH || 
      path.join(__dirname, '../../data/GeoLite2-City.mmdb');
    
    if (fs.existsSync(dbPath)) {
      this.maxmindReader = await maxmind.open<CityResponse>(dbPath);
      logger.info('MaxMind GeoIP database loaded');
    } else {
      logger.warn(`MaxMind database not found at ${dbPath}. IP geolocation will be limited.`);
    }
  }
  
  /**
   * Detect location from IP address and/or browser hints
   */
  async detectLocation(input: DetectionInput): Promise<LocationResult> {
    const { ip, browserLanguage, browserTimezone } = input;
    
    // Try cache first (if IP provided)
    if (ip) {
      const cached = await this.getCachedLocation(ip);
      if (cached) {
        logger.debug('Returning cached location for IP');
        return cached;
      }
    }
    
    // Start with IP geolocation
    let countryCode = 'US'; // Default fallback
    let regionCode: string | undefined;
    let city: string | undefined;
    let timezone: string | undefined;
    let confidence = 0.5;
    let detectionMethod: 'ip' | 'browser' | 'manual' = 'browser';
    
    if (ip && this.maxmindReader) {
      try {
        const geoResult = this.maxmindReader.get(ip);
        const geoCountry = geoResult?.country;
        if (geoCountry?.iso_code && geoResult) {
          countryCode = geoCountry.iso_code;
          regionCode = geoResult.subdivisions?.[0]?.iso_code;
          city = geoResult.city?.names?.en;
          timezone = geoResult.location?.time_zone;
          confidence = typeof geoCountry.confidence === 'number'
            ? geoCountry.confidence / 100 
            : 0.95;
          detectionMethod = 'ip';
        }
      } catch {
        logger.warn('IP geolocation failed');
      }
    }
    
    // Use browser timezone as fallback/validation
    if (browserTimezone && !timezone) {
      timezone = browserTimezone;
    }
    
    // Get country data from database
    const country = await this.prisma.country.findUnique({
      where: { code: countryCode, isActive: true },
      include: {
        regions: regionCode 
          ? { where: { code: regionCode } }
          : undefined,
      },
    });
    
    // Build result with country defaults
    const regions = country?.regions;
    const firstRegion = regions?.[0];
    
    const result: LocationResult = {
      countryCode,
      countryName: country?.name ?? countryCode,
      regionCode,
      regionName: firstRegion?.name,
      city,
      timezone: timezone ?? country?.primaryTimezone ?? 'UTC',
      
      // Use region override if available, else country default
      language: firstRegion?.defaultLanguage
        ?? country?.defaultLanguage 
        ?? this.inferLanguageFromBrowser(browserLanguage)
        ?? 'en',
      currency: firstRegion?.defaultCurrency
        ?? country?.defaultCurrency 
        ?? 'USD',
      curriculumFramework: firstRegion?.defaultCurriculum
        ?? country?.defaultCurriculum
        ?? undefined,
      
      // Formatting
      dateFormat: country?.dateFormat ?? 'MM/DD/YYYY',
      timeFormat: country?.timeFormat ?? '12h',
      firstDayOfWeek: country?.firstDayOfWeek ?? 0,
      
      // Metadata
      hasLocalPayment: country?.hasLocalPayment ?? false,
      complianceRequirements: country?.requiresCompliance ?? [],
      
      // Detection info
      confidence,
      detectionMethod,
    };
    
    // Cache the result
    if (ip) {
      await this.cacheLocation(ip, result);
    }
    
    return result;
  }
  
  /**
   * Get location from cache
   */
  private async getCachedLocation(ip: string): Promise<LocationResult | null> {
    const key = this.CACHE_PREFIX + this.hashIp(ip);
    const cached = await this.cache.get<LocationResult>(key);
    return cached;
  }
  
  /**
   * Cache location result
   */
  private async cacheLocation(ip: string, result: LocationResult): Promise<void> {
    const key = this.CACHE_PREFIX + this.hashIp(ip);
    await this.cache.set(key, result, this.CACHE_TTL);
  }
  
  /**
   * Hash IP for privacy in cache
   */
  private hashIp(ip: string): string {
    return createHash('sha256')
      .update(ip + (process.env.IP_HASH_SALT || 'aivo-geo'))
      .digest('hex')
      .substring(0, 16);
  }
  
  /**
   * Infer language from browser Accept-Language header
   */
  private inferLanguageFromBrowser(browserLanguage?: string): string | null {
    if (!browserLanguage) return null;
    
    // Parse Accept-Language: en-US,en;q=0.9,es;q=0.8
    const parts = browserLanguage.split(',');
    if (parts.length > 0) {
      const primary = parts[0].trim().split(';')[0];
      // Return the full locale code (e.g., 'en-US') or base (e.g., 'en')
      return primary;
    }
    
    return null;
  }
  
  /**
   * Get all active countries with their defaults
   */
  async getCountries() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        code3: true,
        name: true,
        nativeName: true,
        region: true,
        subregion: true,
        defaultLanguage: true,
        defaultCurrency: true,
        defaultCurriculum: true,
        supportedLanguages: true,
        supportedCurrencies: true,
        supportedCurricula: true,
        timezones: true,
        hasLocalPayment: true,
      },
    });
  }
  
  /**
   * Get detailed country information
   */
  async getCountry(code: string) {
    const country = await this.prisma.country.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        regions: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    
    if (!country) {
      return null;
    }
    
    // Get payment providers for this country
    const paymentProviders = await this.prisma.paymentProviderRegion.findMany({
      where: { 
        countryCode: country.code,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });
    
    // Get compliance requirements
    const compliance = await this.prisma.complianceRequirement.findMany({
      where: {
        countries: { has: country.code },
        isActive: true,
      },
    });
    
    return {
      ...country,
      paymentProviders,
      complianceRequirements: compliance,
    };
  }
  
  /**
   * Get best payment provider for a country/currency combination
   */
  async getPaymentProvider(countryCode: string, currency: string): Promise<Awaited<ReturnType<typeof this.prisma.paymentProviderRegion.findFirst>>> {
    return this.prisma.paymentProviderRegion.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        supportedCurrencies: { has: currency.toUpperCase() },
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });
  }
  
  /**
   * Get curriculum frameworks available for a country
   */
  async getCurriculumFrameworks(countryCode: string) {
    return this.prisma.curriculumFramework.findMany({
      where: {
        countries: { has: countryCode.toUpperCase() },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }
  
  /**
   * Resolve the best curriculum for a user based on location
   */
  async resolveCurriculum(params: {
    countryCode: string;
    regionCode?: string;
    schoolType?: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL';
    preferredFramework?: string;
  }): Promise<string | null> {
    const { countryCode, regionCode, schoolType, preferredFramework } = params;
    
    // If user has a preference and it's valid for their region, use it
    if (preferredFramework) {
      const framework = await this.prisma.curriculumFramework.findFirst({
        where: {
          code: preferredFramework,
          countries: { has: countryCode },
          isActive: true,
        },
      });
      if (framework) {
        return framework.code;
      }
    }
    
    // International schools often use IB or Cambridge
    if (schoolType === 'INTERNATIONAL') {
      const intlFramework = await this.prisma.curriculumFramework.findFirst({
        where: {
          code: { in: ['IB_PYP', 'IB_MYP', 'IB_DP', 'CAMBRIDGE_PRIMARY', 'CAMBRIDGE_SECONDARY'] },
          countries: { has: countryCode },
          isActive: true,
        },
      });
      if (intlFramework) {
        return intlFramework.code;
      }
    }
    
    // Check region-specific override
    if (regionCode) {
      const region = await this.prisma.region.findFirst({
        where: {
          countryCode,
          code: regionCode,
          isActive: true,
        },
      });
      if (region?.defaultCurriculum) {
        return region.defaultCurriculum;
      }
    }
    
    // Fall back to country default
    const country = await this.prisma.country.findUnique({
      where: { code: countryCode },
    });
    
    return country?.defaultCurriculum || null;
  }
}
