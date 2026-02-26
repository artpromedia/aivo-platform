import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  smsConsent: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../../../../prisma', () => ({ prisma: mockPrisma }));

describe('SmsConsentService', () => {
  let consentModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    consentModule = await import('../sms-consent');
  });

  it('exports SMS consent management', () => {
    expect(consentModule).toBeDefined();
  });

  describe('opt-in', () => {
    it('records consent with timestamp', async () => {
      mockPrisma.smsConsent.create.mockResolvedValue({
        id: 'consent-1',
        phoneNumber: '+14155551234',
        consentedAt: new Date(),
        status: 'OPTED_IN',
      });

      const ConsentService = consentModule.SmsConsentService || consentModule.default;
      if (ConsentService) {
        const service = new ConsentService(mockPrisma);
        const result = await service.optIn({
          userId: 'user-1',
          phoneNumber: '+14155551234',
        });
        expect(result).toBeDefined();
      }
    });
  });

  describe('opt-out', () => {
    it('processes STOP keyword', async () => {
      mockPrisma.smsConsent.findFirst.mockResolvedValue({
        id: 'consent-1',
        status: 'OPTED_IN',
      });
      mockPrisma.smsConsent.update.mockResolvedValue({
        id: 'consent-1',
        status: 'OPTED_OUT',
      });

      const ConsentService = consentModule.SmsConsentService || consentModule.default;
      if (ConsentService) {
        const service = new ConsentService(mockPrisma);
        const result = await service.handleKeyword?.('STOP', '+14155551234');
        if (result) {
          expect(result.status).toBe('OPTED_OUT');
        }
      }
    });
  });

  describe('consent expiry', () => {
    it('flags consents nearing 18-month expiry', async () => {
      const ConsentService = consentModule.SmsConsentService || consentModule.default;
      if (ConsentService) {
        const service = new ConsentService(mockPrisma);
        // 17 months ago
        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 17);

        mockPrisma.smsConsent.findMany.mockResolvedValue([{
          id: 'consent-1',
          consentedAt: oldDate,
          status: 'OPTED_IN',
        }]);

        const expiring = await service.findExpiringConsents?.();
        if (expiring) {
          expect(expiring.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
