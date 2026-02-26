import { describe, it, expect, vi, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

vi.mock('../src/config.js', () => ({
  config: {
    gateways: {
      stripe: { secretKey: 'sk_test_xxx', webhookSecret: 'whsec_xxx' },
      paystack: { secretKey: 'sk_test_paystack', publicKey: 'pk_test_paystack' },
      razorpay: { keyId: 'rzp_test_xxx', keySecret: 'rzp_secret_xxx' },
      mercadopago: { accessToken: 'mp_test_xxx' },
      flutterwave: { secretKey: 'fl_test_xxx', publicKey: 'pk_fl_xxx' },
    },
  },
}));

// Mock individual gateways  
vi.mock('../src/gateways/stripe.gateway.js', () => ({
  StripeGateway: vi.fn().mockImplementation(() => ({
    type: 'STRIPE',
    supportedCountries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR'],
    supportedCurrencies: ['usd', 'eur', 'gbp', 'cad', 'aud'],
    supportsSubscriptions: true,
    createCustomer: vi.fn(),
  })),
}));

vi.mock('../src/gateways/paystack.gateway.js', () => ({
  PaystackGateway: vi.fn().mockImplementation(() => ({
    type: 'PAYSTACK',
    supportedCountries: ['NG', 'GH', 'ZA', 'KE'],
    supportedCurrencies: ['ngn', 'ghs', 'zar', 'kes'],
    supportsSubscriptions: true,
    createCustomer: vi.fn(),
  })),
}));

vi.mock('../src/gateways/razorpay.gateway.js', () => ({
  RazorpayGateway: vi.fn().mockImplementation(() => ({
    type: 'RAZORPAY',
    supportedCountries: ['IN'],
    supportedCurrencies: ['inr'],
    supportsSubscriptions: true,
    createCustomer: vi.fn(),
  })),
}));

vi.mock('../src/gateways/mercadopago.gateway.js', () => ({
  MercadoPagoGateway: vi.fn().mockImplementation(() => ({
    type: 'MERCADO_PAGO',
    supportedCountries: ['BR', 'MX', 'AR', 'CO', 'CL'],
    supportedCurrencies: ['brl', 'mxn', 'ars', 'cop', 'clp'],
    supportsSubscriptions: false,
    createCustomer: vi.fn(),
  })),
}));

vi.mock('../src/gateways/flutterwave.gateway.js', () => ({
  FlutterwaveGateway: vi.fn().mockImplementation(() => ({
    type: 'FLUTTERWAVE',
    supportedCountries: ['KE', 'UG', 'TZ', 'RW'],
    supportedCurrencies: ['kes', 'ugx', 'tzs', 'rwf'],
    supportsSubscriptions: false,
    createCustomer: vi.fn(),
  })),
}));

// ── SUT ────────────────────────────────────────────────────────────────────

import { PaymentGatewayFactory } from '../src/gateways/gateway.factory.js';

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('PaymentGatewayFactory', () => {
  let factory: PaymentGatewayFactory;

  beforeEach(() => {
    factory = new PaymentGatewayFactory();
  });

  // ── Country → gateway routing ─────────────────────────────────────────

  describe('getGateway (country routing)', () => {
    it('should route Nigeria to Paystack', () => {
      const gw = factory.getGateway({ country: 'NG' });
      expect(gw.type).toBe('PAYSTACK');
    });

    it('should route India to Razorpay', () => {
      const gw = factory.getGateway({ country: 'IN' });
      expect(gw.type).toBe('RAZORPAY');
    });

    it('should route US to Stripe', () => {
      const gw = factory.getGateway({ country: 'US' });
      expect(gw.type).toBe('STRIPE');
    });

    it('should route Brazil to Mercado Pago', () => {
      const gw = factory.getGateway({ country: 'BR' });
      expect(gw.type).toBe('MERCADO_PAGO');
    });

    it('should route Kenya to Flutterwave', () => {
      const gw = factory.getGateway({ country: 'KE' });
      expect(gw.type).toBe('FLUTTERWAVE');
    });

    it('should fallback to Stripe for unknown countries', () => {
      const gw = factory.getGateway({ country: 'XX' });
      expect(gw.type).toBe('STRIPE');
    });
  });

  // ── Currency fallback ─────────────────────────────────────────────────

  describe('getGateway (currency fallback)', () => {
    it('should route NGN to Paystack even without country', () => {
      const gw = factory.getGateway({ currency: 'ngn' });
      expect(gw.type).toBe('PAYSTACK');
    });

    it('should route INR to Razorpay', () => {
      const gw = factory.getGateway({ currency: 'inr' });
      expect(gw.type).toBe('RAZORPAY');
    });

    it('should route BRL to Mercado Pago', () => {
      const gw = factory.getGateway({ currency: 'brl' });
      expect(gw.type).toBe('MERCADO_PAGO');
    });
  });

  // ── Preferred gateway ─────────────────────────────────────────────────

  describe('getGateway (preferred)', () => {
    it('should honour explicit preferredGateway', () => {
      const gw = factory.getGateway({ preferredGateway: 'STRIPE' });
      expect(gw.type).toBe('STRIPE');
    });
  });

  // ── Subscriptions filter ──────────────────────────────────────────────

  describe('getGateway (requireSubscriptions)', () => {
    it('should skip gateways without subscription support', () => {
      // Kenya normally routes to Flutterwave, which doesn't support subs —
      // should fall back to Stripe or another gateway that does.
      const gw = factory.getGateway({ country: 'KE', requireSubscriptions: true });
      expect(gw.supportsSubscriptions).toBe(true);
    });
  });

  // ── getGatewayByType ──────────────────────────────────────────────────

  describe('getGatewayByType', () => {
    it('should return gateway by type string', () => {
      const gw = factory.getGatewayByType('STRIPE');
      expect(gw.type).toBe('STRIPE');
    });

    it('should throw for unsupported type', () => {
      expect(() => factory.getGatewayByType('NONEXISTENT' as any)).toThrow();
    });
  });

  // ── Available gateways ────────────────────────────────────────────────

  describe('getAvailableGateways', () => {
    it('should return all initialised gateways', () => {
      const gateways = factory.getAvailableGateways();
      expect(gateways.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── getSupportedCountries ─────────────────────────────────────────────

  describe('getSupportedCountries', () => {
    it('should list countries for a gateway type', () => {
      const countries = factory.getSupportedCountries('PAYSTACK');
      expect(countries).toContain('NG');
      expect(countries).toContain('GH');
    });
  });

  // ── getRecommendedGatewayType ─────────────────────────────────────────

  describe('getRecommendedGatewayType', () => {
    it('should recommend PAYSTACK for NG', () => {
      expect(factory.getRecommendedGatewayType('NG')).toBe('PAYSTACK');
    });

    it('should recommend STRIPE for US', () => {
      expect(factory.getRecommendedGatewayType('US')).toBe('STRIPE');
    });

    it('should recommend RAZORPAY for IN', () => {
      expect(factory.getRecommendedGatewayType('IN')).toBe('RAZORPAY');
    });
  });

  // ── getAllSupportedCountries ───────────────────────────────────────────

  describe('getAllSupportedCountries', () => {
    it('should return a non-empty list of all countries', () => {
      const countries = factory.getAllSupportedCountries();
      expect(countries.length).toBeGreaterThan(0);
      expect(countries).toContain('US');
      expect(countries).toContain('NG');
      expect(countries).toContain('IN');
    });
  });

  // ── hasRegionalGateway ────────────────────────────────────────────────

  describe('hasRegionalGateway', () => {
    it('should return true for countries with regional gateways', () => {
      expect(factory.hasRegionalGateway('NG')).toBe(true);
      expect(factory.hasRegionalGateway('IN')).toBe(true);
    });

    it('should return false for countries without regional gateway', () => {
      expect(factory.hasRegionalGateway('XX')).toBe(false);
    });
  });
});
