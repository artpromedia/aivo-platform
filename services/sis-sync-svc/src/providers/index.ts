/**
 * Provider Factory
 * 
 * Creates and initializes SIS providers based on type and configuration
 */

import { ClassLinkProvider } from './classlink.js';
import { CleverProvider } from './clever.js';
import { GoogleWorkspaceProvider } from './google-workspace.js';
import { InfiniteCampusClient, InfiniteCampusSyncService } from './infinite-campus/infinite-campus-provider.js';
import { MicrosoftEntraProvider } from './microsoft-entra.js';
import { OneRosterApiProvider } from './oneroster-api.js';
import { OneRosterCsvProvider } from './oneroster-csv.js';
import { PowerSchoolClient, PowerSchoolSyncService } from './powerschool/powerschool-provider.js';
import type {
  ISisProvider,
  ProviderConfig,
 SisProviderType } from './types.js';


export function createProvider(providerType: SisProviderType): ISisProvider {
  switch (providerType) {
    case 'CLEVER':
      return new CleverProvider() as ISisProvider;
    case 'CLASSLINK':
      return new ClassLinkProvider() as ISisProvider;
    case 'ONEROSTER_API':
      return new OneRosterApiProvider() as ISisProvider;
    case 'ONEROSTER_CSV':
      return new OneRosterCsvProvider() as ISisProvider;
    case 'GOOGLE_WORKSPACE':
      return new GoogleWorkspaceProvider() as ISisProvider;
    case 'MICROSOFT_ENTRA':
      return new MicrosoftEntraProvider() as ISisProvider;
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
  await provider.initialize(config as unknown);
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
export * from './types.js';
export { CleverProvider } from './clever.js';
export { ClassLinkProvider } from './classlink.js';
export { OneRosterApiProvider } from './oneroster-api.js';
export { OneRosterCsvProvider } from './oneroster-csv.js';
export { GoogleWorkspaceProvider, GoogleOAuthHelpers, GOOGLE_ROSTERING_SCOPES, GOOGLE_SSO_SCOPES } from './google-workspace.js';
export { MicrosoftEntraProvider, MicrosoftOAuthHelpers, MICROSOFT_ROSTERING_SCOPES, MICROSOFT_SSO_SCOPES } from './microsoft-entra.js';
export {
  PowerSchoolClient,
  PowerSchoolSyncService,
  PowerSchool,
  type PowerSchoolConfig,
  type PowerSchoolToken,
  type PowerSchoolSchool,
  type PowerSchoolStudent,
  type PowerSchoolStaff,
  type PowerSchoolSection,
  type PowerSchoolEnrollment,
  type PowerSchoolAddress,
  type SyncResult as PowerSchoolSyncResult,
  type FullSyncResult as PowerSchoolFullSyncResult,
} from './powerschool/powerschool-provider.js';
export {
  InfiniteCampusClient,
  InfiniteCampusSyncService,
  InfiniteCampus,
  type InfiniteCampusConfig,
  type InfiniteCampusAuth,
  type InfiniteCampusSchool,
  type InfiniteCampusStudent,
  type InfiniteCampusContact,
  type InfiniteCampusStaff,
  type InfiniteCampusCourse,
  type InfiniteCampusSection,
  type InfiniteCampusRoster,
  type InfiniteCampusTerm,
  type SyncResult as InfiniteCampusSyncResult,
  type FullSyncResult as InfiniteCampusFullSyncResult,
} from './infinite-campus/infinite-campus-provider.js';
