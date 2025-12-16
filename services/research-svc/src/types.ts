/**
 * Research Service Types
 *
 * Type definitions and module augmentations for the research service.
 */

import '@fastify/jwt';

/**
 * User payload extracted from JWT token
 */
export interface JwtUser {
  sub: string;
  email: string;
  tenantId: string;
  role?: string;
  permissions?: string[];
}

/**
 * Augment Fastify's JWT module to include our user type
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

/**
 * Augment base Fastify module to include user property and jwtVerify
 */
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtUser;
    jwtVerify<T extends object = JwtUser>(): Promise<T>;
  }
}
