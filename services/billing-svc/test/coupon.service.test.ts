import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  coupon: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  $queryRaw: vi.fn(),
};

const mockStripe = {
  coupons: {
    create: vi.fn(),
    retrieve: vi.fn(),
    del: vi.fn(),
  },
  promotionCodes: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

describe('CouponService', () => {
  let CouponService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../src/services/coupon.service');
    CouponService = mod.CouponService || mod.default;
  });

  it('creates a coupon in Stripe and local DB', async () => {
    mockStripe.coupons.create.mockResolvedValue({ id: 'coupon_123' });
    mockStripe.promotionCodes.create.mockResolvedValue({ id: 'promo_123' });
    mockPrisma.$queryRaw.mockResolvedValue([{ id: 'local-1' }]);

    const service = new CouponService(mockPrisma, mockStripe);

    const result = await service.create({
      name: 'Launch Discount',
      percentOff: 20,
      duration: 'once',
      code: 'LAUNCH20',
    });
    expect(result).toBeDefined();
  });
});
