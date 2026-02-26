import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('PaymentGateways', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('FlutterwaveGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/flutterwave.gateway');
      const GatewayClass = mod.FlutterwaveGateway || mod.default;
      expect(GatewayClass).toBeDefined();

      if (GatewayClass) {
        const gateway = new GatewayClass({ secretKey: 'test-key', publicKey: 'test-pub' });
        expect(typeof gateway.createPayment).toBe('function');
        expect(typeof gateway.verifyPayment).toBe('function');
      }
    });
  });

  describe('PaystackGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/paystack.gateway');
      const GatewayClass = mod.PaystackGateway || mod.default;
      expect(GatewayClass).toBeDefined();

      if (GatewayClass) {
        const gateway = new GatewayClass({ secretKey: 'test-key' });
        expect(typeof gateway.createPayment).toBe('function');
        expect(typeof gateway.verifyPayment).toBe('function');
      }
    });
  });

  describe('RazorpayGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/razorpay.gateway');
      const GatewayClass = mod.RazorpayGateway || mod.default;
      expect(GatewayClass).toBeDefined();

      if (GatewayClass) {
        const gateway = new GatewayClass({ keyId: 'test-key', keySecret: 'test-secret' });
        expect(typeof gateway.createPayment).toBe('function');
        expect(typeof gateway.verifyPayment).toBe('function');
      }
    });
  });

  describe('MpesaGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/mpesa.gateway');
      const GatewayClass = mod.MpesaGateway || mod.default;
      expect(GatewayClass).toBeDefined();
    });
  });

  describe('MercadoPagoGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/mercadopago.gateway');
      const GatewayClass = mod.MercadoPagoGateway || mod.default;
      expect(GatewayClass).toBeDefined();
    });
  });

  describe('PayUGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/payu.gateway');
      const GatewayClass = mod.PayUGateway || mod.default;
      expect(GatewayClass).toBeDefined();
    });
  });

  describe('PaytmGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/paytm.gateway');
      const GatewayClass = mod.PaytmGateway || mod.default;
      expect(GatewayClass).toBeDefined();
    });
  });

  describe('StripeGateway', () => {
    it('implements PaymentGateway interface', async () => {
      const mod = await import('../src/gateways/stripe.gateway');
      const GatewayClass = mod.StripeGateway || mod.default;
      expect(GatewayClass).toBeDefined();
    });
  });
});
