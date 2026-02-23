/**
 * SCIM 2.0 Module
 *
 * Provides automated user provisioning via SCIM protocol.
 */

export * from './scim.types.js';
export {
  getUser,
  listUsers,
  createUser,
  replaceUser,
  patchUser,
  deactivateUser,
  getGroup,
  listGroups,
  patchGroup,
  getServiceProviderConfig,
} from './scim-service.js';
export {
  generateToken,
  validateToken,
  revokeToken,
  listTokens,
} from './scim-token.service.js';
export { registerScimRoutes } from './routes.js';
