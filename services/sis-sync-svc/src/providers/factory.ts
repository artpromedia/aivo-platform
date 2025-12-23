/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
/**
 * Provider Factory
 *
 * Factory for creating SIS provider instances based on configuration.
 * Handles provider initialization, caching, and lifecycle management.
 *
 * @author AIVO Platform Team
 */

import { PrismaClient, SisProviderType } from '@prisma/client';
import type { ISisProvider, SisProviderCredentials } from './types.js';
import { CleverProvider } from './clever.js';
import { ClassLinkProvider } from './classlink.js';
import { OneRosterApiProvider } from './oneroster-api.js';
import { OneRosterCsvProvider } from './oneroster-csv.js';
import { GoogleWorkspaceProvider } from './google-workspace.js';
import { MicrosoftEntraProvider } from './microsoft-entra.js';
import { EdFiProvider, type EdFiProviderConfig } from './edfi/edfi-provider.js';

/**
 * Provider configuration from database
 */
export interface ProviderConfig {
  id: string;
  tenantId: string;
  providerType: SisProviderType;
  name: string;
  configJson: string;
  enabled: boolean;
  secretsRef?: string | null;
}

/**
 * Cached provider instance
 */
interface CachedProvider {
  provider: ISisProvider;
  config: ProviderConfig;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Provider Factory
 *
 * Creates and manages SIS provider instances.
 */
export class ProviderFactory {
  private prisma: PrismaClient;
  private cache: Map<string, CachedProvider> = new Map();
  private secretsResolver: SecretsResolver;
  private cacheTtlMs: number;

  constructor(
    prisma: PrismaClient,
    secretsResolver: SecretsResolver,
    cacheTtlMs: number = 3600000 // 1 hour default
  ) {
    this.prisma = prisma;
    this.secretsResolver = secretsResolver;
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Get a provider instance by tenant and provider ID
   */
  async getProvider(
    tenantId: string,
    providerId: string
  ): Promise<ISisProvider | null> {
    const cacheKey = `${tenantId}:${providerId}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.provider;
    }

    // Load from database
    const providerConfig = await this.prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!providerConfig || providerConfig.tenantId !== tenantId) {
      return null;
    }

    if (!providerConfig.enabled) {
      console.warn('[ProviderFactory] Provider is disabled', { providerId });
      return null;
    }

    // Create provider instance
    const provider = await this.createProvider(providerConfig as unknown as ProviderConfig);

    // Cache the provider
    this.cache.set(cacheKey, {
      provider,
      config: providerConfig as unknown as ProviderConfig,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.cacheTtlMs),
    });

    return provider;
  }

  /**
   * Get all providers for a tenant
   */
  async getProvidersForTenant(tenantId: string): Promise<ISisProvider[]> {
    const providerConfigs = await this.prisma.sisProvider.findMany({
      where: { tenantId, enabled: true },
    });

    const providers: ISisProvider[] = [];

    for (const config of providerConfigs) {
      try {
        const provider = await this.getProvider(tenantId, config.id);
        if (provider) {
          providers.push(provider);
        }
      } catch (error) {
        console.error('[ProviderFactory] Failed to create provider', {
          providerId: config.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return providers;
  }

  /**
   * Create a provider instance based on type
   */
  private async createProvider(config: ProviderConfig): Promise<ISisProvider> {
    const parsedConfig = JSON.parse(config.configJson);
    
    // Resolve secrets
    let credentials: SisProviderCredentials = {};
    if (config.secretsRef) {
      credentials = await this.secretsResolver.resolve(config.secretsRef);
    }

    switch (config.providerType) {
      case 'CLEVER':
        return this.createCleverProvider(config, parsedConfig, credentials);
      
      case 'CLASSLINK':
        return this.createClassLinkProvider(config, parsedConfig, credentials);
      
      case 'ONEROSTER_API':
        return this.createOneRosterApiProvider(config, parsedConfig, credentials);
      
      case 'ONEROSTER_CSV':
        return this.createOneRosterCsvProvider(config, parsedConfig, credentials);
      
      case 'GOOGLE_WORKSPACE':
        return this.createGoogleWorkspaceProvider(config, parsedConfig, credentials);
      
      case 'MICROSOFT_ENTRA':
        return this.createMicrosoftEntraProvider(config, parsedConfig, credentials);
      
      case 'CUSTOM':
        // Check if it's Ed-Fi based on config
        if (parsedConfig.edfiVersion || parsedConfig.baseUrl?.includes('ed-fi')) {
          return this.createEdFiProvider(config, parsedConfig, credentials);
        }
        throw new Error(`Custom provider type requires specific configuration`);
      
      default:
        throw new Error(`Unsupported provider type: ${config.providerType}`);
    }
  }

  /**
   * Create Clever provider
   */
  private async createCleverProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const provider = new CleverProvider({
      districtId: parsedConfig.districtId,
      clientId: credentials.clientId || parsedConfig.clientId,
      clientSecret: credentials.clientSecret || '',
      accessToken: credentials.accessToken,
    });

    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Create ClassLink provider
   */
  private async createClassLinkProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const provider = new ClassLinkProvider({
      tenantId: parsedConfig.tenantId,
      clientId: credentials.clientId || parsedConfig.clientId,
      clientSecret: credentials.clientSecret || '',
      accessToken: credentials.accessToken,
    });

    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Create OneRoster API provider
   */
  private async createOneRosterApiProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const provider = new OneRosterApiProvider({
      baseUrl: parsedConfig.baseUrl,
      version: parsedConfig.version || '1.1',
      clientId: credentials.clientId || parsedConfig.clientId,
      clientSecret: credentials.clientSecret || '',
    });

    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Create OneRoster CSV provider
   */
  private async createOneRosterCsvProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const provider = new OneRosterCsvProvider({
      sftpHost: parsedConfig.sftpHost,
      sftpPort: parsedConfig.sftpPort || 22,
      sftpUsername: credentials.sftpUsername || parsedConfig.sftpUsername,
      sftpPassword: credentials.sftpPassword,
      sftpPrivateKey: credentials.sftpPrivateKey,
      remotePath: parsedConfig.remotePath || '/',
    });

    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Create Google Workspace provider
   */
  private async createGoogleWorkspaceProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const provider = new GoogleWorkspaceProvider({
      domain: parsedConfig.domain,
      customerId: parsedConfig.customerId,
      adminEmail: parsedConfig.adminEmail,
      serviceAccountKey: credentials.serviceAccountKey,
    });

    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Create Microsoft Entra provider
   */
  private async createMicrosoftEntraProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const provider = new MicrosoftEntraProvider({
      tenantId: parsedConfig.tenantId,
      domain: parsedConfig.domain,
      clientId: credentials.clientId || parsedConfig.clientId,
      clientSecret: credentials.clientSecret || '',
    });

    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Create Ed-Fi provider
   */
  private async createEdFiProvider(
    config: ProviderConfig,
    parsedConfig: any,
    credentials: SisProviderCredentials
  ): Promise<ISisProvider> {
    const edfiConfig: EdFiProviderConfig = {
      baseUrl: parsedConfig.baseUrl,
      apiVersion: parsedConfig.apiVersion || 'v5',
      dataStandardVersion: parsedConfig.dataStandardVersion || '5.0',
      clientId: credentials.clientId || parsedConfig.clientId,
      clientSecret: credentials.clientSecret || '',
      schoolYear: parsedConfig.schoolYear,
      schoolIds: parsedConfig.schoolIds,
      includeDeletes: parsedConfig.includeDeletes ?? true,
      pageSize: parsedConfig.pageSize || 500,
      rateLimitMs: parsedConfig.rateLimitMs || 100,
      tenantId: config.tenantId,
      providerId: config.id,
    };

    const provider = new EdFiProvider(edfiConfig);
    await provider.initialize(credentials);
    return provider;
  }

  /**
   * Invalidate cached provider
   */
  invalidateCache(tenantId: string, providerId: string): void {
    const cacheKey = `${tenantId}:${providerId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cached providers for a tenant
   */
  invalidateTenantCache(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached providers
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Interface for resolving secrets from a secure store
 */
export interface SecretsResolver {
  resolve(secretsRef: string): Promise<SisProviderCredentials>;
}

/**
 * Default secrets resolver that reads from environment variables
 * (for development only - use Vault/KMS in production)
 */
export class EnvSecretsResolver implements SecretsResolver {
  async resolve(secretsRef: string): Promise<SisProviderCredentials> {
    // Parse secretsRef format: "env:PREFIX" or "vault:path/to/secret"
    const [type, ref] = secretsRef.split(':');

    if (type === 'env') {
      return {
        clientId: process.env[`${ref}_CLIENT_ID`],
        clientSecret: process.env[`${ref}_CLIENT_SECRET`],
        accessToken: process.env[`${ref}_ACCESS_TOKEN`],
        refreshToken: process.env[`${ref}_REFRESH_TOKEN`],
        sftpUsername: process.env[`${ref}_SFTP_USERNAME`],
        sftpPassword: process.env[`${ref}_SFTP_PASSWORD`],
        sftpPrivateKey: process.env[`${ref}_SFTP_PRIVATE_KEY`],
        serviceAccountKey: process.env[`${ref}_SERVICE_ACCOUNT_KEY`],
      };
    }

    console.warn('[EnvSecretsResolver] Unknown secrets type', { type, ref });
    return {};
  }
}

/**
 * Vault-based secrets resolver (for production)
 */
export class VaultSecretsResolver implements SecretsResolver {
  private vaultUrl: string;
  private vaultToken: string;

  constructor(vaultUrl: string, vaultToken: string) {
    this.vaultUrl = vaultUrl;
    this.vaultToken = vaultToken;
  }

  async resolve(secretsRef: string): Promise<SisProviderCredentials> {
    const [type, path] = secretsRef.split(':');

    if (type !== 'vault') {
      console.warn('[VaultSecretsResolver] Unknown secrets type', { type });
      return {};
    }

    try {
      // Use dynamic import to avoid bundling Vault SDK
      const response = await fetch(`${this.vaultUrl}/v1/${path}`, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.data || data.data || {};
    } catch (error) {
      console.error('[VaultSecretsResolver] Failed to fetch secrets', error);
      throw error;
    }
  }
}
