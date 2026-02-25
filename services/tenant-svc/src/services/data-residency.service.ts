import type { FastifyReply, FastifyRequest } from 'fastify';

/* ------------------------------------------------------------------ */
/*  Region endpoint map                                               */
/* ------------------------------------------------------------------ */

export const VALID_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
] as const;

export type DataRegion = (typeof VALID_REGIONS)[number];

interface RegionEndpoints {
  api: string;
  db: string;
  storage: string;
}

const REGION_ENDPOINTS: Record<DataRegion, RegionEndpoints> = {
  'us-east-1': {
    api: 'https://api-us-east.aivolearning.com',
    db: 'postgresql://db-us-east.aivolearning.internal:5432/aivo',
    storage: 'https://storage-us-east.aivolearning.com',
  },
  'us-west-2': {
    api: 'https://api-us-west.aivolearning.com',
    db: 'postgresql://db-us-west.aivolearning.internal:5432/aivo',
    storage: 'https://storage-us-west.aivolearning.com',
  },
  'eu-west-1': {
    api: 'https://api-eu-west.aivolearning.com',
    db: 'postgresql://db-eu-west.aivolearning.internal:5432/aivo',
    storage: 'https://storage-eu-west.aivolearning.com',
  },
  'eu-central-1': {
    api: 'https://api-eu-central.aivolearning.com',
    db: 'postgresql://db-eu-central.aivolearning.internal:5432/aivo',
    storage: 'https://storage-eu-central.aivolearning.com',
  },
  'ap-southeast-1': {
    api: 'https://api-ap-southeast.aivolearning.com',
    db: 'postgresql://db-ap-southeast.aivolearning.internal:5432/aivo',
    storage: 'https://storage-ap-southeast.aivolearning.com',
  },
};

/* ------------------------------------------------------------------ */
/*  Region metadata (for UI)                                          */
/* ------------------------------------------------------------------ */

export interface RegionInfo {
  id: DataRegion;
  label: string;
  location: string;
  compliance: string[];
  defaultFor: string[];
}

export const REGION_INFO: RegionInfo[] = [
  {
    id: 'us-east-1',
    label: 'US East (Virginia)',
    location: 'Virginia, USA',
    compliance: ['FERPA', 'COPPA', 'SOC 2'],
    defaultFor: ['US', 'CA'],
  },
  {
    id: 'us-west-2',
    label: 'US West (Oregon)',
    location: 'Oregon, USA',
    compliance: ['FERPA', 'COPPA', 'SOC 2'],
    defaultFor: [],
  },
  {
    id: 'eu-west-1',
    label: 'EU West (Ireland)',
    location: 'Ireland, EU',
    compliance: ['GDPR', 'SOC 2'],
    defaultFor: ['GB', 'IE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI'],
  },
  {
    id: 'eu-central-1',
    label: 'EU Central (Frankfurt)',
    location: 'Frankfurt, Germany',
    compliance: ['GDPR', 'SOC 2'],
    defaultFor: ['DE', 'AT', 'CH', 'PL', 'CZ'],
  },
  {
    id: 'ap-southeast-1',
    label: 'Asia Pacific (Singapore)',
    location: 'Singapore',
    compliance: ['PDPA'],
    defaultFor: ['SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'IN', 'AU', 'NZ', 'JP', 'KR'],
  },
];

/* ------------------------------------------------------------------ */
/*  Residency resolution result                                       */
/* ------------------------------------------------------------------ */

export interface ResidencyResolution {
  region: DataRegion;
  apiEndpoint: string;
  dbEndpoint: string;
  storageEndpoint: string;
  /** Whether the current deployment node is in the tenant's region. */
  isLocal: boolean;
}

/* ------------------------------------------------------------------ */
/*  DataResidencyService                                              */
/* ------------------------------------------------------------------ */

interface TenantResidencyRecord {
  id: string;
  dataRegion: DataRegion;
  dataResidencyEnforced: boolean;
}

export class DataResidencyService {
  private readonly currentRegion: DataRegion;

  constructor(private readonly db: { tenant: { findUnique: (args: { where: { id: string } }) => Promise<TenantResidencyRecord | null> } }) {
    this.currentRegion = (process.env.DEPLOYMENT_REGION as DataRegion) ?? 'us-east-1';
  }

  /* ---------- helpers -------------------------------------------- */

  private async getTenant(tenantId: string): Promise<TenantResidencyRecord> {
    const tenant: TenantResidencyRecord | null = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (tenant === null) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    return tenant;
  }

  /* ---------- public API ----------------------------------------- */

  /**
   * Validate that a request is being served from the correct region.
   * Returns the appropriate API endpoint for the tenant's data region.
   */
  async resolveRegion(tenantId: string): Promise<ResidencyResolution> {
    const tenant = await this.getTenant(tenantId);
    const endpoints = REGION_ENDPOINTS[tenant.dataRegion];

    return {
      region: tenant.dataRegion,
      apiEndpoint: endpoints.api,
      dbEndpoint: endpoints.db,
      storageEndpoint: endpoints.storage,
      isLocal: this.currentRegion === tenant.dataRegion,
    };
  }

  /**
   * Middleware: Redirect request to correct region if needed.
   * Mount as a Fastify `preHandler` on routes that read or write PII.
   */
  async enforceResidency(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = (request as FastifyRequest & { tenantId?: string }).tenantId;
    if (!tenantId) return;

    const tenant = await this.getTenant(tenantId);
    const residency = await this.resolveRegion(tenantId);

    if (!residency.isLocal && tenant.dataResidencyEnforced) {
      const redirectUrl = `${residency.apiEndpoint}${request.url}`;
      reply.redirect(redirectUrl, 307);
    }
  }

  /**
   * Validate that a region code is one of the supported regions.
   */
  static isValidRegion(region: string): region is DataRegion {
    return (VALID_REGIONS as readonly string[]).includes(region);
  }

  /**
   * Suggest a default region for a country code (ISO 3166-1 alpha-2).
   */
  static suggestRegion(countryCode: string): DataRegion {
    const upper = countryCode.toUpperCase();
    const match: RegionInfo | undefined = REGION_INFO.find((r) => r.defaultFor.includes(upper));
    return match !== undefined ? match.id : 'us-east-1';
  }
}
