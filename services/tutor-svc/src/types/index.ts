import type { AuthContext } from '@aivo/ts-rbac';

/**
 * JwtUser is an alias for AuthContext from @aivo/ts-rbac.
 * Properties: userId, tenantId, roles.
 */
export type JwtUser = AuthContext;
