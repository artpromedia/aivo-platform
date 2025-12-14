/**
 * Provider Factory
 * 
 * Creates and initializes SIS providers based on type and configuration
 */

import { SisProviderType } from '@prisma/client';
import {
  ISisProvider,
  ProviderConfig,
} from './types';
import { CleverProvider } from './clever';
import { ClassLinkProvider } from './classlink';
import { OneRosterApiProvider } from './oneroster-api';
import { OneRosterCsvProvider } from './oneroster-csv';
import { GoogleWorkspaceProvider } from './google-workspace';
import { MicrosoftEntraProvider } from './microsoft-entra';

export function createProvider(providerType: SisProviderType): ISisProvider {
  switch (providerType) {
    case 'CLEVER':
      return new CleverProvider();
    case 'CLASSLINK':
      return new ClassLinkProvider();
    case 'ONEROSTER_API':
      return new OneRosterApiProvider();
    case 'ONEROSTER_CSV':
      return new OneRosterCsvProvider();
    case 'GOOGLE_WORKSPACE':
      return new GoogleWorkspaceProvider();
    case 'MICROSOFT_ENTRA':
      return new MicrosoftEntraProvider();
    case 'CUSTOM':
      throw new Error('Custom providers must be implemented separately');
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

export async function createAndInitializeProvider(
  providerType: SisProviderType,
  configJson: string
): Promise<ISisProvider> {
  const provider = createProvider(providerType);
  const config = JSON.parse(configJson) as ProviderConfig;
  await provider.initialize(config);
  return provider;
}

export function validateProviderConfig(
  providerType: SisProviderType,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (providerType) {
    case 'CLEVER':
      if (!config.clientId) errors.push('clientId is required');
      if (!config.clientSecret) errors.push('clientSecret is required');
      if (!config.districtId) errors.push('districtId is required');
      break;

    case 'CLASSLINK':
      if (!config.clientId) errors.push('clientId is required');
      if (!config.clientSecret) errors.push('clientSecret is required');
      if (!config.tenantId) errors.push('tenantId is required');
      break;

    case 'ONEROSTER_API':
      if (!config.baseUrl) errors.push('baseUrl is required');
      if (!config.clientId) errors.push('clientId is required');
      if (!config.clientSecret) errors.push('clientSecret is required');
      break;

    case 'ONEROSTER_CSV':
      if (!config.sftp) {
        errors.push('sftp configuration is required');
      } else {
        const sftp = config.sftp as Record<string, unknown>;
        if (!sftp.host) errors.push('sftp.host is required');
        if (!sftp.username) errors.push('sftp.username is required');
        if (!sftp.password && !sftp.privateKey && !sftp.privateKeyPath) {
          errors.push('sftp authentication (password or privateKey) is required');
        }
      }
      if (!config.remotePath) errors.push('remotePath is required');
      break;

    case 'GOOGLE_WORKSPACE':
      if (!config.domain) errors.push('domain is required');
      if (!config.customerId) errors.push('customerId is required (e.g., C01234567)');
      if (!config.clientId) errors.push('clientId is required');
      break;

    case 'MICROSOFT_ENTRA':
      if (!config.tenantId) errors.push('tenantId is required');
      if (!config.clientId) errors.push('clientId is required');
      break;

    case 'CUSTOM':
      // Custom providers have their own validation
      break;

    default:
      errors.push(`Unknown provider type: ${providerType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Re-export types
export * from './types';
export { CleverProvider } from './clever';
export { ClassLinkProvider } from './classlink';
export { OneRosterApiProvider } from './oneroster-api';
export { OneRosterCsvProvider } from './oneroster-csv';
export { GoogleWorkspaceProvider, GoogleOAuthHelpers, GOOGLE_ROSTERING_SCOPES, GOOGLE_SSO_SCOPES } from './google-workspace';
export { MicrosoftEntraProvider, MicrosoftOAuthHelpers, MICROSOFT_ROSTERING_SCOPES, MICROSOFT_SSO_SCOPES } from './microsoft-entra';
