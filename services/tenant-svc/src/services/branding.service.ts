/**
 * Branding Service
 *
 * Manages per-tenant white-label branding configuration including
 * logos, colors, fonts, and login customization.
 *
 * @module services/branding.service
 */

import type { Redis as RedisType } from 'ioredis';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

/** Public branding response shape (sent to browsers) */
export interface PublicBranding {
  displayName: string;
  logoUrl: string;
  logoSmallUrl: string;
  faviconUrl: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  fontFamily: string;
  borderRadius: string;
  login: {
    backgroundImage?: string;
    message?: string;
  };
  links: {
    supportEmail?: string;
    supportUrl?: string;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };
}

export interface UpdateBrandingInput {
  displayName?: string;
  logoUrl?: string;
  logoSmallUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  primaryColorLight?: string;
  primaryColorDark?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  textMutedColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  loginBackground?: string;
  loginMessage?: string;
  supportEmail?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════════════════

const BRANDING_CACHE_PREFIX = 'tenant:branding:';
const BRANDING_DOMAIN_CACHE_PREFIX = 'tenant:branding:domain:';
const BRANDING_CACHE_TTL = 300; // 5 min

const DEFAULT_BRANDING: PublicBranding = {
  displayName: 'Aivo Learning',
  logoUrl: '/images/logo.svg',
  logoSmallUrl: '/images/logo-sm.svg',
  faviconUrl: '/favicon.ico',
  colors: {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#EC4899',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    textMuted: '#64748B',
  },
  fontFamily: 'Inter',
  borderRadius: '0.5rem',
  login: {},
  links: {},
};

// ══════════════════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
export class BrandingService {
  constructor(private readonly redis?: RedisType | null) {}

  // ────────────────────── Get Branding ──────────────────────

  /**
   * Get branding for a tenant. Returns defaults if not configured.
   */
  async getBranding(tenantId: string): Promise<PublicBranding> {
    // Try cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`${BRANDING_CACHE_PREFIX}${tenantId}`);
        if (cached) return JSON.parse(cached) as PublicBranding;
      } catch { /* ignore */ }
    }

    const branding = await prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    // Also get tenant name as fallback displayName
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const result = branding ? this.toPublicBranding(branding, tenant?.name) : DEFAULT_BRANDING;

    await this.cacheSet(`${BRANDING_CACHE_PREFIX}${tenantId}`, result);
    return result;
  }

  // ────────────────────── Get by Domain ──────────────────────

  /**
   * Get branding for a domain (public, no auth).
   * Resolves domain → tenant → branding, fully cached.
   */
  async getBrandingByDomain(domain: string): Promise<PublicBranding> {
    const normalized = domain.toLowerCase();
    const cacheKey = `${BRANDING_DOMAIN_CACHE_PREFIX}${normalized}`;

    // Try cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached) as PublicBranding;
      } catch { /* ignore */ }
    }

    // Resolve domain → tenant
    let tenantId: string | null = null;

    // Check custom domains first
    const customDomain = await prisma.tenantCustomDomain.findFirst({
      where: { domain: normalized, status: 'VERIFIED' },
      select: { tenantId: true },
    });
    if (customDomain) {
      tenantId = customDomain.tenantId;
    }

    // Check subdomain
    if (!tenantId) {
      const subdomain = normalized.replace('.aivolearning.com', '');
      if (subdomain !== normalized) {
        const tenant = await prisma.tenant.findFirst({
          where: { subdomain },
          select: { id: true },
        });
        if (tenant) tenantId = tenant.id;
      }
    }

    if (!tenantId) {
      await this.cacheSet(cacheKey, DEFAULT_BRANDING);
      return DEFAULT_BRANDING;
    }

    const result = await this.getBranding(tenantId);
    await this.cacheSet(cacheKey, result);
    return result;
  }

  // ────────────────────── Update Branding ──────────────────────

  async updateBranding(tenantId: string, input: UpdateBrandingInput): Promise<PublicBranding> {
    const existing = await prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    const data = {
      displayName: input.displayName ?? existing?.displayName,
      logoUrl: input.logoUrl ?? existing?.logoUrl,
      logoSmallUrl: input.logoSmallUrl ?? existing?.logoSmallUrl,
      faviconUrl: input.faviconUrl ?? existing?.faviconUrl,
      primaryColor: input.primaryColor ?? existing?.primaryColor ?? '#6366F1',
      primaryColorLight: input.primaryColorLight ?? existing?.primaryColorLight ?? '#818CF8',
      primaryColorDark: input.primaryColorDark ?? existing?.primaryColorDark ?? '#4F46E5',
      secondaryColor: input.secondaryColor ?? existing?.secondaryColor ?? '#EC4899',
      accentColor: input.accentColor ?? existing?.accentColor ?? '#F59E0B',
      backgroundColor: input.backgroundColor ?? existing?.backgroundColor ?? '#FFFFFF',
      surfaceColor: input.surfaceColor ?? existing?.surfaceColor ?? '#F8FAFC',
      textColor: input.textColor ?? existing?.textColor ?? '#0F172A',
      textMutedColor: input.textMutedColor ?? existing?.textMutedColor ?? '#64748B',
      fontFamily: input.fontFamily ?? existing?.fontFamily ?? 'Inter',
      borderRadius: input.borderRadius ?? existing?.borderRadius ?? '0.5rem',
      loginBackground: input.loginBackground ?? existing?.loginBackground,
      loginMessage: input.loginMessage ?? existing?.loginMessage,
      supportEmail: input.supportEmail ?? existing?.supportEmail,
      supportUrl: input.supportUrl ?? existing?.supportUrl,
      privacyPolicyUrl: input.privacyPolicyUrl ?? existing?.privacyPolicyUrl,
      termsOfServiceUrl: input.termsOfServiceUrl ?? existing?.termsOfServiceUrl,
    };

    const branding = existing
      ? await prisma.tenantBranding.update({ where: { tenantId }, data })
      : await prisma.tenantBranding.create({ data: { ...data, tenantId } });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const result = this.toPublicBranding(branding, tenant?.name);

    // Invalidate caches
    await this.invalidateCache(tenantId);

    return result;
  }

  // ────────────────────── Get Raw Record ──────────────────────

  async getRawBranding(tenantId: string) {
    return prisma.tenantBranding.findUnique({ where: { tenantId } });
  }

  // ────────────────────── Helpers ──────────────────────

  private toPublicBranding(
    b: {
      displayName?: string | null;
      logoUrl?: string | null;
      logoSmallUrl?: string | null;
      faviconUrl?: string | null;
      primaryColor: string;
      primaryColorLight: string;
      primaryColorDark: string;
      secondaryColor: string;
      accentColor: string;
      backgroundColor: string;
      surfaceColor: string;
      textColor: string;
      textMutedColor: string;
      fontFamily: string;
      borderRadius: string;
      loginBackground?: string | null;
      loginMessage?: string | null;
      supportEmail?: string | null;
      supportUrl?: string | null;
      privacyPolicyUrl?: string | null;
      termsOfServiceUrl?: string | null;
    },
    tenantName?: string | null,
  ): PublicBranding {
    return {
      displayName: b.displayName ?? tenantName ?? DEFAULT_BRANDING.displayName,
      logoUrl: b.logoUrl ?? DEFAULT_BRANDING.logoUrl,
      logoSmallUrl: b.logoSmallUrl ?? DEFAULT_BRANDING.logoSmallUrl,
      faviconUrl: b.faviconUrl ?? DEFAULT_BRANDING.faviconUrl,
      colors: {
        primary: b.primaryColor,
        primaryLight: b.primaryColorLight,
        primaryDark: b.primaryColorDark,
        secondary: b.secondaryColor,
        accent: b.accentColor,
        background: b.backgroundColor,
        surface: b.surfaceColor,
        text: b.textColor,
        textMuted: b.textMutedColor,
      },
      fontFamily: b.fontFamily,
      borderRadius: b.borderRadius,
      login: {
        backgroundImage: b.loginBackground ?? undefined,
        message: b.loginMessage ?? undefined,
      },
      links: {
        supportEmail: b.supportEmail ?? undefined,
        supportUrl: b.supportUrl ?? undefined,
        privacyPolicyUrl: b.privacyPolicyUrl ?? undefined,
        termsOfServiceUrl: b.termsOfServiceUrl ?? undefined,
      },
    };
  }

  private async cacheSet(key: string, value: unknown): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', BRANDING_CACHE_TTL);
    } catch { /* ignore */ }
  }

  async invalidateCache(tenantId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`${BRANDING_CACHE_PREFIX}${tenantId}`);
      // Invalidate all domain caches for this tenant
      const domains = await prisma.tenantCustomDomain.findMany({
        where: { tenantId },
        select: { domain: true },
      });
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true },
      });
      const pipeline = this.redis.pipeline();
      for (const d of domains) {
        pipeline.del(`${BRANDING_DOMAIN_CACHE_PREFIX}${d.domain}`);
      }
      if (tenant?.subdomain) {
        pipeline.del(`${BRANDING_DOMAIN_CACHE_PREFIX}${tenant.subdomain}.aivolearning.com`);
      }
      await pipeline.exec();
    } catch { /* ignore */ }
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
