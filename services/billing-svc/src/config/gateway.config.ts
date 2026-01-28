/**
 * Payment Gateway Configuration
 *
 * Environment-based configuration for all payment gateways.
 * Each gateway can be enabled/disabled independently.
 */

import { initializePaymentGateways, PaymentGatewayType } from '../gateways/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface GatewayEnvConfig {
  // Stripe (Global)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // Paystack (Africa)
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;

  // Razorpay (India)
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;

  // Mercado Pago (Latin America)
  MERCADOPAGO_ACCESS_TOKEN?: string;
  MERCADOPAGO_PUBLIC_KEY?: string;
  MERCADOPAGO_WEBHOOK_SECRET?: string;

  // Flutterwave (Pan-Africa)
  FLUTTERWAVE_SECRET_KEY?: string;
  FLUTTERWAVE_PUBLIC_KEY?: string;
  FLUTTERWAVE_ENCRYPTION_KEY?: string;
  FLUTTERWAVE_WEBHOOK_SECRET_HASH?: string;

  // M-Pesa (East Africa)
  MPESA_CONSUMER_KEY?: string;
  MPESA_CONSUMER_SECRET?: string;
  MPESA_SHORT_CODE?: string;
  MPESA_PASS_KEY?: string;
  MPESA_CALLBACK_URL?: string;
  MPESA_INITIATOR_NAME?: string;
  MPESA_INITIATOR_PASSWORD?: string;
  MPESA_SECURITY_CREDENTIAL?: string;

  // PayU (India, Latin America, Europe, Africa)
  PAYU_MERCHANT_KEY?: string;
  PAYU_MERCHANT_SALT?: string;
  PAYU_MERCHANT_SALT_V2?: string;
  PAYU_MERCHANT_ID?: string;
  PAYU_REGION?: string; // 'india' | 'latam' | 'europe' | 'africa'

  // Paytm (India)
  PAYTM_MERCHANT_ID?: string;
  PAYTM_MERCHANT_KEY?: string;
  PAYTM_WEBSITE?: string;
  PAYTM_INDUSTRY_TYPE?: string;
  PAYTM_CHANNEL_ID?: string;
  PAYTM_CALLBACK_URL?: string;

  // Default gateway
  DEFAULT_PAYMENT_GATEWAY?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize payment gateways from environment variables
 */
export function initializeGatewaysFromEnv(env: GatewayEnvConfig = process.env): void {
  const config: Parameters<typeof initializePaymentGateways>[0] = {};

  // Stripe (required for global coverage)
  if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
    config.stripe = {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    };
    console.log('[Billing] Stripe gateway configured (Global)');
  }

  // Paystack (Africa)
  if (env.PAYSTACK_SECRET_KEY && env.PAYSTACK_PUBLIC_KEY) {
    config.paystack = {
      secretKey: env.PAYSTACK_SECRET_KEY,
      publicKey: env.PAYSTACK_PUBLIC_KEY,
    };
    console.log('[Billing] Paystack gateway configured (Africa)');
  }

  // Razorpay (India)
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET) {
    config.razorpay = {
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    };
    console.log('[Billing] Razorpay gateway configured (India)');
  }

  // Mercado Pago (Latin America)
  if (env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_PUBLIC_KEY) {
    config.mercadoPago = {
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      publicKey: env.MERCADOPAGO_PUBLIC_KEY,
      webhookSecret: env.MERCADOPAGO_WEBHOOK_SECRET,
    };
    console.log('[Billing] Mercado Pago gateway configured (Latin America)');
  }

  // Flutterwave (Pan-Africa)
  if (env.FLUTTERWAVE_SECRET_KEY && env.FLUTTERWAVE_PUBLIC_KEY && env.FLUTTERWAVE_ENCRYPTION_KEY) {
    config.flutterwave = {
      secretKey: env.FLUTTERWAVE_SECRET_KEY,
      publicKey: env.FLUTTERWAVE_PUBLIC_KEY,
      encryptionKey: env.FLUTTERWAVE_ENCRYPTION_KEY,
      webhookSecretHash: env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
    };
    console.log('[Billing] Flutterwave gateway configured (Pan-Africa)');
  }

  // M-Pesa (East Africa)
  if (env.MPESA_CONSUMER_KEY && env.MPESA_CONSUMER_SECRET && env.MPESA_SHORT_CODE && env.MPESA_PASS_KEY) {
    config.mpesa = {
      consumerKey: env.MPESA_CONSUMER_KEY,
      consumerSecret: env.MPESA_CONSUMER_SECRET,
      shortCode: env.MPESA_SHORT_CODE,
      passKey: env.MPESA_PASS_KEY,
      callbackUrl: env.MPESA_CALLBACK_URL || 'https://api.aivo.education/webhooks/mpesa',
      initiatorName: env.MPESA_INITIATOR_NAME,
      initiatorPassword: env.MPESA_INITIATOR_PASSWORD,
      securityCredential: env.MPESA_SECURITY_CREDENTIAL,
    };
    console.log('[Billing] M-Pesa gateway configured (East Africa)');
  }

  // PayU (Multi-region)
  if (env.PAYU_MERCHANT_KEY && env.PAYU_MERCHANT_SALT) {
    config.payu = {
      merchantKey: env.PAYU_MERCHANT_KEY,
      merchantSalt: env.PAYU_MERCHANT_SALT,
      merchantSaltV2: env.PAYU_MERCHANT_SALT_V2,
      merchantId: env.PAYU_MERCHANT_ID,
      region: (env.PAYU_REGION as 'india' | 'latam' | 'europe' | 'africa') || 'india',
    };
    console.log(`[Billing] PayU gateway configured (${env.PAYU_REGION || 'india'})`);
  }

  // Paytm (India)
  if (env.PAYTM_MERCHANT_ID && env.PAYTM_MERCHANT_KEY) {
    config.paytm = {
      merchantId: env.PAYTM_MERCHANT_ID,
      merchantKey: env.PAYTM_MERCHANT_KEY,
      website: env.PAYTM_WEBSITE || 'WEBSTAGING',
      industryType: env.PAYTM_INDUSTRY_TYPE || 'Ecommerce',
      channelId: env.PAYTM_CHANNEL_ID || 'WEB',
      callbackUrl: env.PAYTM_CALLBACK_URL || 'https://api.aivo.education/webhooks/paytm',
    };
    console.log('[Billing] Paytm gateway configured (India)');
  }

  // Set default gateway
  const defaultGateway = (env.DEFAULT_PAYMENT_GATEWAY ?? 'STRIPE') as PaymentGatewayType;
  config.defaultGateway = defaultGateway;

  // Initialize
  initializePaymentGateways(config);

  console.log(`[Billing] Payment gateways initialized. Default: ${defaultGateway}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// GATEWAY REGION MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get the recommended gateway for a country/currency combination
 */
export function getRecommendedGateway(country: string, currency: string): {
  gateway: PaymentGatewayType;
  localMethods: string[];
  notes?: string;
} {
  const countryUpper = country.toUpperCase();
  const currencyUpper = currency.toUpperCase();

  // West Africa - Paystack (primary) or Flutterwave
  if (['NG', 'GH', 'ZA'].includes(countryUpper)) {
    const methods: Record<string, string[]> = {
      NG: ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr'],
      GH: ['card', 'bank_transfer', 'mobile_money'],
      ZA: ['card', 'bank_transfer', 'eft'],
    };
    return {
      gateway: PaymentGatewayType.PAYSTACK,
      localMethods: methods[countryUpper] ?? ['card'],
      notes: 'Paystack provides best coverage for West African markets',
    };
  }

  // East Africa - M-Pesa (primary) or Flutterwave
  if (countryUpper === 'KE') {
    return {
      gateway: PaymentGatewayType.MPESA,
      localMethods: ['mpesa', 'card', 'bank_transfer'],
      notes: 'M-Pesa is dominant in Kenya for mobile payments',
    };
  }

  // East/Central Africa - Flutterwave
  if (['TZ', 'UG', 'RW', 'ZM', 'CI', 'SN', 'CM', 'BJ', 'TG', 'BF', 'ML', 'NE'].includes(countryUpper)) {
    return {
      gateway: PaymentGatewayType.FLUTTERWAVE,
      localMethods: ['mobile_money', 'card', 'bank_transfer'],
      notes: 'Flutterwave provides Pan-African coverage with mobile money support',
    };
  }

  // Francophone Africa by currency
  if (['XOF', 'XAF'].includes(currencyUpper)) {
    return {
      gateway: PaymentGatewayType.FLUTTERWAVE,
      localMethods: ['mobile_money', 'card', 'bank_transfer'],
      notes: 'Flutterwave supports CFA franc transactions across Francophone Africa',
    };
  }

  // India - Razorpay (primary), Paytm/PayU (secondary)
  if (countryUpper === 'IN' || currencyUpper === 'INR') {
    return {
      gateway: PaymentGatewayType.RAZORPAY,
      localMethods: ['card', 'upi', 'netbanking', 'wallet', 'emi'],
      notes: 'Razorpay optimized for Indian payment methods including UPI',
    };
  }

  // Latin America - Mercado Pago
  if (['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY', 'PA'].includes(countryUpper)) {
    const methods: Record<string, string[]> = {
      AR: ['card', 'bank_transfer', 'cash', 'wallet'],
      BR: ['card', 'pix', 'boleto', 'wallet'],
      CL: ['card', 'bank_transfer', 'cash'],
      CO: ['card', 'pse', 'cash', 'wallet'],
      MX: ['card', 'oxxo', 'bank_transfer', 'wallet'],
      PE: ['card', 'bank_transfer', 'cash'],
      UY: ['card', 'bank_transfer'],
      PA: ['card', 'bank_transfer'],
    };
    return {
      gateway: PaymentGatewayType.MERCADO_PAGO,
      localMethods: methods[countryUpper] ?? ['card'],
      notes: 'Mercado Pago provides regional payment methods for Latin America',
    };
  }

  // Eastern Europe - PayU
  if (['PL', 'CZ', 'RO', 'TR'].includes(countryUpper)) {
    const methods: Record<string, string[]> = {
      PL: ['card', 'bank_transfer', 'blik', 'installments'],
      CZ: ['card', 'bank_transfer'],
      RO: ['card', 'bank_transfer'],
      TR: ['card', 'bank_transfer'],
    };
    return {
      gateway: PaymentGatewayType.PAYU,
      localMethods: methods[countryUpper] ?? ['card', 'bank_transfer'],
      notes: 'PayU provides local payment methods for Eastern European markets',
    };
  }

  // Global - Stripe
  return {
    gateway: PaymentGatewayType.STRIPE,
    localMethods: ['card', 'bank_transfer'],
    notes: 'Stripe provides global coverage',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CURRENCY SUPPORT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a currency is supported by any gateway
 */
export function isCurrencySupported(currency: string): boolean {
  const supportedCurrencies = new Set([
    // Stripe currencies (Global)
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
    'NZD', 'SGD', 'HKD', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'AED', 'SAR',

    // Paystack currencies (Africa)
    'NGN', 'GHS', 'ZAR',

    // Flutterwave currencies (Pan-Africa)
    'KES', 'TZS', 'UGX', 'RWF', 'ZMW', 'XOF', 'XAF',

    // M-Pesa currencies (East Africa)
    // KES already listed above

    // Razorpay / Paytm / PayU currencies (India)
    'INR',

    // PayU currencies (Europe)
    'PLN', 'CZK', 'RON', 'TRY',

    // Mercado Pago currencies (Latin America)
    'ARS', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU',
  ]);

  return supportedCurrencies.has(currency.toUpperCase());
}

/**
 * Get the primary currency for a country
 */
export function getCountryCurrency(country: string): string | null {
  const currencyMap: Record<string, string> = {
    // Americas
    US: 'USD',
    CA: 'CAD',
    MX: 'MXN',
    BR: 'BRL',
    AR: 'ARS',
    CL: 'CLP',
    CO: 'COP',
    PE: 'PEN',
    UY: 'UYU',
    PA: 'USD',

    // Europe
    GB: 'GBP',
    DE: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    ES: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    AT: 'EUR',
    IE: 'EUR',
    PT: 'EUR',
    FI: 'EUR',
    CH: 'CHF',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    PL: 'PLN',
    CZ: 'CZK',
    RO: 'RON',
    TR: 'TRY',

    // Asia Pacific
    JP: 'JPY',
    AU: 'AUD',
    NZ: 'NZD',
    SG: 'SGD',
    HK: 'HKD',
    IN: 'INR',
    MY: 'MYR',
    TH: 'THB',
    PH: 'PHP',
    ID: 'IDR',
    VN: 'VND',

    // Middle East
    AE: 'AED',
    SA: 'SAR',
    EG: 'EGP',

    // Africa - West
    NG: 'NGN',
    GH: 'GHS',
    ZA: 'ZAR',

    // Africa - East
    KE: 'KES',
    TZ: 'TZS',
    UG: 'UGX',
    RW: 'RWF',
    ZM: 'ZMW',

    // Africa - Francophone
    CI: 'XOF',
    SN: 'XOF',
    CM: 'XAF',
    BJ: 'XOF',
    TG: 'XOF',
    BF: 'XOF',
    ML: 'XOF',
    NE: 'XOF',
  };

  return currencyMap[country.toUpperCase()] ?? null;
}
