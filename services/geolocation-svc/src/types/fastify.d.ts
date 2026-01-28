import type { PrismaClient, Currency as PrismaCurrency } from '../../generated/prisma-client';
import type { CacheService } from '../services/cache.service';
import type { GeolocationService } from '../services/geolocation.service';

export interface GeolocationServices {
  prisma: PrismaClient;
  geolocation: GeolocationService;
  cache: CacheService;
}

declare module 'fastify' {
  interface FastifyRequest {
    services: GeolocationServices;
  }
}

// Query/Param types for routes
export interface CountryListQuery {
  region?: string;
}

export interface CountryCodeParams {
  code: string;
}

export interface CurrencyCodeParams {
  code: string;
}

export interface CurrencyFormatQuery {
  amount?: string;
}

export interface CurrencyConvertQuery {
  from: string;
  to: string;
  amount: string;
}

export interface CurriculumListQuery {
  countryCode?: string;
  type?: string;
}

export interface CurriculumCodeParams {
  code: string;
}

export interface PaymentProviderQuery {
  countryCode?: string;
  currency?: string;
}

// Country type from Prisma
export interface Country {
  code: string;
  code3: string;
  name: string;
  nativeName: string | null;
  region: string;
  subregion: string | null;
  defaultLanguage: string;
  defaultCurrency: string;
  defaultCurriculum: string | null;
  supportedLanguages: string[];
  supportedCurrencies: string[];
  supportedCurricula: string[];
  timezones: string[];
  hasLocalPayment: boolean;
}

// Re-export Currency type from Prisma
export type Currency = PrismaCurrency;

// Curriculum type
export interface Curriculum {
  code: string;
  name: string;
  type: string;
  countries: string[];
  isActive: boolean;
}
