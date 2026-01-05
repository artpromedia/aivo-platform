/**
 * SCIM 2.0 Module
 *
 * Provides automated user provisioning via SCIM protocol.
 */

export * from './types';
export { ScimService, type UserRepository, type AivoUser, type ScimConfig } from './scim-service';
export { registerScimRoutes } from './routes';
