/**
 * Payment Gateway Factory
 *
 * Intelligent gateway selection based on:
 * - User's country
 * - Currency
 * - Payment method preferences
 * - Gateway availability
 *
 * This factory ensures optimal payment processing by routing
 * transactions to the most suitable gateway for each region.
 */

import { FlutterwaveGateway } from './flutterwave.gateway.js';
import { MercadoPagoGateway } from './mercadopago.gateway.js';
import { MpesaGateway } from './mpesa.gateway.js';
import type { PaymentGateway } from './payment-gateway.interface.js';
import { PaymentGatewayType, getGatewayCapabilities } from './payment-gateway.interface.js';
import { PaystackGateway } from './paystack.gateway.js';
import { PaytmGateway } from './paytm.gateway.js';
import { PayUGateway } from './payu.gateway.js';
import { RazorpayGateway } from './razorpay.gateway.js';
import { StripeGateway } from './stripe.gateway.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

interface GatewayFactoryConfig {
  // Stripe (Global fallback)
  stripe?: {
    secretKey: string;
    webhookSecret: string;
  };

  // Paystack (Africa - Nigeria, Ghana, Kenya, South Africa)
  paystack?: {
    secretKey: string;
    publicKey: string;
  };

  // Razorpay (India)
  razorpay?: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };

  // Mercado Pago (Latin America)
  mercadoPago?: {
    accessToken: string;
    publicKey: string;
    webhookSecret?: string;
  };

  // Flutterwave (Pan-Africa - 34+ countries)
  flutterwave?: {
    secretKey: string;
    publicKey: string;
    encryptionKey: string;
    webhookSecretHash?: string;
  };

  // M-Pesa (East Africa mobile money - Kenya, Tanzania)
  mpesa?: {
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    passKey: string;
    callbackUrl: string;
    initiatorName?: string;
    initiatorPassword?: string;
    securityCredential?: string;
  };

  // PayU (India, Latin America, Europe, Africa)
  payu?: {
    merchantKey: string;
    merchantSalt: string;
    merchantSaltV2?: string;
    merchantId?: string;
    region: 'india' | 'latam' | 'europe' | 'africa';
  };

  // Paytm (India)
  paytm?: {
    merchantId: string;
    merchantKey: string;
    website: string;
    industryType: string;
    channelId: string;
    callbackUrl: string;
  };

  // Default gateway if no specific match
  defaultGateway?: PaymentGatewayType;
}

// ══════════════════════════════════════════════════════════════════════════════
// REGIONAL MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Country to preferred gateway mapping
 * Based on local payment method preferences and gateway capabilities
 */
const COUNTRY_GATEWAY_MAP: Record<string, PaymentGatewayType> = {
  // Africa - Paystack (primary) and Flutterwave (secondary)
  NG: PaymentGatewayType.PAYSTACK, // Nigeria
  GH: PaymentGatewayType.PAYSTACK, // Ghana
  ZA: PaymentGatewayType.PAYSTACK, // South Africa

  // East Africa - Flutterwave (M-Pesa disabled until production-ready)
  KE: PaymentGatewayType.FLUTTERWAVE, // Kenya (M-Pesa available but needs production hardening)
  TZ: PaymentGatewayType.FLUTTERWAVE, // Tanzania
  UG: PaymentGatewayType.FLUTTERWAVE, // Uganda
  RW: PaymentGatewayType.FLUTTERWAVE, // Rwanda
  ZM: PaymentGatewayType.FLUTTERWAVE, // Zambia

  // Francophone Africa - Flutterwave
  CI: PaymentGatewayType.FLUTTERWAVE, // Côte d'Ivoire
  SN: PaymentGatewayType.FLUTTERWAVE, // Senegal
  CM: PaymentGatewayType.FLUTTERWAVE, // Cameroon
  BJ: PaymentGatewayType.FLUTTERWAVE, // Benin
  TG: PaymentGatewayType.FLUTTERWAVE, // Togo
  BF: PaymentGatewayType.FLUTTERWAVE, // Burkina Faso
  ML: PaymentGatewayType.FLUTTERWAVE, // Mali
  NE: PaymentGatewayType.FLUTTERWAVE, // Niger

  // India - Razorpay (primary), Paytm and PayU (secondary)
  IN: PaymentGatewayType.RAZORPAY,

  // Latin America - Mercado Pago
  AR: PaymentGatewayType.MERCADO_PAGO, // Argentina
  BR: PaymentGatewayType.MERCADO_PAGO, // Brazil
  CL: PaymentGatewayType.MERCADO_PAGO, // Chile
  CO: PaymentGatewayType.MERCADO_PAGO, // Colombia
  MX: PaymentGatewayType.MERCADO_PAGO, // Mexico
  PE: PaymentGatewayType.MERCADO_PAGO, // Peru
  UY: PaymentGatewayType.MERCADO_PAGO, // Uruguay
  PA: PaymentGatewayType.MERCADO_PAGO, // Panama

  // Europe - PayU for select countries, Stripe for rest
  PL: PaymentGatewayType.PAYU, // Poland
  CZ: PaymentGatewayType.PAYU, // Czech Republic
  RO: PaymentGatewayType.PAYU, // Romania
  TR: PaymentGatewayType.PAYU, // Turkey

  // Rest of the world - Stripe (default)
  US: PaymentGatewayType.STRIPE,
  GB: PaymentGatewayType.STRIPE,
  CA: PaymentGatewayType.STRIPE,
  AU: PaymentGatewayType.STRIPE,
  DE: PaymentGatewayType.STRIPE,
  FR: PaymentGatewayType.STRIPE,
  ES: PaymentGatewayType.STRIPE,
  IT: PaymentGatewayType.STRIPE,
  NL: PaymentGatewayType.STRIPE,
  BE: PaymentGatewayType.STRIPE,
  AT: PaymentGatewayType.STRIPE,
  CH: PaymentGatewayType.STRIPE,
  JP: PaymentGatewayType.STRIPE,
  SG: PaymentGatewayType.STRIPE,
  HK: PaymentGatewayType.STRIPE,
  NZ: PaymentGatewayType.STRIPE,
  IE: PaymentGatewayType.STRIPE,
  SE: PaymentGatewayType.STRIPE,
  NO: PaymentGatewayType.STRIPE,
  DK: PaymentGatewayType.STRIPE,
  FI: PaymentGatewayType.STRIPE,
};

/**
 * Currency to preferred gateway mapping (fallback if country not mapped)
 */
const CURRENCY_GATEWAY_MAP: Record<string, PaymentGatewayType> = {
  // African currencies - Paystack or Flutterwave
  NGN: PaymentGatewayType.PAYSTACK,
  GHS: PaymentGatewayType.PAYSTACK,
  ZAR: PaymentGatewayType.PAYSTACK,

  // East African currencies - M-Pesa or Flutterwave
  KES: PaymentGatewayType.MPESA,
  TZS: PaymentGatewayType.FLUTTERWAVE,
  UGX: PaymentGatewayType.FLUTTERWAVE,
  RWF: PaymentGatewayType.FLUTTERWAVE,
  ZMW: PaymentGatewayType.FLUTTERWAVE,

  // Francophone African currencies - Flutterwave
  XOF: PaymentGatewayType.FLUTTERWAVE, // West African CFA franc
  XAF: PaymentGatewayType.FLUTTERWAVE, // Central African CFA franc

  // Indian currency - Razorpay (primary), Paytm/PayU (secondary)
  INR: PaymentGatewayType.RAZORPAY,

  // Latin American currencies - Mercado Pago
  ARS: PaymentGatewayType.MERCADO_PAGO,
  BRL: PaymentGatewayType.MERCADO_PAGO,
  CLP: PaymentGatewayType.MERCADO_PAGO,
  COP: PaymentGatewayType.MERCADO_PAGO,
  MXN: PaymentGatewayType.MERCADO_PAGO,
  PEN: PaymentGatewayType.MERCADO_PAGO,
  UYU: PaymentGatewayType.MERCADO_PAGO,

  // European currencies - PayU or Stripe
  PLN: PaymentGatewayType.PAYU, // Polish Zloty
  CZK: PaymentGatewayType.PAYU, // Czech Koruna
  RON: PaymentGatewayType.PAYU, // Romanian Leu
  TRY: PaymentGatewayType.PAYU, // Turkish Lira

  // International currencies - Stripe
  USD: PaymentGatewayType.STRIPE,
  EUR: PaymentGatewayType.STRIPE,
  GBP: PaymentGatewayType.STRIPE,
  CAD: PaymentGatewayType.STRIPE,
  AUD: PaymentGatewayType.STRIPE,
  JPY: PaymentGatewayType.STRIPE,
  CHF: PaymentGatewayType.STRIPE,
  NZD: PaymentGatewayType.STRIPE,
  SEK: PaymentGatewayType.STRIPE,
  NOK: PaymentGatewayType.STRIPE,
  DKK: PaymentGatewayType.STRIPE,
  SGD: PaymentGatewayType.STRIPE,
  HKD: PaymentGatewayType.STRIPE,
};

// ══════════════════════════════════════════════════════════════════════════════
// GATEWAY FACTORY
// ══════════════════════════════════════════════════════════════════════════════

export class PaymentGatewayFactory {
  private readonly gateways = new Map<PaymentGatewayType, PaymentGateway>();
  private readonly defaultGateway: PaymentGatewayType;

  constructor(config: GatewayFactoryConfig) {
    // Initialize configured gateways

    // Stripe (Global)
    if (config.stripe) {
      this.gateways.set(PaymentGatewayType.STRIPE, new StripeGateway(config.stripe));
    }

    // Paystack (Africa - Nigeria, Ghana, Kenya, South Africa)
    if (config.paystack) {
      this.gateways.set(PaymentGatewayType.PAYSTACK, new PaystackGateway(config.paystack));
    }

    // Razorpay (India)
    if (config.razorpay) {
      this.gateways.set(PaymentGatewayType.RAZORPAY, new RazorpayGateway(config.razorpay));
    }

    // Mercado Pago (Latin America)
    if (config.mercadoPago) {
      this.gateways.set(
        PaymentGatewayType.MERCADO_PAGO,
        new MercadoPagoGateway(config.mercadoPago)
      );
    }

    // Flutterwave (Pan-Africa - 34+ countries)
    if (config.flutterwave) {
      this.gateways.set(
        PaymentGatewayType.FLUTTERWAVE,
        new FlutterwaveGateway({
          ...config.flutterwave,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        }) as unknown as PaymentGateway
      );
    }

    // M-Pesa (East Africa mobile money)
    if (config.mpesa) {
      this.gateways.set(
        PaymentGatewayType.MPESA,
        new MpesaGateway({
          ...config.mpesa,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        }) as unknown as PaymentGateway
      );
    }

    // PayU (India, Latin America, Europe, Africa)
    if (config.payu) {
      this.gateways.set(
        PaymentGatewayType.PAYU,
        new PayUGateway({
          ...config.payu,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        }) as unknown as PaymentGateway
      );
    }

    // Paytm (India)
    if (config.paytm) {
      this.gateways.set(
        PaymentGatewayType.PAYTM,
        new PaytmGateway({
          ...config.paytm,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        }) as unknown as PaymentGateway
      );
    }

    // Set default gateway
    this.defaultGateway = config.defaultGateway ?? PaymentGatewayType.STRIPE;
  }

  /**
   * Get the optimal gateway for a given country and currency
   */
  getGateway(options: {
    country?: string;
    currency?: string;
    preferredGateway?: PaymentGatewayType;
    requireSubscriptions?: boolean;
  }): PaymentGateway {
    const { country, currency, preferredGateway, requireSubscriptions } = options;

    // If a specific gateway is requested and available, use it
    if (preferredGateway) {
      const gateway = this.gateways.get(preferredGateway);
      if (gateway?.isAvailable()) {
        return gateway;
      }
    }

    // Try to find gateway by country
    if (country) {
      const countryCode = country.toUpperCase();
      const gatewayType = COUNTRY_GATEWAY_MAP[countryCode];

      if (gatewayType) {
        const gateway = this.gateways.get(gatewayType);
        if (gateway?.isAvailable()) {
          // Check capability requirements
          if (requireSubscriptions) {
            const capabilities = getGatewayCapabilities(gatewayType);
            if (capabilities.supportsSubscriptions) {
              return gateway;
            }
          } else {
            return gateway;
          }
        }
      }
    }

    // Try to find gateway by currency
    if (currency) {
      const currencyCode = currency.toUpperCase();
      const gatewayType = CURRENCY_GATEWAY_MAP[currencyCode];

      if (gatewayType) {
        const gateway = this.gateways.get(gatewayType);
        if (gateway?.isAvailable()) {
          if (requireSubscriptions) {
            const capabilities = getGatewayCapabilities(gatewayType);
            if (capabilities.supportsSubscriptions) {
              return gateway;
            }
          } else {
            return gateway;
          }
        }
      }
    }

    // Fall back to default gateway
    const defaultGateway = this.gateways.get(this.defaultGateway);
    if (defaultGateway?.isAvailable()) {
      return defaultGateway;
    }

    // If default is not available, try any available gateway
    for (const [type, gateway] of this.gateways) {
      if (gateway.isAvailable()) {
        if (requireSubscriptions) {
          const capabilities = getGatewayCapabilities(type);
          if (capabilities.supportsSubscriptions) {
            return gateway;
          }
        } else {
          return gateway;
        }
      }
    }

    throw new Error('No payment gateway available');
  }

  /**
   * Get a specific gateway by type
   */
  getGatewayByType(type: PaymentGatewayType): PaymentGateway | undefined {
    return this.gateways.get(type);
  }

  /**
   * Get all available gateways
   */
  getAvailableGateways(): PaymentGateway[] {
    return Array.from(this.gateways.values()).filter((g) => g.isAvailable());
  }

  /**
   * Get supported countries for a gateway
   */
  getSupportedCountries(gatewayType: PaymentGatewayType): string[] {
    const gateway = this.gateways.get(gatewayType);
    return gateway?.supportedCountries ?? [];
  }

  /**
   * Get supported currencies for a gateway
   */
  getSupportedCurrencies(gatewayType: PaymentGatewayType): string[] {
    const gateway = this.gateways.get(gatewayType);
    return gateway?.supportedCurrencies ?? [];
  }

  /**
   * Check if a country has a regional gateway configured
   */
  hasRegionalGateway(country: string): boolean {
    const gatewayType = COUNTRY_GATEWAY_MAP[country.toUpperCase()];
    if (!gatewayType) return false;

    const gateway = this.gateways.get(gatewayType);
    return gateway?.isAvailable() ?? false;
  }

  /**
   * Get the recommended gateway type for a country
   */
  getRecommendedGatewayType(country: string): PaymentGatewayType {
    const gatewayType = COUNTRY_GATEWAY_MAP[country.toUpperCase()];
    if (gatewayType && this.gateways.get(gatewayType)?.isAvailable()) {
      return gatewayType;
    }
    return this.defaultGateway;
  }

  /**
   * Get all countries supported by any gateway
   */
  getAllSupportedCountries(): {
    country: string;
    gatewayType: PaymentGatewayType;
    currencies: string[];
  }[] {
    const result: {
      country: string;
      gatewayType: PaymentGatewayType;
      currencies: string[];
    }[] = [];

    for (const [country, gatewayType] of Object.entries(COUNTRY_GATEWAY_MAP)) {
      const gateway = this.gateways.get(gatewayType);
      if (gateway?.isAvailable()) {
        result.push({
          country,
          gatewayType,
          currencies: gateway.supportedCurrencies,
        });
      }
    }

    return result;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

let factoryInstance: PaymentGatewayFactory | null = null;

/**
 * Initialize the payment gateway factory with configuration
 */
export function initializePaymentGateways(config: GatewayFactoryConfig): PaymentGatewayFactory {
  factoryInstance = new PaymentGatewayFactory(config);
  return factoryInstance;
}

/**
 * Get the payment gateway factory instance
 */
export function getPaymentGatewayFactory(): PaymentGatewayFactory {
  if (!factoryInstance) {
    throw new Error(
      'Payment gateway factory not initialized. Call initializePaymentGateways first.'
    );
  }
  return factoryInstance;
}

/**
 * Convenience function to get the optimal gateway
 */
export function getPaymentGateway(options: {
  country?: string;
  currency?: string;
  preferredGateway?: PaymentGatewayType;
  requireSubscriptions?: boolean;
}): PaymentGateway {
  return getPaymentGatewayFactory().getGateway(options);
}
